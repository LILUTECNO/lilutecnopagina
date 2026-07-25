// ============================================================
// NIVELES DE PRECIOS — lógica financiera reutilizable.
// Compartida por Cloud Functions (backend admin) y usada por
// triggers automáticos de Firestore.
//
// Fórmulas (cuando is_manual = false):
//   precio_cliente_final = precio_base * (1 + porcentaje_cliente_final / 100)
//   precio_dropshipper   = precio_base * (1 + porcentaje_dropshipper / 100)
//   precio_surtir_rN     = precio_base * (1 + rN_porcentaje / 100)
//
// Rentabilidad Neta Real:
//   ganancia_bruta      = precio_final - precio_base
//   comision_pasarela   = precio_final * 0.035
//   iva_sobre_comision  = ganancia_bruta * 0.19
//   ganancia_neta       = ganancia_bruta - comision_pasarela - iva_sobre_comision
//   porcentaje_neto     = (ganancia_neta / precio_base) * 100
//
// Estado de rentabilidad:
//   porcentaje_neto < 0           => 'perdida'
//   porcentaje_neto < 8           => 'alerta_baja'
//   otherwise                    => 'ok'
// ============================================================

export type EstadoRentabilidad = 'ok' | 'alerta_baja' | 'perdida';

export interface MargenesNumericos {
  precio_base: number;
  precio_cliente_final: number;
  precio_dropshipper: number;
  precio_surtir_r1: number;
  precio_surtir_r2: number;
  precio_surtir_r3: number;
}

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
  r1_min: 1,
  r1_max: 5,
  r1_porcentaje: 25,
  r2_min: 6,
  r2_max: 20,
  r2_porcentaje: 18,
  r3_min: 21,
  r3_max: 99999,
  r3_porcentaje: 15,
  pedido_minimo_surtir: 150000,
  margen_minimo_bloqueo: 15,
};

// Constantes de rentabilidad (acuerdo financiero de la plataforma).
export const COMISION_PASARELA_RATE = 0.035;
export const IVA_SOBRE_COMISION_RATE = 0.19;
export const ALERTA_BAJA_PORCENTAJE_NETO = 8;

export function redondear(valor: number): number {
  return Math.round(valor);
}

/** Devuelve la config numérica saneada + rellena con defaults. */
export function normalizarConfig(raw: Partial<ConfigMargenesGlobal> | null | undefined): ConfigMargenesGlobal {
  const r = raw || {};
  return {
    porcentaje_cliente_final: Number.isFinite(r.porcentaje_cliente_final) ? Number(r.porcentaje_cliente_final) : DEFAULT_CONFIG_MARGENES.porcentaje_cliente_final,
    porcentaje_dropshipper: Number.isFinite(r.porcentaje_dropshipper) ? Number(r.porcentaje_dropshipper) : DEFAULT_CONFIG_MARGENES.porcentaje_dropshipper,
    porcentaje_dropshipper_pro: Number.isFinite(r.porcentaje_dropshipper_pro) ? Number(r.porcentaje_dropshipper_pro) : DEFAULT_CONFIG_MARGENES.porcentaje_dropshipper_pro,
    r1_min: Number.isFinite(r.r1_min) ? Number(r.r1_min) : DEFAULT_CONFIG_MARGENES.r1_min,
    r1_max: Number.isFinite(r.r1_max) ? Number(r.r1_max) : DEFAULT_CONFIG_MARGENES.r1_max,
    r1_porcentaje: Number.isFinite(r.r1_porcentaje) ? Number(r.r1_porcentaje) : DEFAULT_CONFIG_MARGENES.r1_porcentaje,
    r2_min: Number.isFinite(r.r2_min) ? Number(r.r2_min) : DEFAULT_CONFIG_MARGENES.r2_min,
    r2_max: Number.isFinite(r.r2_max) ? Number(r.r2_max) : DEFAULT_CONFIG_MARGENES.r2_max,
    r2_porcentaje: Number.isFinite(r.r2_porcentaje) ? Number(r.r2_porcentaje) : DEFAULT_CONFIG_MARGENES.r2_porcentaje,
    r3_min: Number.isFinite(r.r3_min) ? Number(r.r3_min) : DEFAULT_CONFIG_MARGENES.r3_min,
    r3_max: Number.isFinite(r.r3_max) ? Number(r.r3_max) : DEFAULT_CONFIG_MARGENES.r3_max,
    r3_porcentaje: Number.isFinite(r.r3_porcentaje) ? Number(r.r3_porcentaje) : DEFAULT_CONFIG_MARGENES.r3_porcentaje,
    pedido_minimo_surtir: Number.isFinite(r.pedido_minimo_surtir) ? Number(r.pedido_minimo_surtir) : DEFAULT_CONFIG_MARGENES.pedido_minimo_surtir,
    margen_minimo_bloqueo: Number.isFinite(r.margen_minimo_bloqueo) ? Number(r.margen_minimo_bloqueo) : DEFAULT_CONFIG_MARGENES.margen_minimo_bloqueo,
  };
}

