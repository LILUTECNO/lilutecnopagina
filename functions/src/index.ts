import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import {
  calcularPreciosAutomaticos,
  calcularRentabilidad,
  DEFAULT_CONFIG_MARGENES,
  normalizarConfig,
  validarMargenMinimo,
  type ConfigMargenesGlobal,
} from './margenes.js';

initializeApp();
const db = getFirestore();

/**
 * Runtime + Eventarc identity: default Compute SA was deleted.
 * Triggers and HTTPS functions run as firebase-adminsdk-fbsvc (custom SA workaround).
 */
const SERVICE_ACCOUNT = 'firebase-adminsdk-fbsvc@lilutecno-pagina-web.iam.gserviceaccount.com';

setGlobalOptions({
  region: 'us-central1',
  serviceAccount: SERVICE_ACCOUNT,
});

/** Stable Firestore doc id for a category label (matches admin UI name field). */
function categoryDocId(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128) || 'UNCATEGORIZED';
}

type CartLine = { id: string; quantity: number };

// ------------------------------------------------------------
// Configuración de márgenes y tarifas (valores por defecto del manual).
// Pueden sobre-escribirse en settings/priceMargins en Firestore.
// ------------------------------------------------------------
const DEFAULT_DROPSHIPPER_COMMISSION_RATE = 0.15; // 15% del precio final para Laura
const DEFAULT_PROVIDER_WHOLESALE_MARKUP = 0; // proveedor sube su precio de costo, admin aplica margen público
const DEFAULT_SHIPPING_CUSTOMER = 15900; // lo que paga el cliente
const DEFAULT_SHIPPING_REAL = 10500; // costo real negociado
const DEFAULT_WHOLESALE_COMMISSION_RATE = 0.10; // 10% al proveedor en pedidos surtido

function computeFinancialSnapshot({
  subtotal,
  shippingCost,
  dropshipperId,
  isWholesale,
  dropshipperCommissionRate,
}: {
  subtotal: number;
  shippingCost: number;
  dropshipperId?: string | null;
  isWholesale: boolean;
  dropshipperCommissionRate: number;
}) {
  // Margen logístico: cobro al cliente - costo real
  const logisticsCost = Math.max(0, shippingCost - DEFAULT_SHIPPING_REAL);
  const dropshipperCommission =
    dropshipperId && !isWholesale
      ? Math.round(subtotal * (dropshipperCommissionRate || DEFAULT_DROPSHIPPER_COMMISSION_RATE))
      : 0;
  // En surtido mayorista, comisión al proveedor es reversa: se le descuenta del pago.
  const wholesaleCommission = isWholesale
    ? Math.round(subtotal * DEFAULT_WHOLESALE_COMMISSION_RATE)
    : 0;
  const platformMargin = subtotal - dropshipperCommission - wholesaleCommission;
  return {
    dropshipperCommission,
    logisticsCost,
    platformMargin,
    commissionRate: isWholesale ? DEFAULT_WHOLESALE_COMMISSION_RATE : (dropshipperCommissionRate || DEFAULT_DROPSHIPPER_COMMISSION_RATE),
    wholesaleCommission,
    shippingReal: DEFAULT_SHIPPING_REAL,
  };
}

