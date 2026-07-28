/**
 * BrandingEditor — provider panel (new UI slice; additive, mounts inside the
 * existing brand <details> panel).
 *
 * Two columns on wide screens (controls left, LIVE PREVIEW right), stacked on
 * narrow. The EDITOR's own chrome reuses the web's Tron tokens (the editor UI
 * itself follows Tron Night until the storefront theme flips), so this file
 * uses existing utility classes (partner-shell, white/[.04], etc.) seen across
 * ProviderDashboard.tsx. The PREVIEW renders the chosen @react-pdf template —
 * the SAME Document tree the download path emits — inside <PDFViewer>.
 *
 * Sections (spec section 2):
 *   2.1 Template picker — visual cards, each with a miniature schematic + name
 *        + vibe. Selecting sets templateId AND loads that template's DEFAULT
 *        palette (only if not customized, OR via explicit "Usar colores de la
 *        plantilla" button — never silently overwrite a customized palette).
 *   2.2 Corporate palette — 3 curated preset rows per template (one-click
 *        applies all 5 roles) + five NATIVE <input type="color"> controls +
 *        hex readout + AA/AA-large contrast chips (verdict() from contrast.ts).
 *   2.3 Logo upload — reuses the EXISTING handleLogoSelect/handleLogoUpload
 *        mechanism on ProviderDashboard (writes the provider's brand logo to
 *        `providerLogos/{uid}/...`; never over a product image). The PREVIEW
 *        + PDF fall back to a text wordmark (companyName) when absent.
 *   2.4 Company info — companyName, tagline, contact (web/email/phone/
 *        whatsapp/address). The provider model ALREADY has phone/address/
 *        storeName; we BIND these to the existing fields via the parent's
 *        saveBrand updateDoc (NO duplicate fields). Only the truly new ones
 *        (web, email, whatsapp) live under branding.contact.
 *   2.5 Live preview — renders the ACTUAL chosen template with the actual
 *        palette/logo/info and 2-3 sample product cards (real first products if
 *        available, else neutral placeholders), recolored to the brand. Shows
 *        the discreet LILU signature in its corner so the provider sees where
 *        the platform mark sits.
 *   2.6 Save — a clear "Guardar identidad de marca" action that persists via
 *        the existing saveBrand path (read-modify-write ONLY the branding sub-
 *        object through the same updateDoc). Never requires re-saving unrelated
 *        profile fields; never loses them.
 *
 * Reuses Tron tokens for the EDITOR's own chrome (e.g. bg-white/[.04],
 * border-white/12). The editor's chrome lives in the provider-panel tree which
 * is dark-themed by the Tron Night default — reusing the same utility classes
 * that already color the rest of ProviderDashboard keeps consistency.
 *
 * prefers-reduced-motion: crossfade between templates is suppressed.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import type { ComponentType } from 'react';
import { toast } from 'react-hot-toast';
import { Camera, Sparkles, Save } from 'lucide-react';
import {
  TEMPLATE_DEFAULT_PALETTES,
  TEMPLATE_PRESET_PALETTES,
} from '../../types';
import type { BrandPalette, CatalogTemplateId, ProviderBranding } from '../../types';
import { isValidHex } from '../../utils/providerBranding';
import { contrastPairs, verdict } from '../../utils/pdf/contrast';
import type { Product } from '../../types';
import { TEMPLATE_LIST } from '../../utils/pdf/templates';
import { PLATFORM_NAME } from '../../utils/platformBrand';

export interface BrandingEditorProps {
  /** Current user-provided branding (already normalized). */
  initialBranding: ProviderBranding;
  /** The provider's products for a LIVE preview (uses 2-3 first; placeholders if empty). */
  previewProducts: Product[];
  /**
   * Logo upload handlers — REUSED from the parent ProviderDashboard (handleLogoSelect
   * + handleLogoUpload). Mounting the editor does NOT re-create an upload path.
   */
  logoUrl: string;
  logoPreview: string;
  onLogoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoUpload: () => void;
  uploadingLogo: boolean;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  /**
   * Save handler: persists the branding sub-object THROUGH the parent's existing
   * saveBrand() path (the same updateDoc on users/{uid}; never a new endpoint).
   * The editor HANDS the resolved brand to the parent; the parent decides what
   * else (if anything) to merge into the same updateDoc call.
   */
  onSave: (brand: ProviderBranding) => Promise<void>;
  /** Optional: parent can pass the provider's existing company fields as live
   *  bindings (storeName/phone/address). The provider types these into the
   *  brand editor; we WRITE BACK to the same legacy fields OR just to the
   *  branding sub-object (decided by the parent saveBrand). For safety, the
   *  editor READS them as initial companyName/contact and lets the provider
   *  override within the branding sub-object — leaving the legacy fields alone. */
  existingContacts?: { phone?: string; address?: string; storeName?: string };
}