/** Calcula los 5 precios automáticos a partir de precio_base + config. */
export function calcularPreciosAutomaticos(precioBase: number, cfg: ConfigMargenesGlobal): MargenesNumericos {
  const base = Math.max(0, Number(precioBase) || 0);
  return {
    precio_base: redondear(base),
    precio_cliente_final: redondear(base * (1 + cfg.porcentaje_cliente_final / 100)),
    precio_dropshipper: redondear(base * (1 + cfg.porcentaje_dropshipper / 100)),
    precio_surtir_r1: redondear(base * (1 + cfg.r1_porcentaje / 100)),
    precio_surtir_r2: redondear(base * (1 + cfg.r2_porcentaje / 100)),
    precio_surtir_r3: redondear(base * (1 + cfg.r3_porcentaje / 100)),
  };
}

export interface ResultadoRentabilidad {
  ganancia_bruta: number;
  comision_pasarela: number;
  iva_sobre_comision: number;
  ganancia_neta: number;
  porcentaje_neto: number;
  estado: EstadoRentabilidad;
}

/** Rentabilidad neta real sobre precio_cliente_final. */
export function calcularRentabilidad(precioBase: number, precioFinal: number): ResultadoRentabilidad {
  const base = Math.max(0, Number(precioBase) || 0);
  const final = Number(precioFinal) || 0;
  const ganancia_bruta = final - base;
  const comision_pasarela = final * COMISION_PASARELA_RATE;
  const iva_sobre_comision = ganancia_bruta * IVA_SOBRE_COMISION_RATE;
  const ganancia_neta = ganancia_bruta - comision_pasarela - iva_sobre_comision;
  const porcentaje_neto = base > 0 ? (ganancia_neta / base) * 100 : 0;
  const estado: EstadoRentabilidad = porcentaje_neto < 0 ? 'perdida' : porcentaje_neto < ALERTA_BAJA_PORCENTAJE_NETO ? 'alerta_baja' : 'ok';
  return {
    ganancia_bruta: redondear(ganancia_bruta),
    comision_pasarela: redondear(comision_pasarela),
    iva_sobre_comision: redondear(iva_sobre_comision),
    ganancia_neta: redondear(ganancia_neta),
    porcentaje_neto: Math.round(porcentaje_neto * 100) / 100,
    estado,
  };
}

/** Valida que un precio_manual no viole el margen mínimo de bloqueo (en %). */
export function validarMargenMinimo(precioBase: number, precioManual: number, margenMinBloqueo: number): { ok: true } | { ok: false; mensaje: string } {
  const base = Math.max(0, Number(precioBase) || 0);
  const final = Number(precioManual) || 0;
  if (base <= 0) return { ok: true }; // sin base no hay validación posible
  const porcentaje = ((final - base) / base) * 100;
  if (porcentaje < margenMinBloqueo) {
    const r = calcularRentabilidad(base, final);
    return {
      ok: false,
      mensaje: `Margen mínimo ${margenMinBloqueo}% no alcanzado. Ganancia neta sería $${r.ganancia_neta.toLocaleString('es-CO')}.`,
    };
  }
  return { ok: true };
}