// The browser sends only product ids and quantities. Prices and availability are always recalculated here.
export const createCheckoutOrder = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión para comprar.');
  const { items, customer, shippingOption, coupon, dropshipperRef } = request.data as {
    items: CartLine[];
    customer: Record<string, string>;
    shippingOption: 'BOGOTA' | 'OTHER';
    coupon?: string;
    dropshipperRef?: string; // link personal del vendedor (tuapp.com/:slug)
  };
  if (!Array.isArray(items) || !items.length || !customer?.name || !customer?.email || !shippingOption) {
    throw new HttpsError('invalid-argument', 'Información de compra incompleta.');
  }

  // Si llega dropshipperRef (link personal), verificar que sea un dropshipper aprobado.
  let dropshipperId: string | null = null;
  let dropshipperName: string | null = null;
  if (dropshipperRef) {
    const dsSnap = await db.collection('users').where('role', '==', 'dropshipper').where('status', '==', 'approved').where('storeName', '==', dropshipperRef).limit(1).get();
    if (!dsSnap.empty) {
      dropshipperId = dsSnap.docs[0].id;
      dropshipperName = String(dsSnap.docs[0].data().name || dsSnap.docs[0].data().storeName || 'Vendedor');
    }
  }

  const orderRef = db.collection('orders').doc();
  const normalizedCoupon = String(coupon || '').trim().toUpperCase();
  const [shippingSettings, couponsSnapshot, marginsSnap] = await Promise.all([
    db.collection('settings').doc('shipping').get(),
    normalizedCoupon
      ? db.collection('coupons').where('code', '==', normalizedCoupon).where('active', '==', true).limit(1).get()
      : Promise.resolve(null),
    db.collection('settings').doc('priceMargins').get(),
  ]);
  const configuredShipping = shippingSettings.exists ? shippingSettings.data() || {} : {}
    ;
  const approvedCoupon = couponsSnapshot && !couponsSnapshot.empty ? couponsSnapshot.docs[0].data() : null;
  const dropshipperCommissionRate = marginsSnap.exists ? Number(marginsSnap.data()?.dropshipperDiscount) / 100 || DEFAULT_DROPSHIPPER_COMMISSION_RATE : DEFAULT_DROPSHIPPER_COMMISSION_RATE;
  const result = await db.runTransaction(async (transaction) => {
    let subtotal = 0;
    const safeItems: Array<Record<string, unknown>> = [];
    for (const line of items) {
      if (!line?.id || !Number.isInteger(line.quantity) || line.quantity < 1) {
        throw new HttpsError('invalid-argument', 'Cantidad inválida.');
      }
      const productRef = db.collection('products').doc(line.id);
      const productSnapshot = await transaction.get(productRef);
      if (!productSnapshot.exists) throw new HttpsError('not-found', 'Un producto ya no está disponible.');
      const product = productSnapshot.data()!;
      // Fuente de verdad v3: precio_cliente_final si existe, fallback a price (legacy).
      const unitPrice = Number.isFinite(product.precio_cliente_final)
        ? Number(product.precio_cliente_final)
        : Number(product.price);
      if (!Number.isFinite(unitPrice) || product.stock < line.quantity) {
        throw new HttpsError('failed-precondition', `${product.name || 'Producto'} no tiene stock suficiente.`);
      }
      subtotal += unitPrice * line.quantity;
      safeItems.push({
        id: productRef.id,
        name: product.name,
        quantity: line.quantity,
        price: unitPrice,
        providerId: product.providerId || null,
      });
    }
    const baseShipping =
      shippingOption === 'BOGOTA'
        ? Number(configuredShipping.bogota) || 10000
        : Number(configuredShipping.other) || 15000;
    const shippingCost = approvedCoupon?.type === 'shipping' ? 0 : baseShipping;
    const discount =
      approvedCoupon?.type === 'percent'
        ? Math.round(subtotal * Math.min(100, Math.max(0, Number(approvedCoupon.value) || 0)) / 100)
        : 0;
    const total = Math.max(0, subtotal - discount + shippingCost);
    const snapshot = computeFinancialSnapshot({
      subtotal: subtotal - discount,
      shippingCost,
      dropshipperId,
      isWholesale: false,
      dropshipperCommissionRate,
    });
    transaction.set(orderRef, {
      userId: request.auth!.uid,
      type: dropshipperId ? 'dropshipping' : 'direct',
      dropshipperId,
      dropshipperName,
      customer,
      items: safeItems,
      subtotal,
      shippingCost,
      shippingOption,
      discount,
      coupon: approvedCoupon ? normalizedCoupon : null,
      total,
      currency: 'COP',
      status: 'pending_payment',
      paymentStatus: 'pending',
      dropshipperCommission: snapshot.dropshipperCommission,
      logisticsCost: snapshot.logisticsCost,
      platformMargin: snapshot.platformMargin,
      commissionRate: snapshot.commissionRate,
      shippingReal: snapshot.shippingReal,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { orderId: orderRef.id, amountInCents: total * 100 };
  });
  return result;
});

/** Seller order intake: prices are always recalculated from the product record.
 * Modos:
 *  - 'dropshipping':Laura conecta un pedido desde su catálogo (precio = vendorPrice o descuento por volumen)
 *  - 'surtido':     Don Carlos compra para su tienda física (precio = vendorPrice por volumen)
 */
