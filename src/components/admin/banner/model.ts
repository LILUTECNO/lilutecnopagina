/* =================================================================
   banner model — additive Banner type + normalizeBanner + validation.
   Banner slice.

   BACKWARD COMPATIBILITY IS THE SHIELD:
     - Existing HeroSlide fields are kept (id, title, description, image,
       mobileImage, ctaLabel, ctaHref, active, order). Never renamed/removed.
     - New fields are ADDITIVE; normalizeBanner() fills them at every load
       site (admin list + carousel). No stored row migration required.
     - Legacy '#catalogo' banners normalized to linkType 'custom' render
       EXACTLY as today (overlay mode + scrim auto + custom-link CTA).

   REACHABILITY AUDIT (Q3 spec):
     - Catalog category filter lives in App.tsx via useProducts()
       handleSetFilters({ category }), mounted ONCE in App.
     - HeroCarousel is rendered by App.tsx as a sibling WITHOUT receiving
       handleSetFilters; there is no shared filters context/store.
     - Reaching the filter state from the carousel would require lifting
       state, adding a context, or editing App.tsx (all FORBIDDEN).
     => CATEGORY_LINK_REACHABLE = false: the NOT_REACHABLE fallback branch
        applies. A category CTA stores categoryId (seed) + href '#catalogo';
        the click scrolls to '#catalogo' unfiltered today; the categoryId is
        preserved so wiring the pre-filter is a one-line change the day the
        filter state is exposed via an existing context/callback.

   TODO(tron-banner): category pre-filter not wired — filter state is
   encapsulated in App.tsx's useProducts() mount; when it is exposed via an
   existing context/callback (separate task), call handleSetFilters({
   category: cta.categoryId }) before scrolling to #catalogo. categoryId is
   stored and ready.

   TODO(tron-tests): when the project adopts a test framework (separate
   task), cover: normalizeBanner legacy->defaults (overlay + custom-link
   cta + imageClick false); normalizeBanner passthrough of new banners;
   validation (cta.enabled requires valid destination per linkType;
   imageClick.enabled same; desktop image required); slide renderer
   fallbacks (legacy banner renders as overlay; full mode hides text;
   cta/imageClick resolve href via existing route generators). Manual
   evidence for all of the above is attached to this feature's PR.
   ================================================================== */
// (No imports needed: this module is pure shapes + pure functions. The
// Product type is referenced only via doc-comment, and the existing route
// generator shapes are replicated as pure helpers below.)

// --- Exported reachability constant (editor + carousel must agree) ---
export const CATEGORY_LINK_REACHABLE = false;

// --- Route generators (REUSE existing project routes via pure helpers) ---
// Product detail route is `/product/:productId` (main.tsx); ProductCard.tsx
// renders `<Link to={`/product/${product.id}`}>`. We extract the same path
// shape as a pure helper so the carousel/admin never hardcode URLs.
export const productPath = (productId: string): string => `/product/${productId}`;
// The catalog is an in-page anchor `id="catalogo"` in App.tsx.
export const CATALOG_ANCHOR = '#catalogo';

// ============================================================
// Banner type — additive on top of the legacy HeroSlide shape
// ============================================================
export type PresentationMode = 'overlay' | 'full';
export type TextAlign = 'left' | 'center' | 'right';
export type TextPosition = 'top' | 'center' | 'bottom';
export type Scrim = 'auto' | 'none';
export type LinkType = 'product' | 'category' | 'custom';

export interface BannerDestination {
  linkType: LinkType;
  productId?: string;
  categoryId?: string;
  href?: string;
}

export interface BannerOverlay {
  title?: string;
  description?: string;
  textAlign?: TextAlign;
  textPosition?: TextPosition;
  scrim?: Scrim;
}

export interface BannerCta extends BannerDestination {
  enabled: boolean;
  label: string;
  openInNewTab?: boolean;
}

export interface BannerImageClick extends BannerDestination {
  enabled: boolean;
}

