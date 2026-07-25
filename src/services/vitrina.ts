import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import type { Product } from '../types';

export type SeccionVitrina = 'destacados' | 'ofertas' | 'novedades';

export interface VitrinaItem {
  id: string;
  productoId: string;
  seccion: SeccionVitrina;
  posicion: number;
  product: (Product & { id: string }) | null;
}

const listFn = httpsCallable<{ seccion: SeccionVitrina }, VitrinaItem[]>(functions, 'vitrinaList');
const listPublicFn = httpsCallable<{ seccion: SeccionVitrina }, VitrinaItem[]>(functions, 'vitrinaList');
const addFn = httpsCallable<{ productoId: string; seccion: SeccionVitrina }, { ok: true; id: string }>(functions, 'vitrinaAdd');
const removeFn = httpsCallable<{ id: string }, { ok: true }>(functions, 'vitrinaRemove');
const reorderFn = httpsCallable<{ seccion: SeccionVitrina; orden: string[] }, { ok: true; actualizados: number }>(functions, 'vitrinaReorder');

/** Lista vitrina. Si falla el backend, retorna array vacío ( nunca lanza al caller ). */
export async function vitrinaList(seccion: SeccionVitrina): Promise<VitrinaItem[]> {
  try {
    const res = await listFn({ seccion });
    // Filtra items cuyo producto fue borrado de products.
    return (res.data || []).filter((it) => it.product !== null);
  } catch (e) {
    console.warn('vitrinaList falló gracefully:', e);
    return [];
  }
}

/** Igual que vitrinaList pero para uso público (no requiere auth). Mismo endpoint. */
export async function vitrinaListPublic(seccion: SeccionVitrina): Promise<VitrinaItem[]> {
  try {
    const res = await listPublicFn({ seccion });
    return (res.data || []).filter((it) => it.product !== null);
  } catch (e) {
    console.warn('vitrinaListPublic falló gracefully:', e);
    return [];
  }
}

export async function vitrinaAdd(productoId: string, seccion: SeccionVitrina): Promise<{ id: string }> {
  const res = await addFn({ productoId, seccion });
  return { id: res.data.id };
}

export async function vitrinaRemove(id: string): Promise<void> {
  await removeFn({ id });
}

export async function vitrinaReorder(seccion: SeccionVitrina, orden: string[]): Promise<void> {
  await reorderFn({ seccion, orden });
}
