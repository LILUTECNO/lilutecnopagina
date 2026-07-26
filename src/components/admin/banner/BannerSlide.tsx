/* =================================================================
   BannerSlide — the shared render of ONE banner, used by:
     - the live preview in the editor (view="preview"), and
     - the homepage carousel slide (view="carousel").
   Banner slice.

   Backward compatibility:
     A normalized legacy banner (presentationMode 'overlay', scrim 'auto',
     textAlign 'left', textPosition 'center', cta linkType 'custom', href
     equal to legacy ctaHref, label = legacy ctaLabel or 'Ver más') must
     render EXACTLY like today's HeroCarousel carousel slide:
       - <picture> source mobile (mobileImage || image), <img object-cover>
       - scrim gradient from #0a0312/95 via /65 to /25 (left-to-right)
       - text block at left/center, eyebrow + h1 font-montserrat + p
         text-slate-200 + CTA btn-glass-primary
       - CTA <a href={href || '#catalogo'}><span>{label || 'Ver más'}</span>
     No regression on #1/#2/#3.
   ================================================================== */
import React, { useMemo } from 'react';
import type { Banner } from './model';
import { resolveDestinationHref } from './model';

import { Link } from 'react-router-dom';

export type BannerSlideView = 'carousel' | 'preview';

interface BannerSlideProps {
  banner: Banner;
  view?: BannerSlideView;
  // index/active used by autoplay/arrows/dots in the carousel host; the
  // slide itself never decides that; receives them only for aria-ignore.
  index?: number;
  active?: boolean;
  // preview-only: option to show the floating button corner (by default
  // bottom-right). Cheap 4-corner control is handled in BannerEditor.
  floatingCorner?: 'tl' | 'tr' | 'bl' | 'br';
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
const CORNER_CLASS: Record<'tl' | 'tr' | 'bl' | 'br', string> = {
  tl: 'left-3 top-3',
  tr: 'right-3 top-3',
  bl: 'left-3 bottom-3',
  br: 'right-3 bottom-3',
};

const BannerSlide: React.FC<BannerSlideProps> = ({
  banner,
  view = 'carousel',
  index = 0,
  active = true,
  floatingCorner = 'br',
}) => {
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

  // Resolve destination hrefs (BE CONTENT, no navigation in preview).
  const ctaHref = useMemo(() => resolveDestinationHref(cta), [cta]);
  const imageHref = useMemo(() => resolveDestinationHref(imageClick), [imageClick]);

  // CTA: legacy fallback to '#catalogo' if href missing, like today.
  const ctaLinkHref = ctaHref || '#catalogo';
  const ctaLabel = cta?.label || 'Ver más';

  // aria-label for image-as-link: derived from the destination, like the
  // acceptance rule says ("Ir al catálogo" for #catalogo, or product name
  // when linkType 'product' if we knew it — but the model stores only id;
  // use a generic but honest label).
  const imageLinkAria =
    imageClick?.linkType === 'product'
      ? 'Ir al producto destacado'
      : imageHref === '#catalogo'
        ? 'Ir al catálogo'
        : 'Ir al enlace';

  // Open-in-new-tab attributes
  const ctaTargetRel =
    cta?.openInNewTab
      ? { target: '_blank' as '_blank', rel: 'noopener noreferrer' }
      : {};

  // The carousel wraps each slide in article{opacity absolute}, the preview
  // does NOT. We render the inner content (picture + scrim + text + cta)
  // always full-size of the host frame, so both hosts can style around.
  const Wrap = view === 'carousel'
    ? 'article'
    : 'div';
  // We use the same naming for the carousel; the preview ignores aria-hidden.
  const wrapAriaHidden = view === 'carousel' ? { 'aria-hidden': !active } : {};

  // In preview we render a non-navigating <span> that LOOKS like the link
  // (same class), so clicking the button inside the preview frame never
  // navigates. In carousel we render the real <Link>. This is the only
  // divergence between the two views, by design.
  const ctaLink = (extraClass: string) =>
    view === 'carousel' ? (
      <Link
        to={ctaLinkHref}
        {...ctaTargetRel}
        className={extraClass}
        aria-label={ctaLabel + (cta?.openInNewTab ? ' (abre en pestaña nueva)' : '')}
      >
        {ctaLabel}
      </Link>
    ) : (
      <span
        className={`${extraClass} cursor-pointer`}
        aria-label={ctaLabel + (cta?.openInNewTab ? ' (abre en pestaña nueva)' : '')}
      >
        {ctaLabel}
      </span>
    );

  // CTA button node keeps the existing carousel class so legacy banners
  // render identically (btn-glass-primary is the existing carousel class).
  const ctaButtonNode = cta?.enabled ? ctaLink(
    'banner-slide__cta inline-flex rounded-full btn-glass-primary px-7 py-3.5 text-[10px] font-medium uppercase tracking-[0.25em] transition-transform duration-150 ease-out hover:-translate-y-[1px] hover:brightness-110',
  ) : null;

  // Floating CTA pill (for 'full' mode): glass pill with subtle scrim for
  // legibility on any photo. Respects prefers-reduced-motion via CSS.
  const floatingCtaNode = cta?.enabled ? (
    <div
      className={`banner-slide__float absolute z-20 ${CORNER_CLASS[floatingCorner]} flex`}
      style={{ margin: '0.5rem' }}
    >
      {ctaLink(
        'banner-slide__cta-pill inline-flex items-center rounded-full border border-white/15 bg-black/55 px-5 py-3 text-[10px] font-medium uppercase tracking-[0.25em] text-white backdrop-blur-md transition-transform duration-150 ease-out hover:-translate-y-[1px] hover:brightness-110',
      )}
    </div>
  ) : null;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(
      Wrap as any,
      {
        'aria-hidden': (wrapAriaHidden as { 'aria-hidden'?: boolean })['aria-hidden'],
        className:
          'banner-slide absolute inset-0 transition-opacity duration-700 ease-out',
        'aria-roledescription': 'group',
        'aria-label': `Banner ${index + 1}`,
      },
      // Image (with imageClick wrap if enabled). In preview we wrap in a
      // <div role="link" aria-label> so the click never navigates.
      imageClick?.enabled && imageHref ? (
        view === 'carousel' ? (
          <Link
            to={imageHref}
            aria-label={imageLinkAria}
            className="absolute inset-0 z-0 block"
          >
            <picture>
              <source media="(max-width: 639px)" srcSet={banner.mobileImage || banner.image || ''} />
              <img
                src={banner.image || ''}
                alt={altText}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </picture>
          </Link>
        ) : (
          <div
            role="link"
            aria-label={imageLinkAria}
            className="absolute inset-0 z-0 block cursor-pointer"
          >
            <picture>
              <source media="(max-width: 639px)" srcSet={banner.mobileImage || banner.image || ''} />
              <img
                src={banner.image || ''}
                alt={altText}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </picture>
          </div>
        )
      ) : (
        <picture className="absolute inset-0 z-0">
          <source media="(max-width: 639px)" srcSet={banner.mobileImage || banner.image || ''} />
          <img
            src={banner.image || ''}
            alt={altText}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      ),

      // Scrim
      mode === 'overlay' && (
        <div className={`banner-slide__scrim absolute inset-0 ${scrimClass}`} />
      ),

      // Decorative brand glows (kept identical to today's carousel for legacy banners)
      mode === 'overlay' && (
        <>
          <div className="absolute -left-16 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#ff7a00]/20 blur-[90px]" />
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#7b2cbf]/25 blur-[100px]" />
        </>
      ),

      // ImageClick ring hint (preview only, when enabled and no href nav needed)
      imageClick?.enabled && view === 'preview' && (
        <div
          className="banner-slide__click-ring pointer-events-none absolute inset-0 z-10 ring-2 ring-inset ring-cyan-300/60"
          aria-hidden="true"
        />
      ),

      // Overlay text block (overlay mode only)
      mode === 'overlay' && (
        <div className={`banner-slide__overlay relative z-10 flex min-h-full max-w-2xl flex-col px-7 py-14 sm:px-14 ${POSITION_CLASS[textPosition]} ${ALIGN_CLASS[textAlign]}`}>
          <span className="mb-5 inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.35em] text-orange-400 backdrop-blur-md">Ediciones exclusivas</span>
          {title && <h1 className="font-montserrat text-4xl font-extralight leading-[1.08] tracking-tight text-white sm:text-6xl">{title}</h1>}
          {description && <p className="mt-5 max-w-md text-sm font-light leading-6 tracking-wide text-slate-200">{description}</p>}
          <div className="mt-8">{ctaButtonNode}</div>
        </div>
      ),

      // Floating CTA (full mode)
      mode === 'full' && floatingCtaNode,
    )
  );
};

export default BannerSlide;
