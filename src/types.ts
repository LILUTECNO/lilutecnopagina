
export interface Product {
  id: string;
  name: string;
  price: number;
  old_price?: number;
  vendorPrice?: number;
  category: string;
  stock: number;
  summary: string;
  images: string[];
  features: string[];
  providerId?: string;
  reference?: string;
  costPrice?: number;
  createdAt?: string;
  collections?: { featured?: boolean; offers?: boolean; new?: boolean };
  // --- Sistema de 3 niveles de precios (v3) ---
  precio_base?: number;
  precio_cliente_final?: number;
  precio_dropshipper?: number;
  precio_surtir_r1?: number;
  precio_surtir_r2?: number;
  precio_surtir_r3?: number;
  is_cliente_final_manual?: boolean;
  is_dropshipper_manual?: boolean;
  is_surtir_manual?: boolean;
  estado_rentabilidad?: 'ok' | 'alerta_baja' | 'perdida' | string;
}

export type EstadoRentabilidad = 'ok' | 'alerta_baja' | 'perdida';

export interface ConfigMargenesGlobal {
  porcentaje_cliente_final: number;
  porcentaje_dropshipper: number;
  porcentaje_dropshipper_pro: number;
  r1_min: number;
  r1_max: number;
  r1_porcentaje: number;
  r2_min: number;
  r2_max: number;
  r2_porcentaje: number;
  r3_min: number;
  r3_max: number;
  r3_porcentaje: number;
  pedido_minimo_surtir: number;
  margen_minimo_bloqueo: number;
}

export const DEFAULT_CONFIG_MARGENES: ConfigMargenesGlobal = {
  porcentaje_cliente_final: 50,
  porcentaje_dropshipper: 30,
  porcentaje_dropshipper_pro: 20,
  r1_min: 1, r1_max: 5, r1_porcentaje: 25,
  r2_min: 6, r2_max: 20, r2_porcentaje: 18,
  r3_min: 21, r3_max: 99999, r3_porcentaje: 15,
  pedido_minimo_surtir: 150000,
  margen_minimo_bloqueo: 15,
};

export interface ProductWithStringImages {
  id: string;
  name: string;
  price: number;
  old_price?: number;
  category: string;
  stock: number;
  summary: string;
  images: string; // Images as a single comma-separated string
  features: string[];
}

export interface CartItem extends Product {
  quantity: number;
  image: string; // To store the primary image for cart display
}

export interface FiltersState {
  searchTerm: string;
  category: string;
  priceRange: {
    min: number;
    max: number;
  };
  stockOnly: boolean;
}

export interface NotificationMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// ============================================================
// ORDERS — Modelo B2B2C (marketplace de proveedores + vendedores)
// ============================================================

/** Tipo de pedido según el actor que lo dispara */
export type OrderType = 'dropshipping' | 'surtido' | 'direct';

/**
 * Estados del flujo logístico.
 * - pending_payment: esperando Wompi
 * - payment_failed: pago rechazado
 * - paid: pago aprobado (entrada a la logística)
 * - por_recolectar: el mensajero va donde el proveedor
 * - en_bodega: llegó a bodega central
 * - para_empaque: listo para empacar/consolidar
 * - despachado: guía generada, en transporte
 * - entregado: cliente recibió
 * - para_pagar: marcado para batch de pago (martes/viernes)
 * - pagado: pagos a proveedor y vendedor ya ejecutados
 * - garantia: caso abierto post-entrega (5 días)
 * - cancelled: anulado
 */
export type OrderStatus =
  | 'pending_payment'
  | 'payment_failed'
  | 'paid'
  | 'por_recolectar'
  | 'en_bodega'
  | 'para_empaque'
  | 'despachado'
  | 'entregado'
  | 'para_pagar'
  | 'pagado'
  | 'garantia'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  providerId?: string | null;
  vendorPrice?: number;
}

export interface CustomerInfo {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
}

export interface Order {
  id: string;
  type?: OrderType;
  status: OrderStatus | string;
  paymentStatus: PaymentStatus | string;
  userId?: string;
  dropshipperId?: string | null;
  dropshipperName?: string;
  // Snapshots financieros (calculados por la Cloud Function al confirmar el pago)
  dropshipperCommission?: number;
  providerCost?: number;
  logisticsCost?: number;
  platformMargin?: number;
  commissionRate?: number;
  // Datos del cliente final. SOLO el admin los ve. El proveedor nunca.
  customer?: CustomerInfo;
  customerDetails?: CustomerInfo;
  items: OrderItem[];
  subtotal?: number;
  shippingCost?: number;
  shippingOption?: 'BOGOTA' | 'OTHER';
  discount?: number;
  coupon?: string | null;
  total: number;
  currency?: string;
  // Logística
  trackingGuide?: string;
  carrier?: string;
  consolidationGroup?: string;
  collectionRouteId?: string;
  validationPhotoUrl?: string;
  collectedAt?: any;
  bodegaAt?: any;
  packedAt?: any;
  dispatchedAt?: any;
  deliveredAt?: any;
  // Pagos
  providerPaidAt?: any;
  dropshipperPaidAt?: any;
  providerPayoutId?: string;
  dropshipperPayoutId?: string;
  wholesaleCommission?: number;
  payoutReference?: string;
  // Garantía
  warrantyClaimedAt?: any;
  warrantyReason?: string;
  // Wompi
  wompiTransactionId?: string;
  paidAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

// ============================================================
// RUTAS DE RECOLECCIÓN — para el mensajero del admin
// ============================================================
export interface CollectionStop {
  orderIds: string[];
  providerId: string;
  providerName?: string;
  providerAddress?: string;
  providerPhone?: string;
  providerStoreName?: string;
  units: number;
  reference?: string;
}

export interface CollectionRoute {
  id: string;
  date: string;
  stops: CollectionStop[];
  status: 'planificada' | 'en_curso' | 'completada';
  messenger?: string;
  createdAt?: any;
}

// ============================================================
// PAGOS — batches de martes/viernes
// ============================================================
export interface PayoutBatch {
  id: string;
  date: string;
  period: 'martes' | 'viernes';
  totalProviders: number;
  totalProvidersAmount: number;
  totalDropshippers: number;
  totalDropshippersAmount: number;
  totalPlatformNet: number;
  orderIds: string[];
  status: 'planificado' | 'ejecutado';
  reference?: string;
  createdAt?: any;
  executedAt?: any;
}

export interface ProviderPayoutEntry {
  providerId: string;
  providerName: string;
  amount: number;
  orderCount: number;
}
export interface DropshipperPayoutEntry {
  dropshipperId: string;
  dropshipperName: string;
  amount: number;
  orderCount: number;
}
