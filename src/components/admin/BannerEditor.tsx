/* =================================================================
   BannerEditor — admin editor for homepage hero banners.
   Banner slice.

   Scope: presentation-mode, overlay text + scrim, CTA builder (label +
   destination), image-click toggle, live preview, and the existing
   active-banners list. Persists to Firestore 'heroSlides' collection
   (additive fields stored next to legacy fields; old rows normalize on
   read).

   Backward compatibility:
     - Editing a legacy banner loads via normalizeBanner so old title/
       description/link populate the new controls (overlay mode + custom
       CTA with the legacy href). Saving it unchanged produces the same
       visible banner. No stored-row migration is required.
     - Existing active-banners list behavior + ordering logic is
       preserved (move up/down, edit, delete).
     - The desktop image upload is required, as today.

   Reuse (no FORBIDDEN imports):
     - useProducts() hook (HOOK_PURE_AND_FULL_LIST, branch A) consumes
       allProducts + categories only; never filteredProducts/filters.
     - Existing product route via the pure productPath() helper in model.
     - firebaseConfig db/storage + react-hot-toast re-imported.

   QA bucket:
     - Manual verification evidence attached to the PR. No test runner is
       introduced in this feature (per spec resolution). TODO(tron-tests)
       in banner/model.ts lists the future automated coverage.
   ================================================================== */