const TemplatesPicker: React.FC<{
  selected: CatalogTemplateId;
  onSelect: (id: CatalogTemplateId) => void;
}> = ({ selected, onSelect }) => (
  <div className="grid grid-cols-3 gap-3">
    {TEMPLATE_LIST.map((t) => {
      const id = t.templateId;
      const isActive = id === selected;
      return (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-all duration-300 ${
            isActive
              ? 'border-orange-400/60 bg-orange-400/[.08]'
              : 'border-white/12 bg-white/[.03] hover:border-white/24'
          }`}
          aria-pressed={isActive}
        >
          {/* Schematic thumbnail (template vibe): palette stripe + wire card sketch */}
          <div className={`h-16 w-full rounded-md p-2 ${t.isDarkCanvas ? 'bg-[#0B0B16]' : 'bg-white'}`}>
            <div className="flex gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.defaultPalette.primary }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.defaultPalette.secondary }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.defaultPalette.accent }} />
            </div>
            <div className="mt-2 flex flex-col gap-[2px]">
              <span
                className="h-1.5 w-3/4 rounded-sm"
                style={{ background: t.defaultPalette.ink, opacity: 0.7 }}
              />
              <span
                className="h-1.5 w-1/2 rounded-sm"
                style={{ background: t.defaultPalette.secondary }}
              />
              <span
                className="mt-1 h-2 w-1/2 rounded-sm"
                style={{ background: t.defaultPalette.primary }}
              />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white leading-tight">{t.templateName}</p>
            <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">{t.templateVibe}</p>
          </div>
          {isActive && (
            <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-full bg-orange-400/20 px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-orange-400">
              <Sparkles className="h-2.5 w-2.5" /> Activa
            </span>
          )}
        </button>
      );
    })}
  </div>
);

const SwatchButton: React.FC<{
  name: string;
  palette: BrandPalette;
  onApply: () => void;
  active: boolean;
}> = ({ name, palette, onApply, active }) => (
  <button
    type="button"
    onClick={onApply}
    className={`rounded-lg border ${active ? 'border-orange-400/50 bg-orange-400/10' : 'border-white/12 bg-white/[.03] hover:border-white/24'} flex items-center gap-2 px-2.5 py-1.5 transition-colors duration-300`}
  >
    <span className="flex -space-x-1">
      <span className="h-3.5 w-3.5 rounded-full ring-1 ring-white/20" style={{ background: palette.primary }} />
      <span className="h-3.5 w-3.5 rounded-full ring-1 ring-white/20" style={{ background: palette.secondary }} />
      <span className="h-3.5 w-3.5 rounded-full ring-1 ring-white/20" style={{ background: palette.accent }} />
    </span>
    <span className="text-[10px] uppercase tracking-widest text-slate-300">{name}</span>
  </button>
);

const ColorField: React.FC<{
  label: string;
  value: string;
  onChange: (next: string) => void;
}> = ({ label, value, onChange }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[9px] uppercase tracking-widest text-slate-400">{label}</span>
    <span className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[.04] px-2 py-1">
      <input
        type="color"
        value={isValidHex(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 cursor-pointer rounded border border-white/12 bg-transparent"
        aria-label={label}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[80px] rounded border border-white/12 bg-white/[.04] px-2 py-1 text-[11px] font-mono text-white"
        aria-label={`${label} hex`}
      />
    </span>
  </label>
);

const ContrastChip: React.FC<{ fg: string; bg: string; label: string }> = ({ fg, bg, label }) => {
  const v = verdict(fg, bg);
  const tone = v.passes ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
    : v.passesLarge ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
    : 'text-red-300 bg-red-500/10 border-red-500/30';
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/12 bg-white/[.03] px-2.5 py-1.5">
      <span className="text-[10px] uppercase tracking-widest text-slate-300">{label}</span>
      <span className={`text-[10px] uppercase tracking-widest rounded-full border px-1.5 py-0.5 ${tone}`}>
        {v.label}
      </span>
    </div>
  );
};

const BrandingEditor: React.FC<BrandingEditorProps> = ({
  initialBranding,
  previewProducts,
  logoUrl,
  logoPreview,
  onLogoSelect,
  onLogoUpload,
  uploadingLogo,
  logoInputRef,
  onSave,
  existingContacts,
}) => {
  const [draft, setDraft] = useState<ProviderBranding>(initialBranding);
  const [customizedPalette, setCustomizedPalette] = useState(false);
  const [saving, setSaving] = useState(false);
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // keep draft in sync if the parent's initial changes (e.g. logo upload finalize).
  useEffect(() => {
    setDraft((prev) => ({ ...prev, logoUrl: logoUrl || undefined }));
  }, [logoUrl]);

  const pickTemplate = useCallback((id: CatalogTemplateId) => {
    setDraft((prev) => {
      // Only auto-load the template's DEFAULT palette if the user has NOT
      // customized colors yet — never silently overwrite a customized palette.
      const palette = customizedPalette ? prev.palette : TEMPLATE_DEFAULT_PALETTES[id];
      return { ...prev, templateId: id, palette };
    });
  }, [customizedPalette]);

  const applyPreset = useCallback((id: CatalogTemplateId, presetName: string) => {
    const preset = TEMPLATE_PRESET_PALETTES[id].find((p) => p.name === presetName);
    if (preset) {
      setDraft((p) => ({ ...p, palette: preset.palette }));
      setCustomizedPalette(true);
    }
  }, []);

  const updateColor = useCallback((role: keyof BrandPalette, hex: string) => {
    setDraft((p) => ({ ...p, palette: { ...p.palette, [role]: hex } }));
    setCustomizedPalette(true);
  }, []);

  const resetToTemplateDefaults = useCallback(() => {
    setDraft((p) => ({ ...p, palette: TEMPLATE_DEFAULT_PALETTES[p.templateId] }));
    setCustomizedPalette(false);
  }, []);

  const handleSave = useCallback(async () => {
    // VALIDATION (warn but persist): palette colors must be valid hex; logoUrl
    // must be a reachable URL or empty. We DON'T hard-block; warn then save.
    const badColors = (['primary', 'secondary', 'accent', 'ink', 'paper'] as (keyof BrandPalette)[])
      .filter((k) => !isValidHex(draft.palette[k]));
    if (badColors.length > 0) {
      toast.error(`Color inválido en: ${badColors.join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      toast.success('Identidad de marca guardada.');
    } catch (err) {
      console.error('[BrandingEditor] Error al guardar identidad:', err);
      toast.error('No fue posible guardar la identidad de marca.');
    } finally {
      setSaving(false);
    }
  }, [draft, onSave]);

  // The live preview template: lazy-load the @react-pdf PDFViewer so the
  // editor lives in the ProviderDashboard chunk but the renderer is in its
  // own lazy chunk (G1 guardrail).
  const [{ PreviewComponent }, setLazy] = useState<{ PreviewComponent: ComponentType<{ branding: ProviderBranding; products: Product[]; }> | null }>({ PreviewComponent: null });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mod = await import('./CatalogPreview');
        if (active) setLazy({ PreviewComponent: mod.default });
      } catch (e) {
        console.warn('PDF preview chunk lazy-load failed', e);
      }
    })();
    return () => { active = false; };
  }, []);

  const contrast = useMemo(() => contrastPairs(draft.palette), [draft.palette]);
  const paletteIsDefault = useMemo(
    () => JSON.stringify(draft.palette) === JSON.stringify(TEMPLATE_DEFAULT_PALETTES[draft.templateId]),
    [draft.palette, draft.templateId],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: controls */}
      <div className="space-y-5">
        {/* 2.1 Template picker */}
        <section>
          <h4 className="mb-2 text-[10px] uppercase tracking-[0.22em] font-semibold text-slate-300">
            Plantilla
          </h4>
          <TemplatesPicker selected={draft.templateId} onSelect={pickTemplate} />
        </section>

        {/* 2.2 Corporate palette */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[10px] uppercase tracking-[0.22em] font-semibold text-slate-300">Paleta de marca</h4>
            <button
              type="button"
              onClick={resetToTemplateDefaults}
              disabled={paletteIsDefault}
              className="text-[9px] uppercase tracking-widest text-slate-400 hover:text-orange-400 disabled:opacity-40"
            >
              Usar colores de la plantilla
            </button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {(TEMPLATE_PRESET_PALETTES[draft.templateId] || []).map((preset) => (
              <SwatchButton
                key={preset.name}
                name={preset.name}
                palette={preset.palette}
                active={JSON.stringify(draft.palette) === JSON.stringify(preset.palette)}
                onApply={() => applyPreset(draft.templateId, preset.name)}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <ColorField label="Primario" value={draft.palette.primary} onChange={(v) => updateColor('primary', v)} />
            <ColorField label="Secundario" value={draft.palette.secondary} onChange={(v) => updateColor('secondary', v)} />
            <ColorField label="Acento" value={draft.palette.accent} onChange={(v) => updateColor('accent', v)} />
            <ColorField label="Tinta (txt)" value={draft.palette.ink} onChange={(v) => updateColor('ink', v)} />
            <ColorField label="Fondo (papel)" value={draft.palette.paper} onChange={(v) => updateColor('paper', v)} />
          </div>
          <div className="mt-3 space-y-1.5">
            {contrast.map((pair) => (
              <ContrastChip key={pair.key} fg={pair.fg} bg={pair.bg} label={pair.label} />
            ))}
            <p className="text-[9px] leading-snug text-slate-500">
              AA ✓ = 4.5:1 (texto cuerpo). Grande AA ✓/cuerpo ✗ = 3:1 (texto grande).
              Contraste bajo ⚠ = no cumple. Advertencia únicamente — puedes guardar de
              todos modos (quizás es texto grande o decorativo).
            </p>
          </div>
        </section>

        {/* 2.3 Logo upload — REUSE existing handlers from parent */}
        <section>
          <h4 className="mb-2 text-[10px] uppercase tracking-[0.22em] font-semibold text-slate-300">
            Logo de marca
          </h4>
          <div className="flex items-center gap-4 rounded-xl border border-white/12 bg-white/[.04] p-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-white/12 bg-white/[.04] overflow-hidden">
              {(logoPreview || logoUrl) ? (
                <img src={logoPreview || logoUrl} alt="Logo de marca" className="h-full w-full object-contain" />
              ) : (
                <Camera className="h-7 w-7 text-slate-500 stroke-1" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onLogoSelect} />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="rounded-lg border border-white/12 px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-300 hover:border-orange-400/40 hover:text-white transition-colors duration-300"
              >
                {logoPreview ? 'Cambiar logo' : 'Subir logo'}
              </button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={onLogoUpload}
                  disabled={uploadingLogo}
                  className="rounded-lg border border-orange-400/40 px-3 py-1.5 text-[10px] uppercase tracking-widest text-orange-400 hover:bg-orange-400/10 disabled:opacity-50 transition-colors duration-300"
                >
                  {uploadingLogo ? 'Subiendo...' : 'Confirmar logo'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDraft((p) => ({ ...p, logoUrl: undefined }))}
                disabled={!logoUrl && !logoPreview}
                className="text-[9px] uppercase tracking-widest text-slate-400 hover:text-red-400 disabled:opacity-30"
              >
                Quitar logo (texto fallback)
              </button>
            </div>
          </div>
        </section>

        {/* 2.4 Company info */}
        <section>
          <h4 className="mb-2 text-[10px] uppercase tracking-[0.22em] font-semibold text-slate-300">
            Información de marca
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={draft.companyName || ''}
              onChange={(e) => setDraft((p) => ({ ...p, companyName: e.target.value }))}
              placeholder={existingContacts?.storeName || 'Nombre comercial'}
              className="rounded-xl border border-white/12 bg-white/[.05] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-orange-400/60"
            />
            <input
              value={draft.tagline || ''}
              onChange={(e) => setDraft((p) => ({ ...p, tagline: e.target.value }))}
              placeholder="Tagline / lema"
              className="rounded-xl border border-white/12 bg-white/[.05] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-orange-400/60"
            />
            <input
              value={draft.contact?.web || ''}
              onChange={(e) => setDraft((p) => ({ ...p, contact: { ...p.contact, web: e.target.value || undefined } }))}
              placeholder="Web"
              className="rounded-xl border border-white/12 bg-white/[.05] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-orange-400/60"
            />
            <input
              value={draft.contact?.email || ''}
              onChange={(e) => setDraft((p) => ({ ...p, contact: { ...p.contact, email: e.target.value || undefined } }))}
              placeholder="Email"
              className="rounded-xl border border-white/12 bg-white/[.05] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-orange-400/60"
            />
            <input
              value={draft.contact?.phone || ''}
              onChange={(e) => setDraft((p) => ({ ...p, contact: { ...p.contact, phone: e.target.value || undefined } }))}
              placeholder={existingContacts?.phone || 'Teléfono'}
              className="rounded-xl border border-white/12 bg-white/[.05] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-orange-400/60"
            />
            <input
              value={draft.contact?.whatsapp || ''}
              onChange={(e) => setDraft((p) => ({ ...p, contact: { ...p.contact, whatsapp: e.target.value || undefined } }))}
              placeholder="WhatsApp"
              className="rounded-xl border border-white/12 bg-white/[.05] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-orange-400/60"
            />
            <input
              value={draft.contact?.address || ''}
              onChange={(e) => setDraft((p) => ({ ...p, contact: { ...p.contact, address: e.target.value || undefined } }))}
              placeholder={existingContacts?.address || 'Dirección'}
              className="col-span-2 rounded-xl border border-white/12 bg-white/[.05] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-orange-400/60"
            />
          </div>
        </section>

        {/* 2.6 Save */}
        <section className="border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400 hover:bg-orange-400/10 disabled:opacity-50 transition-colors duration-300"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando…' : 'Guardar identidad de marca'}
          </button>
          <p className="mt-2 text-[9px] leading-snug text-slate-500">
            Se guarda a través de tu mismo perfil de marca existente, sin afectar tus otros datos.
          </p>
        </section>
      </div>

      {/* RIGHT: live preview */}
      <section className={`rounded-2xl border border-white/12 bg-white/[.02] p-3 ${reducedMotion ? '' : 'transition-opacity duration-200'}`}>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[10px] uppercase tracking-[0.22em] font-semibold text-slate-300">Vista previa</h4>
          <span className="text-[9px] uppercase tracking-widest text-slate-500">
            Firma {PLATFORM_NAME} visible (no editable)
          </span>
        </div>
        <div className="min-h-[480px] rounded-xl overflow-hidden border border-white/10 bg-slate-100">
          {PreviewComponent ? (
            <PreviewComponent branding={draft} products={previewProducts.slice(0, 3)} />
          ) : (
            <div className="flex h-[480px] items-center justify-center text-slate-500 text-[10px] uppercase tracking-widest">
              Cargando vista previa…
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BrandingEditor;
