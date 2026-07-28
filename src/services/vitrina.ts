import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { functions, db } from '../firebaseConfig';
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

// Helper Firestore directo
async function directVitrinaList(seccion: SeccionVitrina): Promise<VitrinaItem[]> {
  const q = query(collection(db, 'home_vitrina'), where('seccion', '==', seccion));
  const snap = await getDocs(q);
  const items: VitrinaItem[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const pId = data.productoId;
    let product: (Product & { id: string }) | null = null;
    if (pId) {
      const pSnap = await getDoc(doc(db, 'products', pId));
      if (pSnap.exists()) {
        product = { ...(pSnap.data() as Product), id: pSnap.id };
      }
    }
    items.push({
      id: docSnap.id,
      productoId: pId,
      seccion: data.seccion as SeccionVitrina,
      posicion: Number(data.posicion || 0),
      product,
    });
  }

  // Ordenar por posición asc y filtrar borrados
  return items
    .filter((it) => it.product !== null)
    .sort((a, b) => a.posicion - b.posicion);
}

/** Lista vitrina. Si falla el backend (Cloud Function), usa Firestore directo. */
export async function vitrinaList(seccion: SeccionVitrina): Promise<VitrinaItem[]> {
  try {
    const res = await listFn({ seccion });
    return (res.data || []).filter((it) => it.product !== null);
  } catch (e) {
    console.warn('vitrinaList Cloud Function falló, usando fallback Firestore:', e);
    try {
      return await directVitrinaList(seccion);
    } catch (fsErr) {
      console.error('Error en fallback directVitrinaList:', fsErr);
      return [];
    }
  }
}

/** Uso público de lista vitrina. */
export async function vitrinaListPublic(seccion: SeccionVitrina): Promise<VitrinaItem[]> {
  try {
    const res = await listPublicFn({ seccion });
    return (res.data || []).filter((it) => it.product !== null);
  } catch (e) {
    console.warn('vitrinaListPublic Cloud Function falló, usando fallback Firestore:', e);
    try {
      return await directVitrinaList(seccion);
    } catch (fsErr) {
      console.error('Error en fallback directVitrinaListPublic:', fsErr);
      return [];
    }
  }
}

export async function vitrinaAdd(productoId: string, seccion: SeccionVitrina): Promise<{ id: string }> {
  try {
    const res = await addFn({ productoId, seccion });
    return { id: res.data.id };
  } catch (e: any) {
    console.warn('vitrinaAdd Cloud Function falló, ejecutando directa en Firestore:', e);
    
    // Validar duplicados en esta sección
    const dupQuery = query(
      collection(db, 'home_vitrina'),
      where('productoId', '==', productoId),
      where('seccion', '==', seccion),
      limit(1)
    );
    const dupSnap = await getDocs(dupQuery);
    if (!dupSnap.empty) {
      throw new Error('El producto ya está en esta sección de la vitrina.');
    }

    // Calcular posición máxima
    const allQuery = query(collection(db, 'home_vitrina'), where('seccion', '==', seccion));
    const allSnap = await getDocs(allQuery);
    let maxPos = 0;
    allSnap.forEach((d) => {
      const pos = Number(d.data()?.posicion) || 0;
      if (pos > maxPos) maxPos = pos;
    });

    const newDoc = await addDoc(collection(db, 'home_vitrina'), {
      productoId,
      seccion,
      posicion: maxPos + 1,
      createdAt: serverTimestamp(),
    });

    return { id: newDoc.id };
  }
}

export async function vitrinaRemove(id: string): Promise<void> {
  try {
    await removeFn({ id });
  } catch (e) {
    console.warn('vitrinaRemove Cloud Function falló, ejecutando directa en Firestore:', e);
    await deleteDoc(doc(db, 'home_vitrina', id));
  }
}

export async function vitrinaReorder(seccion: SeccionVitrina, orden: string[]): Promise<void> {
  try {
    await reorderFn({ seccion, orden });
  } catch (e) {
    console.warn('vitrinaReorder Cloud Function falló, ejecutando directa en Firestore:', e);
    const batch = writeBatch(db);
    orden.forEach((itemId, idx) => {
      batch.update(doc(db, 'home_vitrina', itemId), { posicion: idx + 1 });
    });
    await batch.commit();
  }
}