export interface Banner {
  // Legacy fields (preserved untouched for backward compatibility)
  id: string;
  title?: string;
  description?: string;
  image?: string;
  mobileImage?: string;
  ctaLabel?: string;
  ctaHref?: string;
  active?: boolean;
  order?: number;

  // New additive fields (defaults reproduce TODAY's behavior)
  presentationMode?: PresentationMode;
  imageAlt?: string;
  overlay?: BannerOverlay;
  cta?: BannerCta;
  imageClick?: BannerImageClick;
  createdAt?: string;
}

// ============================================================
// normalizeBanner — single source of truth on every load site
// ============================================================
// For a legacy banner missing the new fields, returns an object whose
// defaults reproduce TODAY's render exactly:
//   presentationMode = 'overlay'
//   overlay.title/overlay.description = raw.title/raw.description
//   cta.enabled = !!(raw.ctaHref || raw.ctaLabel) // legacy link/label present
//   cta.linkType = 'custom'
//   cta.href = raw.ctaHref (the OLD link field, absorbed verbatim)
//   cta.label = raw.ctaLabel or 'Ver más'
//   imageClick.enabled = false
export function normalizeBanner(raw: any): Banner {
  const legacyTitle: string = String(raw?.title ?? '');
  const legacyDescription: string = String(raw?.description ?? '');
  const legacyHref: string = String(raw?.ctaHref ?? '');
  const legacyLabel: string = String(raw?.ctaLabel ?? '');
  const hasLegacyLink = Boolean(legacyHref) || Boolean(legacyLabel);

  const overlay: BannerOverlay = {
    title: legacyTitle,
    description: legacyDescription,
    textAlign: 'left',
    textPosition: 'center',
    scrim: 'auto',
    // Pass-through any explicit overlay values a new banner may have stored.
    ...(raw?.overlay?.textAlign ? { textAlign: raw.overlay.textAlign } : null),
    ...(raw?.overlay?.textPosition ? { textPosition: raw.overlay.textPosition } : null),
    ...(raw?.overlay?.scrim ? { scrim: raw.overlay.scrim } : null),
    ...(raw?.overlay?.title !== undefined ? { title: raw.overlay.title } : null),
    ...(raw?.overlay?.description !== undefined ? { description: raw.overlay.description } : null),
  };

  // Absorb the legacy link field into cta via default-derivation.
  const ctaLinkType: LinkType = (raw?.cta?.linkType as LinkType) || 'custom';
  const ctaEnabled =
    raw?.cta?.enabled !== undefined ? Boolean(raw.cta.enabled) : hasLegacyLink;
  const ctaHref = raw?.cta?.href !== undefined ? raw.cta.href : legacyHref;
  const ctaProductId = raw?.cta?.productId;
  const ctaCategoryId = raw?.cta?.categoryId;
  const cta: BannerCta = {
    enabled: ctaEnabled,
    label: raw?.cta?.label !== undefined ? String(raw.cta.label) : (legacyLabel || 'Ver más'),
    linkType: ctaLinkType,
    ...(ctaProductId !== undefined ? { productId: ctaProductId } : null),
    ...(ctaCategoryId !== undefined ? { categoryId: ctaCategoryId } : null),
    ...(ctaHref !== undefined ? { href: ctaHref } : null),
    openInNewTab: raw?.cta?.openInNewTab ?? false,
  };

  // imageClick defaults to disabled (legacy banners were never clickable-image).
  const imageClickLinkType: LinkType = (raw?.imageClick?.linkType as LinkType) || 'custom';
  const imageClick: BannerImageClick = {
    enabled: raw?.imageClick?.enabled ?? false,
    linkType: imageClickLinkType,
    ...(raw?.imageClick?.productId !== undefined ? { productId: raw.imageClick.productId } : null),
    ...(raw?.imageClick?.categoryId !== undefined ? { categoryId: raw.imageClick.categoryId } : null),
    ...(raw?.imageClick?.href !== undefined ? { href: raw.imageClick.href } : null),
  };

  const presentationMode: PresentationMode = (raw?.presentationMode as PresentationMode) || 'overlay';
  const imageAlt: string =
    raw?.imageAlt !== undefined ? String(raw.imageAlt) : legacyTitle;

  return {
    // Pass-through legacy fields verbatim.
    ...(raw?.id !== undefined ? { id: String(raw.id) } : { id: '' }),
    ...(raw?.title !== undefined ? { title: raw.title } : null),
    ...(raw?.description !== undefined ? { description: raw.description } : null),
    ...(raw?.image !== undefined ? { image: raw.image } : null),
    ...(raw?.mobileImage !== undefined ? { mobileImage: raw.mobileImage } : null),
    ...(raw?.ctaLabel !== undefined ? { ctaLabel: raw.ctaLabel } : null),
    ...(raw?.ctaHref !== undefined ? { ctaHref: raw.ctaHref } : null),
    ...(raw?.active !== undefined ? { active: raw.active } : null),
    ...(raw?.order !== undefined ? { order: raw.order } : null),
    ...(raw?.createdAt !== undefined ? { createdAt: raw.createdAt } : null),
    // New additive fields.
    presentationMode,
    imageAlt,
    overlay,
    cta,
    imageClick,
  };
}

