/**
 * Provider branding — additive model + normalize (PDF Catalog v2).
 *
 * INSPECT EVIDENCE (see README/diff top-block):
 *  (i)   PDF approach today: RASTER (html2canvas / jsPDF.addImage) at src/utils/catalogPdf.ts.
 *        M1 => MIGRATE to a vector renderer (@react-pdf/renderer) at the P3 install commit.
 *  (ii)  PROVIDER PROFILE: stored in Firestore `users/{uid}`; the provider panel
 *        saves through updateDoc(doc(db,'users',uid), {...}) inside ProviderDashboard.saveBrand()
 *        (src/pages/ProviderDashboard.tsx:87). Existing brand-ish fields ALREADY on the doc:
 *          storeName, phone, address, taxId, logoUrl  (UserState, src/context/AuthContext.tsx:21-25).
 *        We persist the new `branding` sub-object THROUGH this same updateDoc call (additive),
 *        never via a new endpoint/collection.
 *  (iii) UPLOAD MECHANISM: uploadBytes(ref(storage, `providerLogos/${uid}/...`)) + getDownloadURL
 *        + updateDoc(users/{uid}, { logoUrl }) (ProviderDashboard.handleLogoUpload, lines 94-111).
 *        REUSED for the brand logo; we keep `branding.logoUrl` in sync with the existing `logoUrl`
 *        field (single source of truth = `logoUrl`); no new Storage path needed.
 *  (iv)  COLOR PICKER: no color-picker lib in deps. Plan: NATIVE <input type="color"> + swatches.
 *  (v)   PLATFORM BRAND (LILU) + Tron Night palette: src/theme-system.css [data-theme="dark"]
 *        tokens (--bg-0/1, --surface-*, --accent-cyan/violet/amber, --gold-solid, --text-*,
 *        --cta-from/to). The platform constant lives in src/utils/platformBrand.ts (new).
 *  (vi)  PRODUCT fields available: name, summary (1-line desc), features[] (specs bullets),
 *        price, stock, category, images[], reference, precio_base. See src/types.ts (Product).
 *
 * OWNER_WIP_PATCH_PROVIDERDASHBOARD (captured before stash, STEP A of carve-out):
 *   @@ -309,13 +309,13 @@ const ProviderDashboard: React.FC = () => {
 *             <img src={logo} ... />
 *             <div className="flex items-center gap-2">
 *               <LayoutGrid ... />
 *   -            <span className="font-montserrat text-lg font-black tracking-[0.16em] text-white">
 *   +            <span className="wordmark font-montserrat text-lg font-black tracking-[0.16em] text-white">
 *                 LILUTECNO PARTNER
 *               </span>
 *             </div>
 *           </div>
 *           <div className="flex items-center space-x-6">
 *   -            <span className="text-[10px] uppercase tracking-[0.2em] text-orange-400 font-semibold">
 *   +            <span className="role-label text-[10px] uppercase tracking-[0.2em] text-orange-400 font-semibold">
 *                 PANEL DE PROVEEDOR
 *               </span>
 *   This patch is stashed as `wip-providerdashboard-carveout`; it is NOT in P0-P3 commits
 *   (header spans region ~305-325 is OFF-LIMITS), and is restored byte-for-byte in STEP E.
 *
 * No new endpoint / new collection / new Storage path / product-image mutation.
 */

import type {
  BrandContact,
  BrandPalette,
  CatalogTemplateId,
  ProviderBranding,
} from '../types';
import {
  DEFAULT_CATALOG_TEMPLATE,
  TEMPLATE_DEFAULT_PALETTES,
} from '../types';
import type { UserState } from '../context/AuthContext';
// Re-export for callers; keeps the symbol's home in types.ts (single source of truth).
export { TEMPLATE_DEFAULT_PALETTES, TEMPLATE_PRESET_PALETTES, DEFAULT_CATALOG_TEMPLATE } from '../types';
export type {
  BrandPalette,
  BrandContact,
  CatalogTemplateId,
  ProviderBranding,
} from '../types';

