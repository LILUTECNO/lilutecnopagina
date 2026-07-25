import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Save, SlidersHorizontal } from 'lucide-react';
import { ConfigMargenesGlobal, DEFAULT_CONFIG_MARGENES, Product } from '../types';
import { fetchConfigMargenes, saveConfigMargenes, recalcularMasivo } from '../services/margenes';

interface Props {
  onRecalculado?: () => void;
  products: Product[];
}

const ConfiguracionGlobalMargenes: React.FC<Props> = ({ onRecalculado, products }) => {
  const [cfg, setCfg] = useState<ConfigMargenesGlobal>({ ...DEFAULT_CONFIG_MARGENES });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchConfigMargenes();
      setCfg(data);
    } finally {
      setLoading(false);
    }
  };

  const productosAutomaticos = products.filter(
    (p) => !(p.is_cliente_final_manual || p.is_dropshipper_manual || p.is_surtir_manual)
  ).length;

  const handleGuardar = async () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      await saveConfigMargenes(cfg);
      toast.success('Configuración global guardada.');
      const resumen = await recalcularMasivo();
      toast.success(`Recalculados ${resumen.recalcualdos} automáticos · ${resumen.manuales} manuales con alerta actualizada.`);
      onRecalculado?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Error guardando configuración global.');
    } finally {
      setSaving(false);
    }
  };

  const numField = (label: string, key: keyof ConfigMargenesGlobal, suffix?: string) => (
    <div>
      <label className="block text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={cfg[key]}
          onChange={(e) => setCfg({ ...cfg, [key]: e.target.value === '' ? 0 : Number(e.target.value) })}
          className="w-full rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-sm text-white focus:border-[#FF7A00] focus:outline-none"
        />
        {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F0A1E] p-6 shadow-2xl space-y-5">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-5 w-5 text-[#FF7A00]" />
        <h3 className="font-montserrat text-base font-light text-white">
          Configuración Global de Márgenes y Cantidades <span className="text-slate-500">(Base Financiera)</span>
        </h3>
      </div>

      {loading ? (
        <div className="py-4 text-center text-xs text-slate-400">Cargando configuración…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Columna 1 */}
          <div className="space-y-4">
            {numField('Cliente Final [%]', 'porcentaje_cliente_final', '%')}
            {numField('Dropshipper [%]', 'porcentaje_dropshipper', '%')}
            {numField('Dropshipper PRO (futuro) [%]', 'porcentaje_dropshipper_pro', '%')}
            {numField('Pedido Mínimo Surtir [$]', 'pedido_minimo_surtir', 'COP')}
            {numField('Margen Mínimo Bloqueo [%]', 'margen_minimo_bloqueo', '%')}
          </div>

          {/* Columna 2 */}
          <div className="space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">Rangos Surtir · Margen por Cantidad</p>
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <div className="grid grid-cols-3 gap-px bg-white/5 text-[9px] uppercase tracking-widest text-slate-300 font-semibold">
                <div className="px-3 py-2">Mín</div>
                <div className="px-3 py-2">Máx</div>
                <div className="px-3 py-2">% Ganancia</div>
              </div>
              {([
                ['r1', 'R1 (1-5)'],
                ['r2', 'R2 (6-20)'],
                ['r3', 'R3 (21+)'],
              ] as const).map(([prefix]) => {
                const minKey = `${prefix}_min` as keyof ConfigMargenesGlobal;
                const maxKey = `${prefix}_max` as keyof ConfigMargenesGlobal;
                const pctKey = `${prefix}_porcentaje` as keyof ConfigMargenesGlobal;
                return (
                  <div key={prefix} className="grid grid-cols-3 gap-px bg-white/5">
                    <input
                      type="number"
                      value={cfg[minKey]}
                      onChange={(e) => setCfg({ ...cfg, [minKey]: Number(e.target.value) })}
                      className="bg-[#0F0A1E] px-3 py-2 text-sm text-white focus:outline-none focus:bg-white/[.06]"
                      aria-label={`${prefix} mínimo`}
                    />
                    <input
                      type="number"
                      value={cfg[maxKey]}
                      onChange={(e) => setCfg({ ...cfg, [maxKey]: Number(e.target.value) })}
                      className="bg-[#0F0A1E] px-3 py-2 text-sm text-white focus:outline-none focus:bg-white/[.06]"
                      aria-label={`${prefix} máximo`}
                    />
                    <div className="flex items-center bg-[#0F0A1E]">
                      <input
                        type="number"
                        value={cfg[pctKey]}
                        onChange={(e) => setCfg({ ...cfg, [pctKey]: Number(e.target.value) })}
                        className="w-full bg-transparent px-3 py-2 text-sm text-white focus:outline-none focus:bg-white/[.06]"
                        aria-label={`${prefix} porcentaje`}
                      />
                      <span className="px-2 text-xs text-slate-400">%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500">Mínimo absoluto de la plataforma: R3 (15% por defecto). Nadie puede vender por debajo del margen mínimo de bloqueo.</p>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-white/10">
        <button
          disabled={saving || loading}
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-gradient-to-r from-[#FF7A00] to-[#9D4EDD] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-lg disabled:opacity-50"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando…' : 'Guardar Configuración Global'}
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F0A1E] p-6 space-y-4 shadow-2xl">
            <h4 className="text-sm font-semibold text-white">Confirmar recálculo masivo</h4>
            <p className="text-xs text-slate-300">
              ¿Aplicar cambios a <span className="text-[#FF7A00] font-bold">{productosAutomaticos} productos</span> que no tienen precio manual? Esto recalculará sus precios.
            </p>
            <p className="text-[10px] text-slate-500">Los productos con precios manuales NO serán modificados, solo se actualizará su estado de rentabilidad.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)} className="rounded-lg border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-slate-300 hover:bg-white/5">Cancelar</button>
              <button
                onClick={handleGuardar}
                className="rounded-lg bg-gradient-to-r from-[#FF7A00] to-[#9D4EDD] px-4 py-2 text-xs uppercase tracking-widest text-white font-semibold"
              >
                Confirmar y recalcular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionGlobalMargenes;