export const createVendorOrder = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  const { productId, quantity, customer, mode } = request.data as {
    productId: string;
    quantity: number;
    customer: Record<string, string>;
    mode?: 'dropshipping' | 'surtido';
  };
  if (
    !productId ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    !customer?.name ||
    !customer?.phone ||
    !customer?.address ||
    !customer?.city
  ) {
    throw new HttpsError('invalid-argument', 'Información del pedido incompleta.');
  }
  const orderType = mode === 'surtido' ? 'surtido' : 'dropshipping';
  const user = await db.collection('users').doc(request.auth.uid).get();
  const userRole = user.data()?.role;
  if (orderType === 'dropshipping' && userRole !== 'dropshipper') {
    throw new HttpsError('permission-denied', 'Esta operación es exclusiva para vendedores.');
  }
  // En surtido, tanto dropshipper como cliente tipo tienda pueden comprar; aquí el vendedor compra.
  if (orderType === 'surtido' && userRole !== 'dropshipper' && userRole !== 'cliente') {
    throw new HttpsError('permission-denied', 'Solo vendedores o tiendas pueden hacer pedidos surtidos.');
  }
  const productRef = db.collection('products').doc(productId);
  const product = await productRef.get();
  if (!product.exists || product.data()!.stock < quantity) {
    throw new HttpsError('failed-precondition', 'El producto no tiene inventario suficiente.');
  }
  const dataProduct = product.data()!;
  // --- Niveles de precio v3 ---
  // En surtido: usar precio_surtir_r1/r2/r3 según cantidad cuando existan, sino fallback a vendorPrice legacy.
  // En dropshipping: precio_dropshipper es el precio que el vendedor paga a la plataforma (no el cliente final).
  function precioSurtirPorQty(q: number): number | null {
    if (Number.isFinite(Number(dataProduct.precio_surtir_r1)) && q <= 5) return Number(dataProduct.precio_surtir_r1);
    if (Number.isFinite(Number(dataProduct.precio_surtir_r2)) && q <= 20) return Number(dataProduct.precio_surtir_r2);
    if (Number.isFinite(Number(dataProduct.precio_surtir_r3)) && q >= 21) return Number(dataProduct.precio_surtir_r3);
    return null;
  }
  const volumeDiscountLegacy = quantity >= 24 ? 0.27 : quantity >= 12 ? 0.22 : quantity >= 6 ? 0.18 : 0.15;
  let unitCost: number;
  let providerCost: number;
  if (orderType === 'surtido') {
    const nuevoSurtir = precioSurtirPorQty(quantity);
    unitCost = nuevoSurtir !== null
      ? nuevoSurtir
      : (Number.isFinite(Number(dataProduct.vendorPrice))
          ? Number(dataProduct.vendorPrice)
          : Math.round(Number(dataProduct.price) * (1 - volumeDiscountLegacy)));
    providerCost = unitCost * quantity;
  } else {
    // Dropshipping: el vendedor le cobra al cliente final con precio_cliente_final,
    // pero a la plataforma le paga precio_dropshipper.
    unitCost = Number.isFinite(Number(dataProduct.precio_dropshipper))
      ? Number(dataProduct.precio_dropshipper)
      : (Number.isFinite(Number(dataProduct.vendorPrice))
          ? Number(dataProduct.vendorPrice)
          : Math.round(Number(dataProduct.price) * (1 - volumeDiscountLegacy)));
    providerCost = unitCost * quantity;
  }
  const volumeDiscount = volumeDiscountLegacy;
  const marginsSnap = await db.collection('settings').doc('priceMargins').get();
  const dropshipperCommissionRate = marginsSnap.exists ? Number(marginsSnap.data()?.dropshipperDiscount) / 100 || DEFAULT_DROPSHIPPER_COMMISSION_RATE : DEFAULT_DROPSHIPPER_COMMISSION_RATE;
  // En dropshipping, el vendedor NUNCA nos paga la orden: el cliente final paga vía Wompi.
  // Pero el sistema crea el enlace para que el vendedor lo comparta.
  // Aquí el "total" representa el costo unit * qty (lo que el cliente final debe pagar a la plataforma).
  const total = unitCost * quantity;
  const snapshot = computeFinancialSnapshot({
    subtotal: total,
    shippingCost: 0,
    dropshipperId: request.auth.uid,
    isWholesale: orderType === 'surtido',
    dropshipperCommissionRate,
  });
  const orderRef = await db.collection('orders').add({
    userId: request.auth.uid,
    type: orderType,
    dropshipperId: request.auth.uid,
    dropshipperName: user.data()?.name || 'Vendedor',
    providerId: dataProduct.providerId || null,
    customer,
    customerDetails: customer,
    items: [
      {
        id: product.id,
        name: dataProduct.name,
        quantity,
        price: unitCost,
        providerId: dataProduct.providerId || null,
      },
    ],
    total,
    volumeDiscount,
    status: orderType === 'surtido' ? 'pending_payment' : 'pending_provider',
    paymentStatus: 'pending',
    dropshipperCommission: snapshot.dropshipperCommission,
    logisticsCost: snapshot.logisticsCost,
    platformMargin: snapshot.platformMargin,
    commissionRate: snapshot.commissionRate,
    wholesaleCommission: snapshot.wholesaleCommission,
    providerCost,
    shippingReal: snapshot.shippingReal,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { orderId: orderRef.id, total, amountInCents: total * 100 };
});

