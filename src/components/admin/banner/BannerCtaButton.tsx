/* =================================================================
   BannerCtaButton — the ONE presentational component that paints the
   banner CTA button, shared by the editor preview and the carousel
   slide (single source of truth, so the two can never drift visually).

   Banner slice.

   FIX A (visual): reuses the existing platform gradient tokens
     var(--cta-from) / var(--cta-to) and the existing --radius-cta /
     --ring-focus tokens — NO new gradient defined, NO grey/black
     fallback backing. Reuses the existing native button look ALSO used
     by .btn-glass-primary / .btn-cta in the rest of the store so a
     future theme tweak updates the banner button automatically.

   FIX B (link): renders a real <Link> (carousel) so the CTA actually
     navigates; in the preview it renders a <button type="button"> that
     simulates the click (transient toast) WITHOUT navigating the admin
     away from the dashboard. NEVER a <button onClick navigate> hack.

   ANTI-NESTING (FIX B): the CTA is always its own top-level link,
     never a child of the imageClick link. It stops click propagation
     so a click on the button never bubbles to an ancestor link area.
     See BannerSlide.tsx for the sibling structure (image-link + CTA
     as siblings, CTA on top via z-index).

   TOKEN REUSE (verified tokens):
     --cta-from / --cta-to   : the same gradient the rest of the store uses
                               (theme-system.css:22 light, :65 dark).
     --radius-cta            : light=12px, dark=999px (pill in dark).
     --ring-focus            : the Tron cyan focus ring (theme-system.css:
                               28 light, :72 dark).
     text-shadow + box-shadow halo below read on EITHER photo, replacing
     the grey backing that previously made the button look off-brand.
   ================================================================== */
import React from 'react';
import { Link } from 'react-router-dom';

export type BannerCtaVariant = 'overlay' | 'floating';
export type BannerCtaView = 'carousel' | 'preview';

interface BannerCtaButtonProps {
  view: BannerCtaView;
  href: string;            // resolved destination href (NEVER '#' or empty)
  label: string;
  openInNewTab?: boolean;
  ariaLabel?: string;       // honest aria-label
  variant: BannerCtaVariant;
  // preview-only: simulates the click with a transient toast in-frame.
  onPreviewClick?: (label: string) => void;
  // Optional className pass-through so the host can position (corner etc.).
  className?: string;
  // Floating pill safe-area (full-mode only); the spec wants the floating
  // button to keep a comfortable margin from the rounded frame edges.
  floatingInset?: 'tl' | 'tr' | 'bl' | 'br';
}

// Same shared visual treatment for BOTH variants (overlay + floating),
// so the banner button looks the same in every mode. Floating adds a
// tighter padding appropriate to its smaller footprint.
// The actual gradient + halo + text-shadow come from SHARED_STYLE inline
// (reusing --cta-from/--cta-to tokens) so the look is guaranteed
// regardless of cascade ordering in the host file (we cannot assume the
// global .btn-glass-primary class reaches every nested instance).
const SHARED_CLASSES =
  'banner-cta inline-flex items-center justify-center text-[10px] font-bold uppercase ' +
  'tracking-[0.25em] text-white cursor-pointer rounded-full ' +
  'transition-[filter,transform,box-shadow] duration-150 ease-out ' +
  'hover:-translate-y-[1px] hover:brightness-[1.06] active:translate-y-0 active:brightness-[0.96] ' +
  '[box-shadow:0_8px_24px_rgba(166,75,224,0.28),0_2px_6px_rgba(255,138,30,0.25),0_0_0_1px_rgba(255,255,255,0.06)] ' +
  'focus-visible:outline-none focus-visible:outline-offset-0 ' +
  'focus-visible:[box-shadow:var(--ring-focus)]';

const BASE_STYLE: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--cta-from), var(--cta-to))',
  border: 0,
  borderRadius: 'var(--radius-cta)',
  fontWeight: 700,
  letterSpacing: '.02em',
  textShadow: '0 1px 2px rgba(0,0,0,.28)',
  transition: 'transform .15s ease, filter .2s ease, box-shadow .25s ease',
};

const VARIANT_PADDING: Record<BannerCtaVariant, string> = {
  overlay: 'px-7 py-3.5',
  floating: 'px-5 py-3',
};

const FLOATING_INSET_CLASS: Record<'tl' | 'tr' | 'bl' | 'br', string> = {
  tl: 'left-[clamp(12px,2vw,24px)] top-[clamp(12px,2vw,24px)]',
  tr: 'right-[clamp(12px,2vw,24px)] top-[clamp(12px,2vw,24px)]',
  bl: 'left-[clamp(12px,2vw,24px)] bottom-[clamp(12px,2vw,24px)]',
  br: 'right-[clamp(12px,2vw,24px)] bottom-[clamp(12px,2vw,24px)]',
};

const BannerCtaButton: React.FC<BannerCtaButtonProps> = ({
  view,
  href,
  label,
  openInNewTab = false,
  ariaLabel,
  variant,
  onPreviewClick,
  className = '',
  floatingInset = 'br',
}) => {
  const baseClass = `${SHARED_CLASSES} ${VARIANT_PADDING[variant]} ${className}`;
  const sharedStyle = BASE_STYLE;
  const aria = ariaLabel
    ? `${ariaLabel}${openInNewTab ? ' (abre en pestaña nueva)' : ''}`
    : `${label}${openInNewTab ? ' (abre en pestaña nueva)' : ''}`;

  // stopPropagation so a click on the button never bubbles to any
  // ancestor link area (defensive; the DOM structure already makes them
  // siblings per the spec).
  const stopBubble = (e: React.MouseEvent) => e.stopPropagation();
  const targetRel = openInNewTab
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  // ---- PREVIEW: simulated, honest feedback (no real navigation) ----
  if (view === 'preview') {
    return (
      <button
        type="button"
        onClick={(e) => {
          stopBubble(e);
          onPreviewClick?.(label);
        }}
        className={`${baseClass} ${
          variant === 'floating' ? `absolute z-20 ${FLOATING_INSET_CLASS[floatingInset]}` : ''
        }`}
        style={sharedStyle}
        aria-label={aria}
      >
        {label}
      </button>
    );
  }

  // ---- CAROUSEL: real <Link> so the CTA actually navigates ----
  return (
    <Link
      to={href}
      {...targetRel}
      onClick={stopBubble}
      className={`${baseClass} ${
        variant === 'floating' ? `absolute z-20 ${FLOATING_INSET_CLASS[floatingInset]}` : ''
      }`}
      style={sharedStyle}
      aria-label={aria}
    >
      {label}
    </Link>
  );
};

export default React.memo(BannerCtaButton);
