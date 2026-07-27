/* =================================================================
   BannerSlide — the shared render of ONE banner, used by:
     - the live preview in the editor (view="preview"), and
     - the homepage carousel slide (view="carousel").
   Banner slice.

   PATCH (banner CTA 2-bug):
     FIX A (visual) — the CTA button now renders via <BannerCtaButton>,
       which REUSES the platform gradient tokens (--cta-from/--cta-to)
       and the Tron --ring-focus token. No more grey/black backing
       (the previous bg-black/55 floating pill + the grey-area fallback
       in preview are gone). One shared component => the preview and
       the carousel paint the EXACT same button, in both modes
       (overlay + floating) and BOTH themes (the tokens swap per theme).
     FIX B (link) — links are de-nested: the image-link and the CTA
       link are SIBLINGS (the CTA sits on top via z-index), never
       <a> inside <a>. The CTA calls stopPropagation so a click never
       bubbles. The CTA is a REAL <Link> (carousel) with the resolved
       href built via resolveDestinationHref (the existing route
       generators — productPath, #catalogo, custom href). Preview
       renders a non-navigating <button> that gives honest transient
       feedback instead, so editing never yanks the admin out.

   Backward compatibility:
     A normalized legacy banner (overlay, scrim 'auto', textAlign
     'left', textPosition 'center', cta linkType 'custom' href=#catalogo)
     renders with the SAME scrim gradient and text block as today; only
     the CTA's color changes from the legacy btn-glass-primary also-a-
     gradient button to the BannerCtaButton (the intended fix; the
     visual was already a gradient before — the bug was the grey plate
     appearing in some contexts and the dead link — both fixed here).
   ================================================================== */
import React, { useMemo, useState } from 'react';
import type { Banner } from './model';
import { resolveDestinationHref, categoryName } from './model';
import { Link } from 'react-router-dom';
import BannerCtaButton from './BannerCtaButton';

export type BannerSlideView = 'carousel' | 'preview';

interface BannerSlideProps {
  banner: Banner;
  view?: BannerSlideView;
  index?: number;
  active?: boolean;
  floatingCorner?: 'tl' | 'tr' | 'bl' | 'br';
  // preview-only: categories/products so the simulated click feedback
  // can name the destination honestly. Optional in carousel too.
  categories?: string[];
  products?: { id: string; name: string }[];
}

const SCRIM_LEGACY =
  'bg-gradient-to-r from-[#0a0312]/95 via-[#0a0312]/65 to-[#0a0312]/25';
const SCRIM_NONE = 'bg-transparent';

const ALIGN_CLASS: Record<'left' | 'center' | 'right', string> = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
};
const POSITION_CLASS: Record<'top' | 'center' | 'bottom', string> = {
  top: 'justify-start pt-12',
  center: 'justify-center',
  bottom: 'justify-end pb-12',
};