import React, { useEffect, useMemo, useState } from 'react';
import {
  collection, getDocs, updateDoc, deleteDoc, addDoc, doc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { toast } from 'react-hot-toast';
import { ChevronUp, ChevronDown, Edit, Trash, Monitor, Smartphone, MousePointerClick } from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';

import {
  normalizeBanner,
  validateBannerDraft,
  hasValidationErrors,
  CATALOG_ANCHOR,
  categoryName,
  type Banner,
  type BannerCta,
  type BannerImageClick,
  type BannerDestination,
  type PresentationMode,
  type TextAlign,
  type TextPosition,
  type Scrim,
} from './banner/model';
import DestinationPicker from './banner/DestinationPicker';
import BannerSlide from './banner/BannerSlide';

interface BannerRow {
  id: string;
  title?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
  image?: string;
  mobileImage?: string;
  order?: number;
  // New additive fields may already be present on new banners.
  presentationMode?: PresentationMode;
  imageAlt?: string;
  overlay?: {
    title?: string;
    description?: string;
    textAlign?: TextAlign;
    textPosition?: TextPosition;
    scrim?: Scrim;
  };
  cta?: Partial<BannerCta> & { enabled?: boolean };
  imageClick?: Partial<BannerImageClick> & { enabled?: boolean };
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// helpers to seed the form draft from a (raw) banner row
// ---------------------------------------------------------------------------
const BannerEditor: React.FC = () => {
  // ---- products + categories (single useProducts mount; read-only) ----
  const { allProducts, categories } = useProducts();

  // ---- active banners list ----
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  // ---- form draft ----
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerDescription, setBannerDescription] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [presentationMode, setPresentationMode] = useState<PresentationMode>('overlay');
  const [overlayAlign, setOverlayAlign] = useState<TextAlign>('left');
  const [overlayPosition, setOverlayPosition] = useState<TextPosition>('center');
  const [overlayScrim, setOverlayScrim] = useState<Scrim>('auto');
  const [ctaEnabled, setCtaEnabled] = useState(true);
  const [ctaLabel, setCtaLabel] = useState('Ver más');
  const [ctaOpenNewTab, setCtaOpenNewTab] = useState(false);
  const [ctaDestination, setCtaDestination] = useState<BannerDestination>({
    linkType: 'custom',
    href: CATALOG_ANCHOR,
  });
  const [imageClickEnabled, setImageClickEnabled] = useState(false);
  const [imageClickDestination, setImageClickDestination] = useState<BannerDestination>({
    linkType: 'custom',
    href: CATALOG_ANCHOR,
  });
  const [floatingCorner, setFloatingCorner] = useState<'tl' | 'tr' | 'bl' | 'br'>('br');

  // ---- uploads (existing + new File) ----
  const [existingBannerImage, setExistingBannerImage] = useState('');
  const [existingBannerMobileImage, setExistingBannerMobileImage] = useState('');
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerMobileImage, setBannerMobileImage] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewMobileUrl, setPreviewMobileUrl] = useState('');

  // ---- meta ----
  const [savingBanner, setSavingBanner] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // --------------------------------------------------------------------
  const fetchBanners = async () => {
    const snapshot = await getDocs(collection(db, 'heroSlides'));
    setBanners(
      snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as BannerRow)
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    );
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Build a preview `Banner` object from the live draft + uploaded urls.
  // The desktop image in preview = newly uploaded file (object URL) if any,
  // else existing image. Same for mobile.
  useEffect(() => {
    if (bannerImage) {
      const url = URL.createObjectURL(bannerImage);
      setPreviewImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewImageUrl(existingBannerImage);
    }
  }, [bannerImage, existingBannerImage]);
  useEffect(() => {
    if (bannerMobileImage) {
      const url = URL.createObjectURL(bannerMobileImage);
      setPreviewMobileUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewMobileUrl(existingBannerMobileImage);
    }
  }, [bannerMobileImage, existingBannerMobileImage]);

  const previewBanner = useMemo<Banner>(() => {
    const normalized = normalizeBanner({
      id: editingBannerId || 'preview',
      title: bannerTitle,
      description: bannerDescription,
      image: previewImageUrl,
      mobileImage: previewMobileUrl,
      ctaLabel,
      ctaHref: ctaDestination.linkType === 'custom' ? ctaDestination.href : '',
      presentationMode,
      imageAlt,
      overlay: {
        title: bannerTitle,
        description: bannerDescription,
        textAlign: overlayAlign,
        textPosition: overlayPosition,
        scrim: overlayScrim,
      },
      cta: {
        enabled: ctaEnabled,
        label: ctaLabel,
        linkType: ctaDestination.linkType,
        productId: ctaDestination.productId,
        categoryId: ctaDestination.categoryId,
        href: ctaDestination.href,
        openInNewTab: ctaOpenNewTab,
      },
      imageClick: {
        enabled: imageClickEnabled,
        linkType: imageClickDestination.linkType,
        productId: imageClickDestination.productId,
        categoryId: imageClickDestination.categoryId,
        href: imageClickDestination.href,
      },
    });
    return normalized;
  }, [editingBannerId, bannerTitle, bannerDescription, previewImageUrl, previewMobileUrl,
      ctaLabel, ctaDestination, presentationMode, imageAlt, overlayAlign, overlayPosition,
      overlayScrim, ctaEnabled, ctaOpenNewTab, imageClickEnabled, imageClickDestination]);

  // --------------------------------------------------------------------
  const loadBannerIntoForm = (row: BannerRow) => {
    const normalized = normalizeBanner(row);
    setBannerTitle(normalized.overlay?.title || row.title || '');
    setBannerDescription(normalized.overlay?.description || row.description || '');
    setImageAlt(normalized.imageAlt || '');
    setPresentationMode(normalized.presentationMode || 'overlay');
    setOverlayAlign(normalized.overlay?.textAlign || 'left');
    setOverlayPosition(normalized.overlay?.textPosition || 'center');
    setOverlayScrim(normalized.overlay?.scrim || 'auto');
    setCtaEnabled(Boolean(normalized.cta?.enabled));
    setCtaLabel(normalized.cta?.label || 'Ver más');
    setCtaOpenNewTab(Boolean(normalized.cta?.openInNewTab));
    setCtaDestination({
      linkType: normalized.cta?.linkType || 'custom',
      productId: normalized.cta?.productId,
      categoryId: normalized.cta?.categoryId,
      href: normalized.cta?.href,
    });
    setImageClickEnabled(Boolean(normalized.imageClick?.enabled));
    setImageClickDestination({
      linkType: normalized.imageClick?.linkType || 'custom',
      productId: normalized.imageClick?.productId,
      categoryId: normalized.imageClick?.categoryId,
      href: normalized.imageClick?.href,
    });
    setFloatingCorner('br');
    setExistingBannerImage(row.image || '');
    setExistingBannerMobileImage(row.mobileImage || '');
    setBannerImage(null);
    setBannerMobileImage(null);
    setValidationErrors({});
  };

  const resetForm = () => {
    setEditingBannerId(null);
    setBannerTitle('');
    setBannerDescription('');
    setImageAlt('');
    setPresentationMode('overlay');
    setOverlayAlign('left');
    setOverlayPosition('center');
    setOverlayScrim('auto');
    setCtaEnabled(true);
    setCtaLabel('Ver más');
    setCtaOpenNewTab(false);
    setCtaDestination({ linkType: 'custom', href: CATALOG_ANCHOR });
    setImageClickEnabled(false);
    setImageClickDestination({ linkType: 'custom', href: CATALOG_ANCHOR });
    setFloatingCorner('br');
    setExistingBannerImage('');
    setExistingBannerMobileImage('');
    setBannerImage(null);
    setBannerMobileImage(null);
    setValidationErrors({});
  };

  // --------------------------------------------------------------------
  const moveBanner = async (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= banners.length) return;
    const ordered = [...banners];
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    await Promise.all(
      ordered.map((item, position) => updateDoc(doc(db, 'heroSlides', item.id), { order: position })),
    );
    fetchBanners();
  };

  // --------------------------------------------------------------------
  const handleCreateBanner = async (event: React.FormEvent) => {
    event.preventDefault();
    // VALIDATION (only in the banner form, on save)
    const errors = validateBannerDraft({
      hasDesktopImage: Boolean(existingBannerImage) || Boolean(bannerImage),
      cta:
        ctaEnabled
          ? { enabled: true, label: ctaLabel, ...ctaDestination }
          : null,
      imageClick:
        imageClickEnabled
          ? { enabled: true, ...imageClickDestination }
          : null,
    });
    if (hasValidationErrors(errors)) {
      setValidationErrors(errors as Record<string, string>);
      toast.error('Revisa los campos marcados.');
      return;
    }
    setValidationErrors({});
    setSavingBanner(true);
    try {
      let image = existingBannerImage || '';
      let mobileImage = existingBannerMobileImage || '';
      let uploadWarnings = 0;

      if (bannerImage) {
        try {
          const upload = await uploadBytes(
            ref(storage, `heroSlides/${Date.now()}_${bannerImage.name}`),
            bannerImage,
          );
          image = await getDownloadURL(upload.ref);
        } catch (uploadError: any) {
          console.error('Storage upload error (desktop):', uploadError?.code || uploadError);
          uploadWarnings++;
          const code = String(uploadError?.code || '');
          if (code.includes('unauthorized') || code.includes('permission'))
            toast.error('Permiso de Storage denegado para banner de escritorio.');
          else if (code.includes('cors'))
            toast.error('CORS de Storage bloqueando el banner de escritorio.');
          else toast.error('No fue posible subir el banner de escritorio.');
        }
      }
      if (bannerMobileImage) {
        try {
          const upload = await uploadBytes(
            ref(storage, `heroSlides/mobile_${Date.now()}_${bannerMobileImage.name}`),
            bannerMobileImage,
          );
          mobileImage = await getDownloadURL(upload.ref);
        } catch (uploadError: any) {
          console.error('Storage upload error (mobile):', uploadError?.code || uploadError);
          uploadWarnings++;
          const code = String(uploadError?.code || '');
          if (code.includes('unauthorized') || code.includes('permission'))
            toast.error('Permiso de Storage denegado para banner móvil.');
          else if (code.includes('cors'))
            toast.error('CORS de Storage bloqueando el banner móvil.');
          else toast.error('No fue posible subir el banner móvil.');
        }
      }

      if (!image && !mobileImage) {
        toast.error('No se pudo guardar el banner: sin imagen de portada. Revisa Storage.');
        setSavingBanner(false);
        return;
      }

      // Persisted data is ADDITIVE: legacy fields stay (so old readers
      // keep working) + new fields stored next to them. The old `ctaHref`
      // is mirrored from cta.dest.href for the 'custom' linkType to keep
      // the existing HeroCarousel reader happy until Commit 3 lands.
      const ctaHrefMirror = ctaDestination.linkType === 'custom' ? (ctaDestination.href || CATALOG_ANCHOR) : CATALOG_ANCHOR;

      const bannerData: Record<string, any> = {
        // LEGACY (kept)
        title: bannerTitle,
        description: bannerDescription,
        ctaLabel: ctaEnabled ? ctaLabel : '',
        ctaHref: ctaHrefMirror,
        image,
        mobileImage,
        active: true,
        // NEW
        presentationMode,
        imageAlt,
        overlay: {
          title: bannerTitle,
          description: bannerDescription,
          textAlign: overlayAlign,
          textPosition: overlayPosition,
          scrim: overlayScrim,
        },
        cta: {
          enabled: ctaEnabled,
          label: ctaEnabled ? ctaLabel : '',
          linkType: ctaDestination.linkType,
          ...(ctaDestination.productId ? { productId: ctaDestination.productId } : null),
          ...(ctaDestination.categoryId ? { categoryId: ctaDestination.categoryId } : null),
          href: ctaHrefMirror,
          openInNewTab: ctaOpenNewTab,
        },
        imageClick: {
          enabled: imageClickEnabled,
          linkType: imageClickDestination.linkType,
          ...(imageClickDestination.productId ? { productId: imageClickDestination.productId } : null),
          ...(imageClickDestination.categoryId ? { categoryId: imageClickDestination.categoryId } : null),
          href: imageClickEnabled && imageClickDestination.linkType === 'custom'
            ? (imageClickDestination.href || CATALOG_ANCHOR)
            : CATALOG_ANCHOR,
        },
      };

      if (editingBannerId) {
        await updateDoc(doc(db, 'heroSlides', editingBannerId), bannerData);
        if (uploadWarnings > 0)
          toast('Banner actualizado, pero algunas imágenes fallaron al subir.', { icon: '⚠️' });
        else toast.success('Banner actualizado.');
      } else {
        await addDoc(collection(db, 'heroSlides'), {
          ...bannerData,
          order: Date.now(),
          createdAt: new Date().toISOString(),
        });
        if (uploadWarnings > 0)
          toast('Banner publicado, pero algunas imágenes fallaron al subir.', { icon: '⚠️' });
        else toast.success('Banner publicado en el carrusel.');
      }

      resetForm();
      fetchBanners();
    } catch (error: any) {
      console.error(error);
      toast.error('No fue posible guardar el banner: ' + (error?.message || String(error)));
    } finally {
      setSavingBanner(false);
    }
  };

  // =====================================================================
  return (
    <div className="max-w-6xl bg-white border border-luxury-silver p-6 shadow-luxury">
      <h3 className="font-montserrat text-lg font-light text-luxury-black">
        {editingBannerId ? 'Editar Banner Principal' : 'Nuevo banner principal'}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        Al publicar, aparecerá automáticamente en el carrusel de inicio. La imagen se
        optimiza desde Storage y el botón puede llevar al catálogo o a una promoción.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ===================== CONTROLS (LEFT) ===================== */}
        <form onSubmit={handleCreateBanner} className="space-y-5">

          {/* 2.1 — PRESENTATION MODE */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Modo de presentación
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {(['overlay', 'full'] as PresentationMode[]).map((mode) => {
                const selected = presentationMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPresentationMode(mode)}
                    aria-pressed={selected}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${
                      selected
                        ? 'border-[var(--accent-violet)] bg-[var(--accent-violet-soft)]'
                        : 'border-luxury-silver bg-luxury-off-white hover:bg-white'
                    }`}
                  >
                    {/* tiny schematic thumbnail */}
                    <span
                      aria-hidden="true"
                      className={`relative block h-14 w-full overflow-hidden rounded-md border border-luxury-silver ${
                        mode === 'overlay' ? 'bg-gradient-to-r from-black/70 to-black/10' : 'bg-transparent'
                      }`}
                    >
                      {mode === 'overlay' ? (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-left text-[8px] uppercase text-white">
                          texto
                        </span>
                      ) : (
                        <span className="absolute right-2 bottom-2 rounded-full bg-black/55 px-2 py-[2px] text-[7px] uppercase text-white">
                          botón
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-luxury-black">
                      {mode === 'overlay' ? 'Imagen con texto' : 'Imagen completa'}
                    </span>
                  </button>
                );
              })}
            </div>
            {presentationMode === 'full' && (
              <p className="text-xs text-gray-500">
                El texto no se mostrará; la imagen se ve completa. El botón sigue disponible.
              </p>
            )}
          </fieldset>

          {/* 2.2 — OVERLAY TEXT (enabled only in overlay mode) */}
          <fieldset
            className={`space-y-3 ${presentationMode === 'full' ? 'pointer-events-none opacity-40' : ''}`}
            disabled={presentationMode === 'full'}
          >
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Texto (sobre la imagen)
            </legend>
            <input
              required={presentationMode === 'overlay'}
              value={bannerTitle}
              onChange={(e) => setBannerTitle(e.target.value)}
              placeholder="Título de la promoción"
              className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black"
            />
            <textarea
              required={presentationMode === 'overlay'}
              value={bannerDescription}
              onChange={(e) => setBannerDescription(e.target.value)}
              placeholder="Descripción breve"
              rows={3}
              className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black"
            />

            {/* alignment segmented control */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-gray-500">Alineación:</span>
              <SegmentedControl
                value={overlayAlign}
                onChange={(v) => setOverlayAlign(v as TextAlign)}
                options={[
                  { key: 'left', label: 'Izquierda' },
                  { key: 'center', label: 'Centro' },
                  { key: 'right', label: 'Derecha' },
                ]}
              />
            </div>

            {/* vertical position segmented control */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-gray-500">Posición vertical:</span>
              <SegmentedControl
                value={overlayPosition}
                onChange={(v) => setOverlayPosition(v as TextPosition)}
                options={[
                  { key: 'top', label: 'Arriba' },
                  { key: 'center', label: 'Centro' },
                  { key: 'bottom', label: 'Abajo' },
                ]}
              />
            </div>

            {/* scrim toggle */}
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={overlayScrim === 'auto'}
                onChange={(e) => setOverlayScrim(e.target.checked ? 'auto' : 'none')}
              />
              Oscurecer detrás del texto (auto) — legible en cualquier foto
            </label>
          </fieldset>

          {/* image alt (accessibility; defaults to title) */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">
              Texto alternativo de la imagen (accesibilidad; por defecto = título)
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder={bannerTitle || 'Texto ALT de la imagen'}
                className="mt-1 w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black"
              />
            </label>
          </div>

          {/* 2.3 — CTA / BUTTON BUILDER (available in BOTH modes) */}
          <fieldset className="space-y-3 rounded-xl border border-luxury-silver p-3">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Botón (CTA)
            </legend>
            <label className="flex items-center gap-2 text-sm text-luxury-black">
              <input
                type="checkbox"
                checked={ctaEnabled}
                onChange={(e) => setCtaEnabled(e.target.checked)}
              />
              Mostrar botón
            </label>

            {ctaEnabled && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">
                    Etiqueta del botón
                    <input
                      type="text"
                      value={ctaLabel}
                      onChange={(e) => setCtaLabel(e.target.value)}
                      placeholder="Ver más"
                      className={`mt-1 w-full rounded border bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black ${
                        validationErrors.ctaLabel ? 'border-red-400' : 'border-luxury-silver'
                      }`}
                    />
                  </label>
                  {validationErrors.ctaLabel && (
                    <p className="text-xs text-red-500">{validationErrors.ctaLabel}</p>
                  )}
                </div>

                <DestinationPicker
                  value={ctaDestination}
                  onChange={setCtaDestination}
                  allProducts={allProducts}
                  categories={categories}
                />
                {validationErrors.ctaDestination && (
                  <p className="text-xs text-red-500">{validationErrors.ctaDestination}</p>
                )}

                <label className="flex items-center gap-2 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={ctaOpenNewTab}
                    onChange={(e) => setCtaOpenNewTab(e.target.checked)}
                  />
                  Abrir en pestaña nueva
                </label>

                {presentationMode === 'full' && (
                  <div className="space-y-2">
                    <span className="text-xs text-gray-500">Esquina del botón flotante:</span>
                    <SegmentedControl
                      value={floatingCorner}
                      onChange={(v) => setFloatingCorner(v as 'tl' | 'tr' | 'bl' | 'br')}
                      options={[
                        { key: 'tl', label: '↖' },
                        { key: 'tr', label: '↗' },
                        { key: 'bl', label: '↙' },
                        { key: 'br', label: '↘' },
                      ]}
                    />
                  </div>
                )}
              </div>
            )}
          </fieldset>

          {/* image-click toggle */}
          <fieldset className="space-y-3 rounded-xl border border-luxury-silver p-3">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-500 flex items-center gap-1">
              <MousePointerClick className="h-3 w-3" /> Hacer toda la imagen clicable
            </legend>
            <label className="flex items-center gap-2 text-sm text-luxury-black">
              <input
                type="checkbox"
                checked={imageClickEnabled}
                onChange={(e) => setImageClickEnabled(e.target.checked)}
              />
              Activar clic en la imagen completa (sin botón propio)
            </label>
            {imageClickEnabled && (
              <div className="space-y-2">
                <DestinationPicker
                  value={imageClickDestination}
                  onChange={setImageClickDestination}
                  allProducts={allProducts}
                  categories={categories}
                />
                {validationErrors.imageClickDestination && (
                  <p className="text-xs text-red-500">{validationErrors.imageClickDestination}</p>
                )}
              </div>
            )}
          </fieldset>

          {/* ===== existing image uploads (kept AS-IS) ===== */}
          {existingBannerImage && (
            <div className="text-xs text-gray-500 space-y-2">
              <p>Imagen Escritorio actual:</p>
              <img src={existingBannerImage} alt="" className="h-20 w-36 object-cover border border-luxury-silver" />
            </div>
          )}
          {existingBannerMobileImage && (
            <div className="text-xs text-gray-500 space-y-2">
              <p>Imagen Móvil actual:</p>
              <img src={existingBannerMobileImage} alt="" className="h-20 w-16 object-cover border border-luxury-silver" />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-gray-500">
              Escritorio — recomendado 1920 × 700 px
              {validationErrors.desktopImage && (
                <span className="ml-2 text-red-500">{validationErrors.desktopImage}</span>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setBannerImage(e.target.files?.[0] || null)}
                className="mt-2 block w-full text-xs"
              />
            </label>
            <label className="text-xs text-gray-500">
              Móvil — recomendado 750 × 900 px
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setBannerMobileImage(e.target.files?.[0] || null)}
                className="mt-2 block w-full text-xs"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              disabled={savingBanner}
              className="border border-luxury-gold bg-luxury-black px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-white disabled:opacity-50"
            >
              {savingBanner ? 'Guardando...' : editingBannerId ? 'Actualizar banner' : 'Publicar banner'}
            </button>
            {editingBannerId && (
              <button
                type="button"
                onClick={resetForm}
                className="border border-gray-300 px-5 py-2.5 text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        {/* ===================== LIVE PREVIEW (RIGHT) ===================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Vista previa
            </h4>
            <div
              className="inline-flex rounded-[var(--radius-field)] border border-luxury-silver p-1"
              role="tablist"
              aria-label="Dispositivo de vista previa"
            >
              <button
                type="button"
                role="tab"
                aria-selected={previewDevice === 'desktop'}
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-1 rounded-[calc(var(--radius-field)-2px)] px-2 py-1 text-xs uppercase tracking-widest ${
                  previewDevice === 'desktop'
                    ? 'bg-[linear-gradient(135deg,var(--cta-from),var(--cta-to))] text-white'
                    : 'text-luxury-black hover:bg-luxury-off-white'
                }`}
              >
                <Monitor className="h-3 w-3" /> Escritorio
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewDevice === 'mobile'}
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-1 rounded-[calc(var(--radius-field)-2px)] px-2 py-1 text-xs uppercase tracking-widest ${
                  previewDevice === 'mobile'
                    ? 'bg-[linear-gradient(135deg,var(--cta-from),var(--cta-to))] text-white'
                    : 'text-luxury-black hover:bg-luxury-off-white'
                }`}
              >
                <Smartphone className="h-3 w-3" /> Móvil
              </button>
            </div>
          </div>

          <PreviewFrame device={previewDevice}>
            <BannerSlide
              banner={previewBanner}
              view="preview"
              floatingCorner={floatingCorner}
              categories={categories}
              products={allProducts}
            />
          </PreviewFrame>

          {/* ===== persistent honest destination line (Q3 pattern) ===== */}
          {(() => {
            const dest = ctaDestination;
            const enabled = ctaEnabled;
            if (!enabled) {
              return (
                <p className="text-xs text-gray-500">
                  Botón desactivado. Al publicar, el banner omite el botón.
                </p>
              );
            }
            if (dest.linkType === 'product') {
              const p = allProducts.find((x) => x.id === dest.productId);
              const destLabel = p
                ? `Ficha: ${p.name}`
                : 'Ficha de producto (selecciona uno)';
              return (
                <p className="text-xs text-gray-500">
                  Destino del botón: <span className="text-luxury-black">{destLabel}</span>.
                </p>
              );
            }
            if (dest.linkType === 'category') {
              const name = dest.categoryId && dest.categoryId !== '__catalog__'
                ? categoryName(dest.categoryId, categories)
                : undefined;
              const destLabel = name ? `#catálogo (+ filtro ‘${name}’)` : '#catálogo';
              return (
                <p className="text-xs text-gray-500">
                  Destino del botón: <span className="text-luxury-black">{destLabel}</span>.
                </p>
              );
            }
            const destLabel = dest.href || '(sin enlace)';
            return (
              <p className="text-xs text-gray-500">
                Destino del botón: <span className="text-luxury-black">{destLabel}</span>.
              </p>
            );
          })()}

          <p className="text-xs text-gray-500">
            En la vista previa el botón no navega (para no salir del editor); al publicar,
            llevará al destino indicado arriba.
          </p>
        </div>
      </div>

      {/* ===================== ACTIVE BANNERS (UNCHANGED) ===================== */}
      <div className="mt-8 border-t border-luxury-silver pt-5">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Banners activos</h4>
        <div className="mt-4 space-y-3">
          {banners.map((banner, index) => (
            <div key={banner.id} className="flex items-center gap-3 rounded-xl border border-luxury-silver p-3">
              <span className="text-xs text-orange-400">#{index + 1}</span>
              {banner.image && <img src={banner.image} alt="" className="h-12 w-20 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-luxury-black truncate">{banner.title}</p>
                {banner.description && <p className="text-xs text-gray-400 truncate">{banner.description}</p>}
              </div>
              <button onClick={() => moveBanner(index, -1)} disabled={index === 0} className="text-slate-400 disabled:opacity-30">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button onClick={() => moveBanner(index, 1)} disabled={index === banners.length - 1} className="text-slate-400 disabled:opacity-30">
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setEditingBannerId(banner.id);
                  loadBannerIntoForm(banner);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-orange-300 hover:text-orange-500 transition-colors"
                title="Editar Banner"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('¿Eliminar este banner?')) {
                    await deleteDoc(doc(db, 'heroSlides', banner.id));
                    if (editingBannerId === banner.id) resetForm();
                    fetchBanners();
                    toast.success('Banner eliminado.');
                  }
                }}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
const SegmentedControl: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <div
    className="inline-flex rounded-[var(--radius-field)] border border-luxury-silver p-1"
    role="radiogroup"
  >
    {options.map((opt) => {
      const selected = value === opt.key;
      return (
        <button
          key={opt.key}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(opt.key)}
          className={`rounded-[calc(var(--radius-field)-2px)] px-3 py-1 text-xs uppercase tracking-widest transition-colors ${
            selected
              ? 'bg-[linear-gradient(135deg,var(--cta-from),var(--cta-to))] text-white'
              : 'text-luxury-black hover:bg-luxury-off-white'
          }`}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const PreviewFrame: React.FC<{
  device: 'desktop' | 'mobile';
  children: React.ReactNode;
}> = ({ device, children }) => {
  const aspect =
    device === 'desktop'
      ? 'aspect-[1920/700]'
      : 'aspect-[750/900] max-w-[300px] mx-auto';
  return (
    <div
      className={`relative w-full overflow-hidden rounded-[var(--radius-card)] border border-luxury-silver bg-[#12091c] ${aspect}`}
    >
      {/* Placeholder when no image yet: tasteful brand-style hint. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
        <span className="px-6 text-[10px] uppercase tracking-[0.25em] text-white/50">
          Sube una imagen para ver la vista previa
        </span>
      </div>
      {/* slide content layered on top */}
      <div className="absolute inset-0">{children}</div>
    </div>
  );
};

export default BannerEditor;
