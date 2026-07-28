/**
 * Platform brand (LILU TECNO) — single constant for the admin PDF and the
 * white-label signature. The Tron Night palette below is a TS SNAPSHOT of the
 * dark-theme tokens defined in src/theme-system.css `[data-theme="dark"]`.
 *
 * HARD RULE: we MUST reuse the web's night tokens. The web tokens live as CSS
 * custom properties (not directly importable by @react-pdf). This module is the
 * pinned 1:1 snapshot that the admin PDF consumes; if theme-system.css night
 * tokens change, this snapshot changes in lockstep (cross-referenced here).
 * We do NOT redefine them as a NEW design system — these are the same hexes.
 *
 * Cross-ref (verify before changing):
 *   src/theme-system.css [data-theme="dark"]  --bg-0:#07070F, --bg-1:#0B0B16,
 *   --surface-1:#14121F, --surface-2:#1A1530, --surface-3:#221A3D,
 *   --text-0:#EAFBFF, --text-1:#C7C9E0, --text-muted:#8E90AC,
 *   --accent-cyan:#2FE6FF, --accent-violet:#B06BFF, --accent-amber:#FFB65C,
 *   --cta-from:#FF8A1E, --cta-to:#A64BE0,
 *   --gold-solid:#E8C061 (small text on dark).
 */

import type { ProviderBranding, BrandContact } from '../types';
import type { CatalogTemplateId } from '../types';
import lilutecnologo from '../assets/images/lilutecnologo.png';

export const PLATFORM_NAME = 'LILU TECNO';
export const PLATFORM_TAGLINE = 'Mercado de tecnología por mayoreo y dropshipping';

/** The LILU logo import the rest of the app uses (single source). Re-exported for the PDF path. */
export { lilutecnologo as PLATFORM_LOGO_LOCAL };

/** Web URL of the public LILU logo (if unreachable from the renderer, fall back to the local import). */
export const PLATFORM_LOGO_URL: string = '/lilutecnologo.png';

/** Admin night palette snapshot — BrandPalette-shaped, maps dark Tron tokens into template slots. */
export const PLATFORM_NIGHT_BRAND_PALETTE = {
  primary: '#2FE6FF',
  secondary: '#B06BFF',
  accent: '#FFB65C',
  ink: '#EAFBFF',
  paper: '#07070F',
} as const;

export const PLATFORM_NIGHT_SURFACES = {
  bg0: '#07070F',
  bg1: '#0B0B16',
  surface1: '#14121F',
  surface2: '#1A1530',
  surface3: '#221A3D',
  textMuted: '#8E90AC',
  ctaFrom: '#FF8A1E',
  ctaTo: '#A64BE0',
  goldSolid: '#E8C061',
} as const;

/** Admin contact (publication contact, not supplier-specific). */
export const PLATFORM_CONTACT: BrandContact = {
  web: 'https://lilutecno.com',
  email: 'soporte@lilutecno.com',
  phone: undefined,
  whatsapp: '573163026089',
  address: undefined,
};

export const PLATFORM_TEMPLATE_ID: CatalogTemplateId = 'tron-night';

/**
 * The admin run uses the PLATFORM brand (LILU name/logo + tagline), template
 * forced to 'tron-night', palette forced to the Tron Night web tokens.
 * The admin has NO branding editor (the platform identity is fixed here).
 */
export const buildPlatformCatalogBrand = (): ProviderBranding => ({
  templateId: PLATFORM_TEMPLATE_ID,
  palette: { ...PLATFORM_NIGHT_BRAND_PALETTE },
  logoUrl: PLATFORM_LOGO_URL,
  companyName: PLATFORM_NAME,
  tagline: PLATFORM_TAGLINE,
  contact: { ...PLATFORM_CONTACT },
});
