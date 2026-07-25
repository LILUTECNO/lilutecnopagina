/**
 * migrate-margenes-v3.mjs
 *
 * Migración única (idempotente) del sistema de 3 niveles de precios.
 *
 * 1) Lee la config global vieja en settings/priceMargins (por ejemplo 30/20/10)
 *    y la escribe en settings/configuracionMargenesGlobal con los defaults 25/18/15
 *    y 50/30, conservándola si ya existe.
 * 2) Para cada producto:
 *    - is_*_manual = false  => recalcular los 5 precios con las nuevas fórmulas.
 *    - is_*_manual = true   => NO tocar el precio, solo reevaluar estado_rentabilidad.
 *
 * Uso:
 *   node scripts/migrate-margenes-v3.mjs  (desde la raíz del repo)
 *
 * Requiere GOOGLE_APPLICATION_CREDENTIALS o sesión `firebase login` con admin SDK
 * apuntando al proyecto lilutecno-pagina-web. En local puedes usar:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/migrate-margenes-v3.mjs
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'lilutecno-pagina-web';

const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? cert(JSON.parse(await import('node:fs').then(m => m.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'))))
  : applicationDefault();

initializeApp({ credential, projectId: PROJECT_ID });
const db = getFirestore();

const DEFAULT_CONFIG = {
  porcentaje_cliente_final: 50,
  porcentaje_dropshipper: 30,
  porcentaje_dropshipper_pro: 20,
  r1_min: 1, r1_max: 5, r1_porcentaje: 25,
  r2_min: 6, r2_max: 20, r2_porcentaje: 18,
  r3_min: 21, r3_max: 99999, r3_porcentaje: 15,
  pedido_minimo_surtir: 150000,
  margen_minimo_bloqueo: 15,
};

const COMISION_PASARELA = 0.035;
const IVA_SOBRE_COMISION = 0.19;

function round(n) { return Math.round(n); }

function calcularPrecios(base, cfg) {
  const b = Math.max(0, Number(base) || 0);
  return {
    precio_base: round(b),
    precio_cliente_final: round(b * (1 + cfg.porcentaje_cliente_final / 100)),
    precio_dropshipper: round(b * (1 + cfg.porcentaje_dropshipper / 100)),
    precio_surtir_r1: round(b * (1 + cfg.r1_porcentaje / 100)),
    precio_surtir_r2: round(b * (1 + cfg.r2_porcentaje / 100)),
    precio_surtir_r3: round(b * (1 + cfg.r3_porcentaje / 100)),
  };
}

function calcularRentabilidad(base, final) {
  const b = Math.max(0, Number(base) || 0);
  const f = Number(final) || 0;
  const ganancia_bruta = f - b;
  const comision_pasarela = f * COMISION_PASARELA;
  const iva_sobre_comision = ganancia_bruta * IVA_SOBRE_COMISION;
  const ganancia_neta = ganancia_bruta - comision_pasarela - iva_sobre_comision;
  const pct = b > 0 ? (ganancia_neta / b) * 100 : 0;
  const estado = pct < 0 ? 'perdida' : pct < 8 ? 'alerta_baja' : 'ok';
  return { ganancia_neta: round(ganancia_neta), porcentaje_neto: Math.round(pct * 100) / 100, estado };
}

async function main() {
  console.log('>>> Migración márgenes v3 — proyecto:', PROJECT_ID);

  // 1) Config global
  const margenesRef = db.collection('settings').doc('configuracionMargenesGlobal');
  const margenesSnap = await margenesRef.get();
  let cfg;
  if (margenesSnap.exists) {
    cfg = { ...DEFAULT_CONFIG, ...(margenesSnap.data() || {}) };
    console.log('Config global ya existe. Se conserva y sanea.');
  } else {
    // Intenta leer config vieja 30/20/10
    const oldSnap = await db.collection('settings').doc('priceMargins').get();
    const oldData = oldSnap.exists ? (oldSnap.data() || {}) : {};
    cfg = { ...DEFAULT_CONFIG };
    if (typeof oldData.dropshipperDiscount === 'number') {
      // No pisamos porcentaje_dropshipper con el descuento viejo (concepto distinto),
      // pero lo dejamos registrado y reportamos.
      console.log(`  (info) settings/priceMargins.dropshipperDiscount=${oldData.dropshipperDiscount} — se conserva el documento, sin pisar la nueva config.`);
    }
  }
  await margenesRef.set({ ...cfg, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log('Config global escrita:', cfg);

  // 2) Productos
  const productsSnap = await db.collection('products').get();
  console.log(`Productos a procesar: ${productsSnap.size}`);

  let recalcualdos = 0;
  let manuales = 0;
  const batchMax = 400;
  let batch = db.batch();
  let inBatch = 0;

  for (const docSnap of productsSnap.docs) {
    const p = docSnap.data() || {};
    const precioBase = Number(p.precio_base ?? p.costPrice ?? p.vendorPrice ?? p.price ?? 0);
    const isManual = Boolean(p.is_cliente_final_manual || p.is_dropshipper_manual || p.is_surtir_manual);

    const precios = calcularPrecios(precioBase, cfg);
    const finalParaEstado = isManual ? Number(p.precio_cliente_final ?? p.price ?? precios.precio_cliente_final) : precios.precio_cliente_final;
    const rent = calcularRentabilidad(precioBase, finalParaEstado);

    const update = isManual
      ? { estado_rentabilidad: rent.estado, updatedAt: FieldValue.serverTimestamp() }
      : {
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
        };

    if (!isManual) recalcualdos++; else manuales++;
    batch.update(docSnap.ref, update);
    inBatch++;

    if (inBatch >= batchMax) {
      await batch.commit();
      batch = db.batch();
      inBatch = 0;
      console.log(`  commit parcial…`);
    }
  }
  if (inBatch > 0) {
    await batch.commit();
  }

  console.log(`\n>>> OK. Recalculados automáticos: ${recalcualdos} | Manuales (solo estado): ${manuales} | Total: ${productsSnap.size}`);
}

main().catch((err) => {
  console.error('Migración fallida:', err);
  process.exit(1);
});