// ============================================================
// resolveDestinationHref — turn a normalized destination into a real href
// reusing existing route generators ONLY (no invented URLs).
// ============================================================
//
// product => /product/<id>         (ProductCard.tsx Link shape)
// category => #catalogo            (App.tsx anchor; NO per-category route exists)
// custom => href as-is             (legacy '#catalogo' lands here)
export function resolveDestinationHref(
  dest: BannerDestination | undefined,
): string | null {
  if (!dest) return null;
  if (dest.linkType === 'product') {
    if (!dest.productId) return null;
    return productPath(dest.productId);
  }
  if (dest.linkType === 'category') {
    return CATALOG_ANCHOR;
  }
  // custom
  return dest.href && String(dest.href).length > 0 ? String(dest.href) : null;
}

// Category display name lookup (reuse existing categories read-only import).
export function categoryName(
  categoryId: string | undefined,
  categories: string[] | { id: string; name: string }[],
): string | undefined {
  if (!categoryId) return undefined;
  for (const c of categories) {
    if (typeof c === 'string') {
      if (c === categoryId) return c;
    } else if (c && c.id === categoryId) return c.name;
  }
  return undefined;
}

// ============================================================
// Validation (only enforced in the banner form, on save)
// ============================================================
// Exactly one valid destination per linkType. Desktop image required.
// Returns a map of inline errors keyed by field id.
export interface BannerValidationErrors {
  desktopImage?: string;
  ctaLabel?: string;
  ctaDestination?: string;
  imageClickDestination?: string;
}

export function validateBannerDraft(input: {
  hasDesktopImage: boolean;            // existing or newly uploaded
  cta?: BannerCta | null;
  imageClick?: BannerImageClick | null;
}): BannerValidationErrors {
  const errors: BannerValidationErrors = {};

  if (!input.hasDesktopImage) {
    errors.desktopImage = 'Se requiere una imagen de portada (escritorio).';
  }

  if (input.cta?.enabled) {
    if (!input.cta.label || input.cta.label.trim() === '') {
      errors.ctaLabel = 'La etiqueta del botón es obligatoria.';
    }
    if (!destinationIsValid(input.cta)) {
      errors.ctaDestination = destinationError(input.cta.linkType);
    }
  }

  if (input.imageClick?.enabled) {
    if (!destinationIsValid(input.imageClick)) {
      errors.imageClickDestination = destinationError(input.imageClick.linkType);
    }
  }

  return errors;
}

function destinationIsValid(dest: BannerDestination): boolean {
  if (dest.linkType === 'product') return Boolean(dest.productId);
  if (dest.linkType === 'category') return Boolean(dest.categoryId);
  // custom
  return Boolean(dest.href && String(dest.href).trim().length > 0);
}

function destinationError(linkType: LinkType): string {
  if (linkType === 'product') return 'Selecciona un producto.';
  if (linkType === 'category') return 'Selecciona una categoría.';
  return 'Escribe un enlace válido.';
}

export function hasValidationErrors(errors: BannerValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
