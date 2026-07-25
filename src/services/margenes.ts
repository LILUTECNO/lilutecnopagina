import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { ConfigMargenesGlobal, DEFAULT_CONFIG_MARGENES, EstadoRentabilidad } from '../types';

export type TipoPrecio = 'cliente_final' | 'dropshipper' | 'surtir_r1' | 'surtir_r2' | 'surtir_r3';

const getConfig = httpsCallable<Record<string, never>, ConfigMargenesGlobal>(functions, 'getConfiguracionMargenes');
const putConfig = httpsCallable<Partial<ConfigMargenesGlobal>, ConfigMargenesGlobal>(functions, 'putConfiguracionMargenes');
const recalc = httpsCallable<{ soloAutomaticos?: boolean }, { recalcualdos: number; manuales: number; total: number }>(functions, 'recalcularMasivo');
const setManual = httpsCallable<{ productId: string; tipo: TipoPrecio; valor: number | null }, { estado: EstadoRentabilidad | string }>(functions, 'setPrecioManual');
const alertasCount = httpsCallable<Record<string, never>, { perdida: number; alerta_baja: number; total: number }>(functions, 'alertasRentabilidadCount');

export async function fetchConfigMargenes(): Promise<ConfigMargenesGlobal> {
  try {
    const res = await getConfig({});
    return res.data;
  } catch (e) {
    console.warn('getConfigMargenes falló, usando defaults', e);
    return { ...DEFAULT_CONFIG_MARGENES };
  }
}

export async function saveConfigMargenes(data: Partial<ConfigMargenesGlobal>): Promise<ConfigMargenesGlobal> {
  const res = await putConfig(data);
  return res.data;
}

export async function recalcularMasivo(): Promise<{ recalcualdos: number; manuales: number; total: number }> {
  const res = await recalc({});
  return res.data;
}

export async function setPrecioManual(productId: string, tipo: TipoPrecio, valor: number | null): Promise<{ estado: EstadoRentabilidad | string }> {
  const res = await setManual({ productId, tipo, valor });
  return res.data;
}

export async function fetchAlertasRentabilidad(): Promise<{ perdida: number; alerta_baja: number; total: number }> {
  try {
    const res = await alertasCount({});
    return res.data;
  } catch (e) {
    return { perdida: 0, alerta_baja: 0, total: 0 };
  }
}

// --- Helpers de cálculo en cliente (idénticos a backend) ---
export const COMISION_PASARELA_RATE = 0.035;
export const IVA_SOBRE_COMISION_RATE = 0.19;
export const ALERTA_BAJA_PORCENTAJE_NETO = 8;

export function calcularRentabilidad(precioBase: number, precioFinal: number) {
  const base = Math.max(0, Number(precioBase) || 0);
  const final = Number(precioFinal) || 0;
  const ganancia_bruta = final - base;
  const comision_pasarela = final * COMISION_PASARELA_RATE;
  const iva_sobre_comision = ganancia_bruta * IVA_SOBRE_COMISION_RATE;
  const ganancia_neta = ganancia_bruta - comision_pasarela - iva_sobre_comision;
  const porcentaje_neto = base > 0 ? (ganancia_neta / base) * 100 : 0;
  const estado: EstadoRentabilidad = porcentaje_neto < 0 ? 'perdida' : porcentaje_neto < ALERTA_BAJA_PORCENTAJE_NETO ? 'alerta_baja' : 'ok';
  return {
    ganancia_bruta: Math.round(ganancia_bruta),
    comision_pasarela: Math.round(comision_pasarela),
    iva_sobre_comision: Math.round(iva_sobre_comision),
    ganancia_neta: Math.round(ganancia_neta),
    porcentaje_neto: Math.round(porcentaje_neto * 100) / 100,
    estado,
  };
}

export function calcularPreciosAutomaticos(precioBase: number, cfg: ConfigMargenesGlobal) {
  const base = Math.max(0, Number(precioBase) || 0);
  return {
    precio_base: Math.round(base),
    precio_cliente_final: Math.round(base * (1 + cfg.porcentaje_cliente_final / 100)),
    precio_dropshipper: Math.round(base * (1 + cfg.porcentaje_dropshipper / 100)),
    precio_surtir_r1: Math.round(base * (1 + cfg.r1_porcentaje / 100)),
    precio_surtir_r2: Math.round(base * (1 + cfg.r2_porcentaje / 100)),
    precio_surtir_r3: Math.round(base * (1 + cfg.r3_porcentaje / 100)),
  };
}