// Configure Wompi with this public HTTPS endpoint. It independently verifies every event with Wompi.
// Secrets come from functions/.env (dotenv) — never from functions.config() (deprecated).
// Required: WOMPI_PRIVATE_KEY  Optional: WOMPI_EVENTS_SECRET
export const wompiWebhook = onRequest(async (request, response) => {
  try {
    // Prefer dotenv / deployed env vars (2nd gen). No functions.config() fallback.
    const wompiKey = process.env.WOMPI_PRIVATE_KEY;
    if (!wompiKey) {
      response.status(500).send('Wompi key not configured');
      return;
    }
    const transactionId = request.body?.data?.transaction?.id;
    if (!transactionId) {
      response.status(400).send('Missing transaction id');
      return;
    }
    const verification = await fetch(`https://production.wompi.co/v1/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${wompiKey}` },
    });
    if (!verification.ok) {
      response.status(502).send('Unable to verify transaction');
      return;
    }
    const transactionData: any = await verification.json();
    const payment = transactionData.data;
    const orderId = payment?.reference;
    if (!orderId) {
      response.status(400).send('Missing order reference');
      return;
    }
    const orderRef = db.collection('orders').doc(orderId);
    await db.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) throw new Error('Order not found');
      const order = orderSnapshot.data()!;
      if (order.paymentStatus === 'paid') return; // idempotent webhook delivery
      if (payment.status !== 'APPROVED') {
        transaction.update(orderRef, {
          paymentStatus: payment.status?.toLowerCase() || 'failed',
          status: 'payment_failed',
          wompiTransactionId: transactionId,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }
      if (payment.amount_in_cents !== order.total * 100 || payment.currency !== 'COP') {
        throw new Error('Payment amount mismatch');
      }
      for (const item of order.items) {
        const productRef = db.collection('products').doc(item.id);
        const productSnapshot = await transaction.get(productRef);
        if (!productSnapshot.exists || productSnapshot.data()!.stock < item.quantity) {
          throw new Error('Stock unavailable');
        }
        transaction.update(productRef, {
          stock: productSnapshot.data()!.stock - item.quantity,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      transaction.update(orderRef, {
        paymentStatus: 'paid',
        status: 'por_recolectar',
        wompiTransactionId: transactionId,
        paidAt: FieldValue.serverTimestamp(),
        collectedAt: FieldValue.serverTimestamp(), // entrada a logística
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    response.status(200).send('ok');
  } catch (error) {
    console.error(error);
    response.status(500).send('Webhook processing failed');
  }
});

/**
 * Keep `categories` in sync when products are created/updated/deleted.
 * Eventarc invokes this function as SERVICE_ACCOUNT (setGlobalOptions).
 */
export const syncProductCategory = onDocumentWritten('products/{productId}', async (event) => {
  const before = event.data?.before;
  const after = event.data?.after;
  const beforeCategory = before?.exists ? String(before.data()?.category || '').trim() : '';
  const afterCategory = after?.exists ? String(after.data()?.category || '').trim() : '';

  // Rama 1: manejo de caché de categorías (sin cambios).
  if (afterCategory && afterCategory !== beforeCategory) {
    const ref = db.collection('categories').doc(categoryDocId(afterCategory));
    const existing = await ref.get();
    if (existing.exists) {
      const currentName = String(existing.data()?.name || '').trim();
      if (currentName !== afterCategory) {
        await ref.set(
          { name: afterCategory, updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
      }
    } else {
      await ref.set({
        name: afterCategory,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // Rama 2: sistema de márgenes v3.
  // Recalcular SOLO si cambió precio_base y el producto es automático (is_*_manual = false).
  if (!after?.exists) return;
  const afterData = after.data() || {};
  const beforeData = before?.exists ? (before.data() || {}) : {};

  const baseBefore = Number(beforeData.precio_base ?? beforeData.costPrice ?? beforeData.vendorPrice ?? beforeData.price ?? 0);
  const baseAfter = Number(afterData.precio_base ?? afterData.costPrice ?? afterData.vendorPrice ?? afterData.price ?? 0);

  // Solo actuar si la base cambió.
  if (baseAfter === baseBefore) return;

  const isManual = Boolean(afterData.is_cliente_final_manual || afterData.is_dropshipper_manual || afterData.is_surtir_manual);
  const cfgSnap = await MARGENES_DOC.get();
  const cfg = normalizarConfig(cfgSnap.exists ? (cfgSnap.data() as Partial<ConfigMargenesGlobal>) : null);

  if (!isManual) {
    // Producto automático → recalcular los 5 precios.
    const precios = calcularPreciosAutomaticos(baseAfter, cfg);
    const rent = calcularRentabilidad(precios.precio_base, precios.precio_cliente_final);
    await after.ref.update({
      precio_base: precios.precio_base,
      precio_cliente_final: precios.precio_cliente_final,
      precio_dropshipper: precios.precio_dropshipper,
      precio_surtir_r1: precios.precio_surtir_r1,
      precio_surtir_r2: precios.precio_surtir_r2,
      precio_surtir_r3: precios.precio_surtir_r3,
      // Mirrors legacy (compatibilidad hacia atrás con vistas existentes):
      price: precios.precio_cliente_final,
      vendorPrice: precios.precio_dropshipper,
      estado_rentabilidad: rent.estado,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    // Producto manual → NO tocar precios, solo recalcular estado_rentabilidad.
    const finalActual = Number(afterData.precio_cliente_final ?? afterData.price ?? 0);
    const rent = calcularRentabilidad(baseAfter, finalActual);
    await after.ref.update({
      estado_rentabilidad: rent.estado,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
});

// ============================================================
// LOGÍSTICA — advanceOrderStatus
// Avanza el estado del pedido por la cadena de logística.
// Solo admin puede ejecutarlo.
// ============================================================
const LOGISTICS_FLOW = ['por_recolectar', 'en_bodega', 'para_empaque', 'despachado', 'entregado', 'para_pagar'] as const;
type LogisticsStatus = (typeof LOGISTICS_FLOW)[number];

export const advanceOrderStatus = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  const { orderId, nextStatus, photoUrl, trackingGuide, carrier, notes } = request.data as {
    orderId: string;
    nextStatus?: LogisticsStatus;
    photoUrl?: string;
    trackingGuide?: string;
    carrier?: string;
    notes?: string;
  };
  const user = await db.collection('users').doc(request.auth.uid).get();
  if (user.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo el administrador puede avanzar órdenes.');
  }
  if (!orderId) throw new HttpsError('invalid-argument', 'orderId requerido.');

  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new HttpsError('not-found', 'Orden no encontrada.');
  const current = orderSnap.data()!;
  const currentStatus = String(current.status || '');
  let target: LogisticsStatus = (nextStatus as LogisticsStatus) || 'por_recolectar';

  if (!LOGISTICS_FLOW.includes(target)) {
    throw new HttpsError('invalid-argument', `Estado inválido: ${target}`);
  }
  // Validar que el avance sea forward en la cadena.
  const currentIdx = LOGISTICS_FLOW.indexOf(currentStatus as LogisticsStatus);
  const targetIdx = LOGISTICS_FLOW.indexOf(target);
  if (currentIdx >= 0 && targetIdx <= currentIdx) {
    throw new HttpsError('failed-precondition', `No se puede retroceder de ${currentStatus} a ${target}.`);
  }

  const update: Record<string, unknown> = {
    status: target,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (target === 'en_bodega') {
    if (!photoUrl) throw new HttpsError('invalid-argument', 'La validación con foto es obligatoria al ingresar a bodega.');
    update.validationPhotoUrl = photoUrl;
    update.bodegaAt = FieldValue.serverTimestamp();
  }
  if (target === 'despachado') {
    if (!trackingGuide) throw new HttpsError('invalid-argument', 'La guía de envío es obligatoria para despachar.');
    update.trackingGuide = trackingGuide;
    update.carrier = carrier || 'Inter Rapidísimo';
    update.dispatchedAt = FieldValue.serverTimestamp();
  }
  if (target === 'entregado') update.deliveredAt = FieldValue.serverTimestamp();
  if (target === 'para_pagar') {
    // Marcado por admin cuando entra al batch de martes/viernes
    update.providerPaidAt = null;
    update.dropshipperPaidAt = null;
  }
  if (notes) update.logisticsNotes = notes;
  await orderRef.update(update);
  return { orderId, status: target };
});

// ============================================================
// LOGÍSTICA — createCollectionRoute
// Genera la ruta optimizada del día: agrupa órdenes por_recolectar por proveedor.
// ============================================================
export const createCollectionRoute = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  const user = await db.collection('users').doc(request.auth.uid).get();
  if (user.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo el administrador puede generar rutas.');
  }
  const { date, messenger } = request.data as { date?: string; messenger?: string };
  const routeDate = date || new Date().toISOString().split('T')[0];

  const ordersSnap = await db.collection('orders')
    .where('status', '==', 'por_recolectar')
    .where('paymentStatus', '==', 'paid')
    .get();

  const byProvider: Record<string, { orderIds: string[]; units: number }> = {};
  for (const doc of ordersSnap.docs) {
    const order = doc.data();
    const providerId = String(order.providerId || 'sin_proveedor');
    if (!byProvider[providerId]) byProvider[providerId] = { orderIds: [], units: 0 };
    byProvider[providerId].orderIds.push(doc.id);
    for (const item of (order.items || [])) {
      byProvider[providerId].units += Number(item.quantity) || 0;
    }
  }

  // Enriquecer con datos del proveedor (sin exponer al cliente final).
  const stops: Array<Record<string, unknown>> = [];
  for (const [providerId, info] of Object.entries(byProvider)) {
    let providerData: Record<string, unknown> = {};
    if (providerId !== 'sin_proveedor') {
      const provSnap = await db.collection('users').doc(providerId).get();
      if (provSnap.exists) providerData = provSnap.data() as Record<string, unknown>;
    }
    stops.push({
      providerId,
      providerName: providerData.name || 'Sin proveedor',
      providerStoreName: providerData.storeName || '',
      providerAddress: providerData.address || '',
      providerPhone: providerData.phone || '',
      orderIds: info.orderIds,
      units: info.units,
    });
  }

  const routeRef = await db.collection('collectionRoutes').add({
    date: routeDate,
    stops,
    status: 'planificada',
    messenger: messenger || '',
    orderCount: stops.reduce((sum, s) => sum + (s.orderIds as string[]).length, 0),
    createdAt: FieldValue.serverTimestamp(),
  });
  // Marcar órdenes con la ruta y mantenerlas en por_recolectar (no cambia el status).
  const batch = db.batch();
  for (const stop of stops) {
    for (const orderId of stop.orderIds as string[]) {
      batch.update(db.collection('orders').doc(orderId), { collectionRouteId: routeRef.id });
    }
  }
  await batch.commit();
  return { routeId: routeRef.id, stopsCount: stops.length };
});

// ============================================================
// PAGOS — registerPayouts
// El admin marca como pagadas las comisiones a proveedores y vendedores
// de las órdenes entregadas. Crea un batch de payout con registro.
// ============================================================
export const registerPayouts = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  const user = await db.collection('users').doc(request.auth.uid).get();
  if (user.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo el administrador puede registrar pagos.');
  }
  const { orderIds, period, reference } = request.data as {
    orderIds: string[];
    period: 'martes' | 'viernes';
    reference?: string;
  };
  if (!Array.isArray(orderIds) || !orderIds.length || !period) {
    throw new HttpsError('invalid-argument', 'orderIds y period son obligatorios.');
  }

  const batch = db.batch();
  let totalProviders = 0;
  let totalDropshippers = 0;
  let totalPlatformNet = 0;
  const collected: Array<Record<string, unknown>> = [];

  for (const orderId of orderIds) {
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) continue;
    const order = orderSnap.data()!;
    if (order.status !== 'entregado' && order.status !== 'para_pagar') continue;
    const dropshipperCommission = Number(order.dropshipperCommission) || 0;
    // Para proveedores: en dropshipping el proveedor recibe el precio de costo.
    // En surtido el proveedor recibe subtotal - comisión mayorista.
    const providerCost = Number(order.providerCost) || Number(order.subtotal) || Number(order.total) || 0;
    const wholesaleCommission = Number(order.wholesaleCommission) || 0;
    const providerAmount = Math.max(0, providerCost - wholesaleCommission);
    const dropshipperAmount = dropshipperCommission;
    const platformNet = Number(order.total || 0) - providerAmount - dropshipperAmount;
    totalProviders += providerAmount;
    totalDropshippers += dropshipperAmount;
    totalPlatformNet += platformNet;
    collected.push({ orderId, providerAmount, dropshipperAmount, platformNet });
    batch.update(orderRef, {
      status: 'pagado',
      providerPaidAt: FieldValue.serverTimestamp(),
      dropshipperPaidAt: FieldValue.serverTimestamp(),
      payoutReference: reference || `${period}-${new Date().toISOString().split('T')[0]}`,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const payoutRef = db.collection('payoutBatches').doc();
  batch.set(payoutRef, {
    date: new Date().toISOString().split('T')[0],
    period,
    totalProviders,
    totalDropshippers,
    totalPlatformNet,
    orderIds,
    reference: reference || `${period}-${new Date().toISOString().split('T')[0]}`,
    status: 'ejecutado',
    createdAt: FieldValue.serverTimestamp(),
    executedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { payoutId: payoutRef.id, totalProviders, totalDropshippers, totalPlatformNet, orderCount: collected.length };
});

// ============================================================
// GARANTÍAS — claimWarranty
// Cliente o admin abren un caso de garantía dentro de los 5 días post-entrega.
// ============================================================
export const claimWarranty = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  const { orderId, reason } = request.data as { orderId: string; reason?: string };
  if (!orderId) throw new HttpsError('invalid-argument', 'orderId requerido.');
  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new HttpsError('not-found', 'Orden no encontrada.');
  const order = orderSnap.data()!;
  const user = await db.collection('users').doc(request.auth.uid).get();
  if (order.userId !== request.auth.uid && user.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo el cliente o el admin pueden abrir garantía.');
  }
  await orderRef.update({
    status: 'garantia',
    warrantyReason: reason || '',
    warrantyClaimedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { orderId, status: 'garantia' };
});

// ============================================================
// SISTEMA DE 3 NIVELES DE PRECIOS — backoffice ADMIN.
//
// Colección Firestore: settings/configuracionMargenesGlobal (1 doc, siempre).
// Columnas en products: precio_base, precio_cliente_final, precio_dropshipper,
//   precio_surtir_r1/r2/r3, is_*_manual, estado_rentabilidad.
// ============================================================

const MARGENES_DOC = db.collection('settings').doc('configuracionMargenesGlobal');

async function requireAdmin(authUid?: string) {
  if (!authUid) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  const userSnap = await db.collection('users').doc(authUid).get();
  if (userSnap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo el administrador puede ejecutar esta acción.');
  }
  return userSnap;
}

/** GET /api/admin/configuracion-margenes */
export const getConfiguracionMargenes = onCall(async (request) => {
  await requireAdmin(request.auth?.uid);
  const snap = await MARGENES_DOC.get();
  const data = (snap.exists ? snap.data() : null) as Partial<ConfigMargenesGlobal> | null;
  return normalizarConfig(data);
});

/** PUT /api/admin/configuracion-margenes */
export const putConfiguracionMargenes = onCall(async (request) => {
  await requireAdmin(request.auth?.uid);
  const saneada = normalizarConfig({ ...DEFAULT_CONFIG_MARGENES, ...((request.data || {}) as Partial<ConfigMargenesGlobal>) });
  await MARGENES_DOC.set({ ...saneada, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return saneada;
});

/** POST /api/admin/productos/recalcular-masivo — aplica config global a productos automáticos. */
export const recalcularMasivo = onCall(async (request) => {
  await requireAdmin(request.auth?.uid);
  const cfgSnap = await MARGENES_DOC.get();
  const cfg = normalizarConfig(cfgSnap.exists ? (cfgSnap.data() as Partial<ConfigMargenesGlobal>) : null);

  const productsSnap = await db.collection('products').get();
  const batch = db.batch();
  let recalcualdos = 0;
  let manuales = 0;

  productsSnap.forEach((docSnap) => {
    const p = docSnap.data() || {};
    const precioBase = Number(p.precio_base ?? p.costPrice ?? p.vendorPrice ?? p.price ?? 0);
    const isManual = Boolean(p.is_cliente_final_manual || p.is_dropshipper_manual || p.is_surtir_manual);

    // Para productos automáticos: recalcular los 5 precios.
    if (!isManual) {
      const precios = calcularPreciosAutomaticos(precioBase, cfg);
      const rent = calcularRentabilidad(precioBase, precios.precio_cliente_final);
      batch.update(docSnap.ref, {
        precio_base: precios.precio_base,
        precio_cliente_final: precios.precio_cliente_final,
        precio_dropshipper: precios.precio_dropshipper,
        precio_surtir_r1: precios.precio_surtir_r1,
        precio_surtir_r2: precios.precio_surtir_r2,
        precio_surtir_r3: precios.precio_surtir_r3,
        is_cliente_final_manual: false,
        is_dropshipper_manual: false,
        is_surtir_manual: false,
        // Mirrors legacy:
        price: precios.precio_cliente_final,
        vendorPrice: precios.precio_dropshipper,
        estado_rentabilidad: rent.estado,
        updatedAt: FieldValue.serverTimestamp(),
      });
      recalcualdos++;
    } else {
      // Manuales: NO tocar precios, solo recalcular estado de rentabilidad con precio_cliente_final actual.
      const finalActual = Number(p.precio_cliente_final ?? p.price ?? 0);
      const rent = calcularRentabilidad(precioBase, finalActual);
      batch.update(docSnap.ref, {
        estado_rentabilidad: rent.estado,
        updatedAt: FieldValue.serverTimestamp(),
      });
      manuales++;
    }
  });

  await batch.commit();
  return { recalcualdos, manuales, total: productsSnap.size };
});

type TipoPrecio = 'cliente_final' | 'dropshipper' | 'surtir_r1' | 'surtir_r2' | 'surtir_r3';

/** PUT /api/admin/productos/{id}/precio-manual — override de un precio (con bloqueo de margen mínimo). */
export const setPrecioManual = onCall(async (request) => {
  await requireAdmin(request.auth?.uid);
  const { productId, tipo, valor } = (request.data || {}) as {
    productId: string;
    tipo: TipoPrecio;
    valor: number | null;
  };
  if (!productId || !tipo) throw new HttpsError('invalid-argument', 'productId y tipo son obligatorios.');

  const ref = db.collection('products').doc(productId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Producto no encontrado.');
  const p = snap.data()!;

  const cfgSnap = await MARGENES_DOC.get();
  const cfg = normalizarConfig(cfgSnap.exists ? (cfgSnap.data() as Partial<ConfigMargenesGlobal>) : null);
  const precioBase = Number(p.precio_base ?? p.costPrice ?? p.vendorPrice ?? p.price ?? 0);
  const preciosAuto = calcularPreciosAutomaticos(precioBase, cfg);

  const update: Record<string, number | boolean | string | ReturnType<typeof FieldValue.serverTimestamp>> = {};

  // Resetea a automático si el admin mandó null.
  if (valor === null) {
    if (tipo === 'cliente_final') {
      update.precio_cliente_final = preciosAuto.precio_cliente_final;
      update.is_cliente_final_manual = false;
      update.price = preciosAuto.precio_cliente_final; // mirror legacy
    } else if (tipo === 'dropshipper') {
      update.precio_dropshipper = preciosAuto.precio_dropshipper;
      update.is_dropshipper_manual = false;
      update.vendorPrice = preciosAuto.precio_dropshipper; // mirror legacy
    } else if (tipo === 'surtir_r1') {
      update.precio_surtir_r1 = preciosAuto.precio_surtir_r1;
      update.is_surtir_manual = false;
    } else if (tipo === 'surtir_r2') {
      update.precio_surtir_r2 = preciosAuto.precio_surtir_r2;
      update.is_surtir_manual = false;
    } else if (tipo === 'surtir_r3') {
      update.precio_surtir_r3 = preciosAuto.precio_surtir_r3;
      update.is_surtir_manual = false;
    }
  } else {
    const valorNum = Number(valor);
    if (!Number.isFinite(valorNum)) throw new HttpsError('invalid-argument', 'valor debe ser numérico.');

    // Bloqueo del 15% mínimo sobre precio_final (solo aplica a cliente_final, que es el "precio_final" del enunciado).
    const check = validarMargenMinimo(precioBase, valorNum, cfg.margen_minimo_bloqueo);
    if (!check.ok && tipo === 'cliente_final') {
      throw new HttpsError('failed-precondition', check.mensaje);
    }

    if (tipo === 'cliente_final') {
      update.precio_cliente_final = valorNum;
      update.is_cliente_final_manual = true;
      update.price = valorNum; // mirror legacy
    } else if (tipo === 'dropshipper') {
      update.precio_dropshipper = valorNum;
      update.is_dropshipper_manual = true;
      update.vendorPrice = valorNum; // mirror legacy
    } else if (tipo === 'surtir_r1') {
      update.precio_surtir_r1 = valorNum;
      update.is_surtir_manual = true;
    } else if (tipo === 'surtir_r2') {
      update.precio_surtir_r2 = valorNum;
      update.is_surtir_manual = true;
    } else if (tipo === 'surtir_r3') {
      update.precio_surtir_r3 = valorNum;
      update.is_surtir_manual = true;
    }
  }

  // Recalcula estado de rentabilidad con el precio_cliente_final resultante.
  const precioFinalParaEstado = update.precio_cliente_final !== undefined
    ? Number(update.precio_cliente_final)
    : Number(p.precio_cliente_final ?? p.price ?? 0);
  const rent = calcularRentabilidad(precioBase, precioFinalParaEstado);
  update.estado_rentabilidad = rent.estado;
  update.updatedAt = FieldValue.serverTimestamp();

  await ref.update(update);
  return { estado: rent.estado };
});

/** GET /api/admin/alertas-rentabilidad/count — contador de productos en pérdida y margen bajo. */
export const alertasRentabilidadCount = onCall(async (request) => {
  await requireAdmin(request.auth?.uid);
  const snap = await db.collection('products').get();
  let perdida = 0;
  let alerta_baja = 0;
  snap.forEach((docSnap) => {
    const p = docSnap.data() || {};
    const estado = String(p.estado_rentabilidad || '').toLowerCase();
    if (estado === 'perdida') perdida++;
    else if (estado === 'alerta_baja') alerta_baja++;
  });
  return { perdida, alerta_baja, total: snap.size };
});

// ============================================================
// VITRINA HOME — administrar qué productos se muestran en
// destacados / ofertas / novedades de la home pública.
//
// Colección Firestore: home_vitrina (docs por item).
//   { productoId, seccion: 'destacados'|'ofertas'|'novedades',
//     posicion: int, createdAt } — UNIQUE(productoId,seccion).
//
// Reglas: NO toca products. Si borras home_vitrina, App.tsx
// hace fallback a p.collections.* (comportamiento anterior).
// ============================================================

type SeccionVitrina = 'destacados' | 'ofertas' | 'novedades';

function sanitizeSeccion(s: unknown): SeccionVitrina {
  const v = String(s || '');
  if (v === 'destacados' || v === 'ofertas' || v === 'novedades') return v;
  throw new HttpsError('invalid-argument', 'Sección inválida. Debe ser: destacados | ofertas | novedades.');
}

/** GET /api/admin/vitrina/list?seccion=destacados
 *  Pública: usada por el Admin (gestión) y por App.tsx (home pública).
 *  Devuelve array vacío ante cualquier fallo (nunca 500).
 */
export const vitrinaList = onCall(async (request) => {
  try {
    const seccion = sanitizeSeccion(request.data?.seccion);
    const snap = await db.collection('home_vitrina')
      .where('seccion', '==', seccion)
      .orderBy('posicion', 'asc')
      .get();

    const items = await Promise.all(
      snap.docs.map(async (docSnap) => {
        const v = docSnap.data() as { productoId?: string; seccion?: string; posicion?: number };
        let product: Record<string, unknown> | null = null;
        try {
          const pSnap = await db.collection('products').doc(String(v.productoId || '')).get();
          if (pSnap.exists) product = { id: pSnap.id, ...(pSnap.data() as Record<string, unknown>) };
        } catch {
          // producto borrado → null (el front los filtra)
        }
        return {
          id: docSnap.id,
          productoId: String(v.productoId || ''),
          seccion: String(v.seccion || seccion),
          posicion: Number(v.posicion || 0),
          product,
        };
      }),
    );
    return items;
  } catch (e) {
    // Fallo => array vacío, nunca error 500 (regla del enunciado).
    console.warn('vitrinaList failed gracefully:', e);
    return [];
  }
});

/** POST /api/admin/vitrina/add — { productoId, seccion } */
export const vitrinaAdd = onCall(async (request) => {
  await requireAdmin(request.auth?.uid);
  const productoId = String((request.data || {}).productoId || '');
  const seccion = sanitizeSeccion((request.data || {}).seccion);
  if (!productoId) throw new HttpsError('invalid-argument', 'productoId requerido.');

  // Validar producto existe.
  const pSnap = await db.collection('products').doc(productoId).get();
  if (!pSnap.exists) throw new HttpsError('not-found', 'Producto no existe.');

  // Validar UNIQUE (productoId, seccion).
  const dupSnap = await db.collection('home_vitrina')
    .where('productoId', '==', productoId)
    .where('seccion', '==', seccion)
    .limit(1).get();
  if (!dupSnap.empty) throw new HttpsError('already-exists', 'El producto ya está en esta sección de la vitrina.');

  // posicion = MAX(posicion)+1.
  const allSnap = await db.collection('home_vitrina').where('seccion', '==', seccion).get();
  let max = 0;
  allSnap.forEach((d) => { const p = Number(d.data()?.posicion) || 0; if (p > max) max = p; });

  const ref = await db.collection('home_vitrina').add({
    productoId,
    seccion,
    posicion: max + 1,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true, id: ref.id };
});

/** DELETE /api/admin/vitrina/remove?id=UUID */
export const vitrinaRemove = onCall(async (request) => {
  await requireAdmin(request.auth?.uid);
  const id = String((request.data || {}).id || '');
  if (!id) throw new HttpsError('invalid-argument', 'id requerido.');

  const ref = db.collection('home_vitrina').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Item no existe.');
  const seccion = String(snap.data()?.seccion || '');
  await ref.delete();

  // Reordenar los restantes sin huecos (1,2,3,4...).
  const restSnap = await db.collection('home_vitrina')
    .where('seccion', '==', seccion)
    .orderBy('posicion', 'asc')
    .get();
  const batch = db.batch();
  restSnap.docs.forEach((d, idx) => {
    const current = Number(d.data()?.posicion) || 0;
    if (current !== idx + 1) batch.update(d.ref, { posicion: idx + 1 });
  });
  await batch.commit();
  return { ok: true };
});

/** PUT /api/admin/vitrina/reorder — { seccion, orden: [vitrinaId, ...] } */
export const vitrinaReorder = onCall(async (request) => {
  await requireAdmin(request.auth?.uid);
  const seccion = sanitizeSeccion((request.data || {}).seccion);
  const orden = (request.data || {}).orden;
  if (!Array.isArray(orden) || !orden.length) throw new HttpsError('invalid-argument', 'orden debe ser un array de ids.');

  // Transacción atómica.
  await db.runTransaction(async (transaction) => {
    for (let i = 0; i < orden.length; i++) {
      const ref = db.collection('home_vitrina').doc(String(orden[i]));
      const snap = await transaction.get(ref);
      if (!snap.exists) continue; // si id inválido, salta silenciosamente
      if (String(snap.data()?.seccion || '') !== seccion) continue;
      transaction.update(ref, { posicion: i + 1 });
    }
  });
  return { ok: true, actualizados: orden.length };
});

