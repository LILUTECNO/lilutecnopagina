import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, RotateCcw, Save, Search, Tags } from 'lucide-react';
import { ConfigMargenesGlobal, DEFAULT_CONFIG_MARGENES, EstadoRentabilidad, Product } from '../types';
import { calcularPreciosAutomaticos, calcularRentabilidad, fetchAlertasRentabilidad, setPrecioManual, TipoPrecio } from '../services/margenes';

interface Props {
  products: Product[];
  cfg: ConfigMargenesGlobal;
  filtroExterno?: 'perdida' | null;
  onProductosActualizados?: () => void;
}

interface DraftPrecios {
  cliente_final: string;
  dropshipper: string;
  surtir_r1: string;
  surtir_r2: string;
  surtir_r3: string;
}

const estadoStyle: Record<EstadoRentabilidad, { label: string; cls: string }> = {
  ok: { label: 'OK', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  alerta_baja: { label: 'ALERTA', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  perdida: { label: 'PÉRDIDA', cls: 'bg-red-500/15 text-red-300 border-red-500/40' },
};

const EditorPreciosProducto: React.FC<Props> = ({ products, cfg, filtroExterno, onProductosActualizados }) => {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'perdida' | 'baja' | null>(filtroExterno ?? null);
  const [counters, setCounters] = useState<{ perdida: number; alerta_baja: number }>({ perdida: 0, alerta_baja: 0 });
  const [draft, setDraft] = useState<DraftPrecios | null>(null);
  const [savingTipo, setSavingTipo] = useState<TipoPrecio | null>(null);
  const tablaRef = useRef<HTMLDivElement>(null);
  const dvRef = useRef<number | undefined>(undefined);

  // debounce 300ms (sin librería externa).
  useEffect(() => {
    window.clearTimeout(dvRef.current);
    dvRef.current = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(dvRef.current);
  }, [search]);

  // Cuando el padre cambia filtroExterno, aplicamos y scrolleamos.
  useEffect(() => {
    if (filtroExterno) {
      setFiltro(filtroExterno);
      setTimeout(() => tablaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [filtroExterno]);

  // Contadores de alertas (del backend, fuente de verdad).
  useEffect(() => {
    void refreshCounters();
  }, [products.length]);

  const refreshCounters = async () => {
    const c = await fetchAlertasRentabilidad();
    setCounters({ perdida: c.perdida, alerta_baja: c.alerta_baja });
  };

  const preisBase = (p: Product) => Number(p.precio_base ?? p.costPrice ?? p.vendorPrice ?? p.price ?? 0);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    let list = products.slice();
    if (filtro === 'perdida') list = list.filter((p) => String(p.estado_rentabilidad || '').toLowerCase() === 'perdida');
    if (filtro === 'baja') list = list.filter((p) => ['alerta_baja', 'perdida'].includes(String(p.estado_rentabilidad || '').toLowerCase()));
    if (q) list = list.filter((p) => `${p.name || ''} ${p.reference || ''}`.toLowerCase().includes(q));
    return list;
  }, [products, debounced, filtro]);

  const selected = useMemo(() => products.find((p) => p.id === selectedId) || null, [products, selectedId]);

  useEffect(() => {
    if (selected) {
      const cfgLocal = cfg;
      setDraft({
        cliente_final: '',
        dropshipper: '',
        surtir_r1: '',
        surtir_r2: '',
        surtir_r3: '',
      });
      void cfgLocal;
    }
  }, [selectedId, cfg]);

  const autoPrecios = useMemo(() => {
    if (!selected) return null;
    return calcularPreciosAutomaticos(preisBase(selected), cfg);
  }, [selected, cfg]);

  if (!cfg || Object.keys(cfg).length === 0) {
    // Fallback por si cfg aún no llegó.
    cfg = DEFAULT_CONFIG_MARGENES;
  }

  const filas: Array<{ tipo: TipoPrecio; label: string; cantidad: string; pctAuto: number; precioAuto: number; manualKey: keyof DraftPrecios; isManual: boolean }> = [
    { tipo: 'cliente_final', label: 'Cliente Final', cantidad: '1', pctAuto: cfg.porcentaje_cliente_final, precioAuto: autoPrecios?.precio_cliente_final ?? 0, manualKey: 'cliente_final', isManual: !!selected?.is_cliente_final_manual },
    { tipo: 'dropshipper', label: 'Dropshipper', cantidad: '1', pctAuto: cfg.porcentaje_dropshipper, precioAuto: autoPrecios?.precio_dropshipper ?? 0, manualKey: 'dropshipper', isManual: !!selected?.is_dropshipper_manual },
    { tipo: 'surtir_r1', label: 'Surtir R1', cantidad: '1-5', pctAuto: cfg.r1_porcentaje, precioAuto: autoPrecios?.precio_surtir_r1 ?? 0, manualKey: 'surtir_r1', isManual: !!selected?.is_surtir_manual },
    { tipo: 'surtir_r2', label: 'Surtir R2', cantidad: '6-20', pctAuto: cfg.r2_porcentaje, precioAuto: autoPrecios?.precio_surtir_r2 ?? 0, manualKey: 'surtir_r2', isManual: !!selected?.is_surtir_manual },
    { tipo: 'surtir_r3', label: 'Surtir R3', cantidad: '21+', pctAuto: cfg.r3_porcentaje, precioAuto: autoPrecios?.precio_surtir_r3 ?? 0, manualKey: 'surtir_r3', isManual: !!selected?.is_surtir_manual },
  ];

  const valorActualManual = (f: typeof filas[number]): number => {
    const p = selected;
    if (!p) return f.precioAuto;
    const map: Record<TipoPrecio, number | undefined> = {
      cliente_final: p.precio_cliente_final,
      dropshipper: p.precio_dropshipper,
      surtir_r1: p.precio_surtir_r1,
      surtir_r2: p.precio_surtir_r2,
      surtir_r3: p.precio_surtir_r3,
    };
    const v = map[f.tipo];
    return typeof v === 'number' ? v : f.precioAuto;
  };

  const handleGuardarFila = async (f: typeof filas[number]) => {
    if (!selected) return;
    const raw = draft?.[f.manualKey];
    // Vacío => reseteo a automático.
    if (raw === '' || raw === undefined || raw === null) {
      setSavingTipo(f.tipo);
      try {
        await setPrecioManual(selected.id, f.tipo, null);
        toast.success(`${f.label} restablecido a automático.`);
        onProductosActualizados?.();
      } catch (e: any) {
        toast.error(e?.message || 'Error al restablecer.');
      } finally {
        setSavingTipo(null);
      }
      return;
    }
    // Editable: el campo % del enunciado no se guarda directo; se usa como guía. El admin guarda el precio final en $.
    const valor = Number(raw);
    if (!Number.isFinite(valor)) {
      toast.error('Valor inválido.');
      return;
    }
    setSavingTipo(f.tipo);
    try {
      await setPrecioManual(selected.id, f.tipo, valor);
      toast.success(`${f.label} actualizado a $${valor.toLocaleString('es-CO')}.`);
      onProductosActualizados?.();
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar precio manual.');
    } finally {
      setSavingTipo(null);
    }
  };

  const revisar = () => {
    setFiltro('perdida');
    setTimeout(() => tablaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F0A1E] p-6 shadow-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Tags className="h-5 w-5 text-[#FF7A00]" />
        <h3 className="font-montserrat text-base font-light text-white">
          Editor de Precios por Producto + Centro de Alertas
        </h3>
      </div>

      {/* Barra búsqueda + badge alertas */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o referencia (autocomplete)…"
            className="w-full rounded-lg border border-white/10 bg-white/[.04] px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#FF7A00] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-red-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            {counters.perdida} en pérdida
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-amber-300">
            {counters.alerta_baja} con margen bajo
          </span>
          <button
            onClick={revisar}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#FF7A00] to-[#9D4EDD] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Revisar
          </button>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
        {([
          [null, 'Todos'],
          ['perdida', 'Solo pérdida'],
          ['baja', 'Pérdida + baja'],
        ] as const).map(([val, label]) => (
          <button
            key={label}
            onClick={() => setFiltro(val)}
            className={filtro === val
              ? 'rounded-full border border-[#FF7A00]/50 bg-[#FF7A00]/15 text-[#FF7A00] px-3 py-1'
              : 'rounded-full border border-white/10 bg-white/[.03] text-slate-400 px-3 py-1 hover:border-white/20'}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tabla selector de productos */}
      <div ref={tablaRef} className="max-h-72 overflow-y-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#0F0A1E] text-[9px] uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2">Ref</th>
              <th className="px-3 py-2 text-right">Base</th>
              <th className="px-3 py-2 text-right">Cliente Final</th>
              <th className="px-3 py-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500 text-xs">Sin resultados.</td></tr>
            )}
            {filtered.map((p) => {
              const estado = String(p.estado_rentabilidad || '').toLowerCase() as EstadoRentabilidad;
              const st = estadoStyle[estado] || estadoStyle.ok;
              const fin = Number(p.precio_cliente_final ?? p.price ?? 0);
              return (
                <tr
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`cursor-pointer hover:bg-white/[.04] ${selectedId === p.id ? 'bg-white/[.06]' : ''} ${estado === 'perdida' ? 'bg-red-500/5' : ''}`}
                >
                  <td className="px-3 py-2 text-white">{p.name}</td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{p.reference || '-'}</td>
                  <td className="px-3 py-2 text-right text-slate-300">${preisBase(p).toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2 text-right text-white">${fin.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold ${st.cls}`}>{st.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Card de edición del producto seleccionado */}
      {selected && autoPrecios && (
        (() => {
          const base = preisBase(selected);
          const finActual = Number(selected.precio_cliente_final ?? autoPrecios.precio_cliente_final);
          const rent = calcularRentabilidad(base, finActual);
          const estado = (String(selected.estado_rentabilidad || rent.estado).toLowerCase() as EstadoRentabilidad);
          const st = estadoStyle[estado] || estadoStyle.ok;
          return (
            <div className={`rounded-lg border bg-white/[.02] p-5 ${estado === 'perdida' ? 'border-red-500/60 bg-red-500/10' : 'border-white/10'}`}>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-4 border-b border-white/10">
                <div className="text-white font-medium">{selected.name}</div>
                <div className="flex gap-4 text-xs">
                  <span className="text-slate-400">Precio Base: <span className="text-white font-semibold">${base.toLocaleString('es-CO')}</span> <span className="text-slate-600">(solo lectura)</span></span>
                  <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold ${st.cls}`}>{st.label}</span>
                </div>
              </div>

              {/* Tooltip cálculo neto si pérdida */}
              {estado === 'perdida' && (
                <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
                  <div className="font-semibold mb-1">⚠ Cálculo de Ganancia Neta Real</div>
                  <div>Ganancia bruta: ${rent.ganancia_bruta.toLocaleString('es-CO')} · Comisión pasarela: ${rent.comision_pasarela.toLocaleString('es-CO')} · IVA s/comisión: ${rent.iva_sobre_comision.toLocaleString('es-CO')} · <b>Ganancia neta: ${rent.ganancia_neta.toLocaleString('es-CO')} ({rent.porcentaje_neto}%)</b></div>
                </div>
              )}

              {/* Tabla de 5 filas */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[9px] uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-2 py-2">Tipo</th>
                      <th className="px-2 py-2">Cantidad</th>
                      <th className="px-2 py-2">% Auto</th>
                      <th className="px-2 py-2 text-right">Precio Auto</th>
                      <th className="px-2 py-2">Precio Manual (input)</th>
                      <th className="px-2 py-2 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filas.map((f) => {
                      const actual = valorActualManual(f);
                      const isManual = f.isManual;
                      return (
                        <tr key={f.tipo} className={isManual ? 'bg-amber-500/5' : ''}>
                          <td className="px-2 py-2 text-white">{f.label} {isManual && <span className="text-[9px] text-amber-400">(manual)</span>}</td>
                          <td className="px-2 py-2 text-slate-400">{f.cantidad}</td>
                          <td className="px-2 py-2 text-slate-300">
                            <input type="number" defaultValue={f.pctAuto} className="w-16 rounded border border-white/10 bg-white/[.04] px-2 py-1 text-white text-xs focus:border-[#FF7A00] focus:outline-none" aria-label={`${f.label} porcentaje auto`} />
                          </td>
                          <td className="px-2 py-2 text-right text-slate-300">${f.precioAuto.toLocaleString('es-CO')}</td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              placeholder={actual.toLocaleString('es-CO')}
                              value={draft?.[f.manualKey] ?? ''}
                              onChange={(e) => setDraft((d) => ({ ...(d as DraftPrecios), [f.manualKey]: e.target.value }))}
                              className="w-32 rounded border border-white/10 bg-white/[.04] px-2 py-1 text-white text-xs focus:border-[#FF7A00] focus:outline-none"
                              aria-label={`${f.label} precio manual`}
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleGuardarFila(f)}
                                disabled={savingTipo === f.tipo}
                                className="inline-flex items-center gap-1 rounded border border-[#FF7A00]/40 bg-[#FF7A00]/15 px-2 py-1 text-[10px] uppercase tracking-widest text-[#FF7A00] hover:bg-[#FF7A00]/25 disabled:opacity-50"
                              >
                                <Save className="h-3 w-3" /> Guardar
                              </button>
                              <button
                                onClick={() => handleGuardarFila(f)}
                                title="Reset a automático (deja vacío el input y guarda)"
                                className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-slate-300 hover:bg-white/10"
                              >
                                <RotateCcw className="h-3 w-3" /> Reset Auto
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-[10px] text-slate-500">
                Deja el input vacío y presiona <b>Guardar/Reset Auto</b> para restaurar el cálculo automático. Los porcentajes son de referencia — lo que se guarda es el precio final en $. El precio_cliente_final está sujeto al margen mínimo de bloqueo ({cfg.margen_minimo_bloqueo}%).
              </p>
            </div>
          );
        })()
      )}
    </div>
  );
};

export default EditorPreciosProducto;
