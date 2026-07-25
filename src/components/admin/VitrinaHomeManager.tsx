import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Search, Trash, X } from 'lucide-react';
import type { Product } from '../../types';
import { vitrinaAdd, vitrinaList, vitrinaRemove, vitrinaReorder, type SeccionVitrina, type VitrinaItem } from '../../services/vitrina';

interface Props {
  products: Product[];
}

const SECCIONES: Array<{ key: SeccionVitrina; label: string; max: number }> = [
  { key: 'destacados', label: 'Destacados', max: 20 },
  { key: 'ofertas', label: 'Ofertas', max: 20 },
  { key: 'novedades', label: 'Novedades', max: 20 },
];

const VitrinaHomeManager: React.FC<Props> = ({ products }) => {
  const [seccion, setSeccion] = useState<SeccionVitrina>('destacados');
  const [items, setItems] = useState<VitrinaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const seccionMeta = SECCIONES.find((s) => s.key === seccion)!;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = async (sec: SeccionVitrina) => {
    setLoading(true);
    try {
      const data = await vitrinaList(sec);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(seccion);
  }, [seccion]);

  // debounce del reorder (no necesario: dnd-kit llama onDragEnd una vez por drop).
  const persistReorder = async (next: VitrinaItem[]) => {
    const orden = next.map((it) => it.id);
    try {
      await vitrinaReorder(seccion, orden);
    } catch (e: any) {
      // rollback visual y toast.
      setItems(items);
      toast.error('No se pudo guardar el orden. Restablecido.');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    void persistReorder(next);
  };

  const handleRemove = async (id: string) => {
    setRemoving(id);
    const backup = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await vitrinaRemove(id);
      toast.success('Quitado de la vitrina.');
    } catch (e: any) {
      setItems(backup);
      toast.error(e?.message || 'No se pudo quitar. Restablecido.');
    } finally {
      setRemoving(null);
    }
  };

  const handleAdd = async (productoId: string) => {
    setAdding(productoId);
    try {
      await vitrinaAdd(productoId, seccion);
      // Refresca desde backend para tener posicion consistente + product joined.
      await load(seccion);
      toast.success('Agregado a la vitrina.');
      setShowAddModal(false);
      setSearch('');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo agregar. ¿Ya está en la sección?');
    } finally {
      setAdding(null);
    }
  };

  const itemsEnSeccionIds = useMemo(() => new Set(items.map((i) => i.productoId)), [items]);

  // Productos disponibles para agregar: todos menos los ya en esta sección.
  const productosDisponibles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !itemsEnSeccionIds.has(p.id))
      .filter((p) => `${p.name || ''} ${p.reference || ''}`.toLowerCase().includes(q));
  }, [products, itemsEnSeccionIds, search]);

  const fmt = (n: number) => '$' + Number(n || 0).toLocaleString('es-CO');

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2">
        {SECCIONES.map((s) => {
          const isActive = s.key === seccion;
          const count = s.key === seccion ? items.length : null;
          return (
            <button
              key={s.key}
              onClick={() => setSeccion(s.key)}
              className={
                isActive
                  ? 'rounded-full border border-[#FF7A00]/60 bg-[#FF7A00]/15 px-4 py-1.5 text-[10px] uppercase tracking-widest text-[#FF7A00] font-semibold'
                  : 'rounded-full border border-white/10 bg-white/[.03] px-4 py-1.5 text-[10px] uppercase tracking-widest text-slate-400 hover:border-white/20'
              }
            >
              {s.label} {count !== null ? `(${count}/${s.max})` : ''}
            </button>
          );
        })}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Arrastra los items para reordenarlos. Si el backend falla, el orden se restablece automáticamente.
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={items.length >= seccionMeta.max}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#FF7A00] to-[#9D4EDD] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>

      {/* Lista sortable */}
      <div className="rounded-2xl border border-white/10 bg-[#0F0A1E]/50 p-4 min-h-32">
        {loading && items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">Cargando vitrina…</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Vitrina vacía. Presiona <b>Agregar</b> para escoger productos. Si está vacía, la tienda pública mostrará el listado por defecto.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {items.map((it) => (
                  <SortableRow
                    key={it.id}
                    item={it}
                    onRemove={() => handleRemove(it.id)}
                    busy={removing === it.id}
                    fmt={fmt}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Modal Agregar */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAddModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0F0A1E] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Agregar a {seccionMeta.label.toLowerCase()}</h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o referencia…"
                className="w-full rounded-lg border border-white/10 bg-white/[.04] px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#FF7A00] focus:outline-none"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto space-y-1.5">
              {productosDisponibles.length === 0 && (
                <li className="py-6 text-center text-xs text-slate-500">Sin productos disponibles para agregar.</li>
              )}
              {productosDisponibles.slice(0, 50).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[.02] p-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.images && p.images[0] ? (
                      <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-white/5 flex items-center justify-center text-[8px] text-slate-500 flex-shrink-0">N/A</div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.reference || '-'} · {p.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-300">{fmt(p.price)}</span>
                    <button
                      onClick={() => handleAdd(p.id)}
                      disabled={adding === p.id}
                      className="rounded-lg border border-[#FF7A00]/40 bg-[#FF7A00]/15 px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#FF7A00] font-semibold hover:bg-[#FF7A00]/25 disabled:opacity-50"
                    >
                      {adding === p.id ? '…' : 'Agregar'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

interface SortableRowProps {
  item: VitrinaItem;
  onRemove: () => void;
  busy: boolean;
  fmt: (n: number) => string;
}

const SortableRow: React.FC<SortableRowProps> = ({ item, onRemove, busy, fmt }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const p = item.product as any;
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[.03] p-2.5 transition-colors hover:border-white/20"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 touch-none"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {p?.images?.[0] ? (
        <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover flex-shrink-0" />
      ) : (
        <div className="h-10 w-10 rounded bg-white/5 flex items-center justify-center text-[8px] text-slate-500 flex-shrink-0">N/A</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white">{p?.name || '(producto eliminado)'}</p>
        <p className="text-[10px] text-slate-500">#{item.posicion} · {p?.category || ''}</p>
      </div>
      <span className="text-xs text-slate-300">{fmt(p?.price ?? p?.precio_cliente_final ?? 0)}</span>
      <button
        onClick={onRemove}
        disabled={busy}
        title="Quitar de la vitrina"
        className="rounded-md p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
      >
        {busy ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" /> : <Trash className="h-4 w-4" />}
      </button>
    </li>
  );
};

export default VitrinaHomeManager;