const BannerSlide: React.FC<BannerSlideProps> = (props) => {
  const { banner, view = 'carousel', index = 0, active = true, floatingCorner = 'br', categories, products } = props;
  const overlay = banner.overlay;
  const cta = banner.cta;
  const imageClick = banner.imageClick;
  const mode = banner.presentationMode || 'overlay';

  const altText = banner.imageAlt || overlay?.title || '';
  const scrimClass = overlay?.scrim === 'none' ? SCRIM_NONE : SCRIM_LEGACY;
  const textAlign = overlay?.textAlign || 'left';
  const textPosition = overlay?.textPosition || 'center';
  const title = overlay?.title ?? banner.title ?? '';
  const description = overlay?.description ?? banner.description ?? '';

  const ctaHref = useMemo(() => resolveDestinationHref(cta), [cta]);
  const imageHref = useMemo(() => resolveDestinationHref(imageClick), [imageClick]);

  // DEFEND AT RENDER: validation already blocks saving a product CTA with
  // no productId, but ensure render-time safety too. If cta is enabled but
  // href is unresolvable (raw id or empty), do NOT render a dead link.
  const ctaVisible = Boolean(cta?.enabled && ctaHref && ctaHref.length > 0);
  const ctaLinkHref = ctaHref || '#catalogo';
  const ctaLabel = cta?.label || 'Ver más';

  const imageLinkAria =
    imageClick?.linkType === 'product'
      ? 'Ir al producto destacado'
      : imageHref === '#catalogo'
        ? 'Ir al catálogo'
        : 'Ir al enlace';

  // image-link target is only rendered when imageClick.enabled AND href
  // resolves. If ctaVisible too: the image-link + CTA are siblings (NOT
  // nested). The CTA sits ABOVE the image-link via z-index and stops the
  // click bubble so a click on the button never triggers the image link.
  const imageLinkVisible = Boolean(imageClick?.enabled && imageHref);

  // ---- preview transient feedback (honest, simulated) ----
  const [previewToast, setPreviewToast] = useState<string | null>(null);
  React.useEffect(() => {
    if (previewToast === null) return;
    const t = window.setTimeout(() => setPreviewToast(null), 1800);
    return () => window.clearTimeout(t);
  }, [previewToast]);

  const previewDestinationLabel = (): string => {
    if (!cta?.enabled || !ctaHref) return '';
    if (cta.linkType === 'product') {
      const name = products?.find((p) => p.id === cta.productId)?.name;
      return name ? `Ficha: ${name}` : 'Ficha de producto';
    }
    if (cta.linkType === 'category') {
      const cName = categoryName(cta.categoryId, categories || []);
      return cName ? `#catálogo (+ filtro ‘${cName}’)` : '#catálogo';
    }
    return cta.href || '';
  };

  const onCtaPreviewClick = () => {
    const label = previewDestinationLabel();
    setPreviewToast(label ? `→ ${label}` : '→ (sin destino)');
  };

  const onImagePreviewClick = () => {
    if (!imageLinkVisible) return;
    let label = '#catálogo';
    if (imageClick?.linkType === 'product') {
      const name = products?.find((p) => p.id === imageClick.productId)?.name;
      label = name ? `Ficha: ${name}` : 'Ficha de producto';
    } else if (imageClick?.linkType === 'category') {
      const cName = categoryName(imageClick.categoryId, categories || []);
      label = cName ? `#catálogo (+ filtro ‘${cName}’)` : '#catálogo';
    } else if (imageClick?.linkType === 'custom') {
      label = imageClick.href || '';
    }
    setPreviewToast(label ? `→ ${label}` : '→ (sin destino)');
  };

  // Open-in-new-tab for the carousel CTA is handled inside
  // BannerCtaButton (it knows openInNewTab via ctaSharedProps); we do
  // not re-spread it here to avoid conflicts. (Kept for clarity only.)

  const Wrap = view === 'carousel' ? 'article' : 'div';
  const wrapAriaHidden = view === 'carousel' ? { 'aria-hidden': !active } : {};

  const ctaSharedProps = {
    view: view as 'carousel' | 'preview',
    href: ctaLinkHref,
    label: ctaLabel,
    openInNewTab: Boolean(cta?.openInNewTab),
    ariaLabel: ctaLabel,
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(
      Wrap as any,
      {
        'aria-hidden': (wrapAriaHidden as { 'aria-hidden'?: boolean })['aria-hidden'],
        className: `banner-slide absolute inset-0 transition-opacity duration-700 ease-out ${
          view === 'carousel' && !active ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`,
        'aria-roledescription': 'group',
        'aria-label': `Banner ${index + 1}`,
      },

      // ===== BACKGROUND LAYER (image) =====
      // Either wrapped in a link (imageClick enabled) or rendered plain.
      // The CTA is NEVER nested inside this link — it is a sibling below.
      imageLinkVisible ? (
        view === 'carousel' ? (
          <Link
            to={imageHref as string}
            aria-label={imageLinkAria}
            className="absolute inset-0 z-0 block"
          >
            <picture className="block h-full w-full">
              <source media="(max-width: 639px)" srcSet={banner.mobileImage || banner.image || ''} />
              <img src={banner.image || ''} alt={altText} className="absolute inset-0 h-full w-full object-cover" />
            </picture>
          </Link>
        ) : (
          <button
            type="button"
            onClick={onImagePreviewClick}
            aria-label={imageLinkAria}
            className="absolute inset-0 z-0 block cursor-pointer"
          >
            <picture className="pointer-events-none block h-full w-full">
              <source media="(max-width: 639px)" srcSet={banner.mobileImage || banner.image || ''} />
              <img src={banner.image || ''} alt={altText} className="absolute inset-0 h-full w-full object-cover" />
            </picture>
          </button>
        )
      ) : (
        <picture className="absolute inset-0 z-0">
          <source media="(max-width: 639px)" srcSet={banner.mobileImage || banner.image || ''} />
          <img src={banner.image || ''} alt={altText} className="absolute inset-0 h-full w-full object-cover" />
        </picture>
      ),

      // ===== SCRIM (overlay mode only, for text legibility) =====
      mode === 'overlay' && (
        <div className={`banner-slide__scrim absolute inset-0 ${scrimClass}`} />
      ),

      // ===== DECORATIVE BRAND GLOWS (kept identical to today's carousel) =====
      mode === 'overlay' && (
        <>
          <div className="absolute -left-16 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#ff7a00]/20 blur-[90px]" />
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#7b2cbf]/25 blur-[100px]" />
        </>
      ),

      // ===== IMAGE-CLICK RING HINT (preview only) =====
      imageLinkVisible && view === 'preview' && (
        <div
          className="banner-slide__click-ring pointer-events-none absolute inset-0 z-10 ring-2 ring-inset ring-cyan-300/60"
          aria-hidden="true"
        />
      ),

      // ===== OVERLAY TEXT BLOCK + CTA (overlay mode) =====
      // NB: this block is NOT a link; the CTA inside is its own link sibling
      // to the image-link above, positioned above via z-index >= 10.
      mode === 'overlay' && (
        <div className={`banner-slide__overlay relative z-10 flex min-h-full max-w-2xl flex-col px-7 py-14 sm:px-14 ${POSITION_CLASS[textPosition]} ${ALIGN_CLASS[textAlign]}`}>
          <span className="mb-5 inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.35em] text-orange-400 backdrop-blur-md">Ediciones exclusivas</span>
          {title && <h1 className="font-montserrat text-4xl font-extralight leading-[1.08] tracking-tight text-white sm:text-6xl">{title}</h1>}
          {description && <p className="mt-5 max-w-md text-sm font-light leading-6 tracking-wide text-slate-200">{description}</p>}
          {ctaVisible && (
            <div className="mt-8">
              <BannerCtaButton
                {...ctaSharedProps}
                variant="overlay"
                onPreviewClick={onCtaPreviewClick}
              />
            </div>
          )}
        </div>
      ),

      // ===== FLOATING CTA (full mode) =====
      // The CTA is a SIBLING of the image-link, positioned above via z-20
      // (no grey plate; the gradient pill + halo guarantee legibility on
      // any photo). The safe-area inset is handled inside BannerCtaButton.
      mode === 'full' && ctaVisible && (
        <BannerCtaButton
          {...ctaSharedProps}
          variant="floating"
          floatingInset={floatingCorner}
          onPreviewClick={onCtaPreviewClick}
        />
      ),

      // ===== PREVIEW TRANSIENT TOAST (honest feedback, simulated) =====
      view === 'preview' && previewToast !== null && (
        <div
          role="status"
          aria-live="polite"
          className="banner-slide__toast pointer-events-none absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest text-white backdrop-blur-md banner-slide__toast--in"
        >
          {previewToast}
        </div>
      ),
    )
  );
};

export default BannerSlide;