export const isValidHex = (hex: string): boolean =>
  /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(hex || ''));

const clampHex = (hex: string | undefined, fallback: string): string =>
  isValidHex(hex || '') ? (hex as string) : fallback;

const TEMPLATE_IDS: CatalogTemplateId[] = ['minimal-light', 'tron-night', 'editorial'];

const isTemplateId = (v: unknown): v is CatalogTemplateId =>
  typeof v === 'string' && (TEMPLATE_IDS as string[]).includes(v);

/**
 * Single source of truth for the brand object consumed by the editor AND the PDF engine.
 * - Legacy providers (no branding) get a fully-populated default with their existing
 *   company fields mapped in (companyName from storeName, contact from phone/address).
 * - Providers with partial branding get missing slots backfilled from defaults + existing fields.
 * - Used at EVERY read site (editor load + PDF generation + preview).
 */
export const normalizeProviderBranding = (raw: UserState | null | undefined): ProviderBranding => {
  const existing: Partial<ProviderBranding> = (raw?.branding as Partial<ProviderBranding>) || {};

  const templateId: CatalogTemplateId = isTemplateId(existing.templateId)
    ? existing.templateId
    : DEFAULT_CATALOG_TEMPLATE;

  const defaults = TEMPLATE_DEFAULT_PALETTES[templateId];
  const inPalette: Partial<BrandPalette> = (existing.palette as Partial<BrandPalette>) || {};
  const palette: BrandPalette = {
    primary: clampHex(inPalette.primary, defaults.primary),
    secondary: clampHex(inPalette.secondary, defaults.secondary),
    accent: clampHex(inPalette.accent, defaults.accent),
    ink: clampHex(inPalette.ink, defaults.ink),
    paper: clampHex(inPalette.paper, defaults.paper),
  };

  // logoUrl: existing UserState.logoUrl is the single source of truth; branding.logoUrl
  // (if present) is treated as a secondary hint and folded into logoUrl on save.
  const logoUrl: string | undefined = raw?.logoUrl || existing.logoUrl || undefined;

  const companyName: string =
    existing.companyName || raw?.storeName || raw?.name || '';

  const tagline: string = existing.tagline || '';

  const contact: BrandContact = {
    web: existing.contact?.web || undefined,
    email: existing.contact?.email || raw?.email || undefined,
    phone: existing.contact?.phone || raw?.phone || undefined,
    whatsapp: existing.contact?.whatsapp || raw?.phone || undefined,
    address: existing.contact?.address || raw?.address || undefined,
  };

  return { templateId, palette, logoUrl, companyName, tagline, contact };
};

/**
 * Clean up branding object before persisting to Firestore.
 * Omits falsy/empty fields so no `undefined` properties are sent,
 * which Firestore strictly forbids in updateDoc/setDoc.
 */
export const cleanupBrandingForSave = (b: ProviderBranding): ProviderBranding => {
  const contact: BrandContact = {};
  if (b.contact) {
    if (b.contact.web?.trim()) contact.web = b.contact.web.trim();
    if (b.contact.email?.trim()) contact.email = b.contact.email.trim();
    if (b.contact.phone?.trim()) contact.phone = b.contact.phone.trim();
    if (b.contact.whatsapp?.trim()) contact.whatsapp = b.contact.whatsapp.trim();
    if (b.contact.address?.trim()) contact.address = b.contact.address.trim();
  }

  const cleaned: ProviderBranding = {
    templateId: b.templateId,
    palette: {
      primary: b.palette.primary,
      secondary: b.palette.secondary,
      accent: b.palette.accent,
      ink: b.palette.ink,
      paper: b.palette.paper,
    },
  };

  if (b.logoUrl?.trim()) cleaned.logoUrl = b.logoUrl.trim();
  if (b.companyName?.trim()) cleaned.companyName = b.companyName.trim();
  if (b.tagline?.trim()) cleaned.tagline = b.tagline.trim();
  if (Object.keys(contact).length > 0) cleaned.contact = contact;

  return cleaned;
};
