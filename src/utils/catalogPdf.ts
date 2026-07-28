/**
 * catalogPdf — entry for BOTH the live preview and the download path.
 *
 * PDF Catalog v2 (replaces previous raster approach). Now uses the vector
 * renderer @react-pdf/renderer — text is selectable/searchable in the output.
 *
 * Public API (legacy + new):
 *   - downloadCatalogPdf(products, fileName, options?) — async, fires onProgress
 *       options may be:
 *         - string title (legacy, builds a minimal-light brand with that title)
 *         - CatalogOptions { brand?: ProviderBranding; ... } (new, full brand)
 *   - renderCatalogDoc(props) — returns the @react-pdf Document element used
 *     by the live preview <PDFViewer>. Loaded LOCALLY (in the editor chunk).
 *
 * M2 (images): images are COPIES, never the stored asset. prepareImageForPdf
 * runs offscreen-canvas downscaled JPEG q~0.78; dedup within a run; broken
 * URLs are SKIPPED (never throw — degrade to placeholder, continue).
 * M3 (no server infra): entirely client-side. chunked image prep cap 3.
 * M6 (UX): progress passed through onProgress(done,total); caller shows
 * "Preparando catálogo… 12/40" and disables the button.
 *
 * Brand binding:
 *   - PROVIDER run: caller passes options.brand = normalizeProviderBranding(currentUser).
 *     Their catalog = their brand + chosen templateId as the protagonist; LILU
 *     signature sits in its corner (read from the platform constant).
 *   - ADMIN run: caller passes options.brand = buildPlatformCatalogBrand()
 *     (template forced 'tron-night', palette forced to the Tron Night web
 *     tokens snapshot).
 */

import { Product, ProviderBranding, DEFAULT_CATALOG_TEMPLATE } from '../types';
import { formatPrice } from './formatters';
import type { CatalogTemplateId } from '../types';
import { buildPlatformCatalogBrand, PLATFORM_LOGO_URL } from './platformBrand';
import { PLATFORM_NIGHT_BRAND_PALETTE } from './platformBrand';
import { DEFAULT_CATALOG_TEMPLATE as DCT } from '../types';

// Lazy dynamic import of the react-pdf renderer (keeps the renderer OUT of the
// main bundle per G1 lazy-load guardrail). pdfFonts.ensurePdfFonts also
// dynamic-imports the renderer internally so it is co-located in the same chunk.
export interface CatalogOptions {
  /** Nombre a mostrar en la cabecera (legacy, used only when brand is omitted). */
  title?: string;
  /** URL del logo del proveedor (legacy, folded into brand.logoUrl when brand omitted). */
  logoUrl?: string;
  /** Nombre comercial del proveedor (legacy, folded into brand.companyName when brand omitted). */
  storeName?: string;
  /**
   * NEW: full provider brand. When present, overrides title/logoUrl/storeName
   * for the entire PDF. When absent, a minimal-light brand is synthesized from
   * the legacy fields + a platform signature — so legacy callers (MasterAdmin,
   * pre-P1 ProviderDashboard) still work WITHOUT touching their call sites.
   */
  brand?: ProviderBranding;
  /**
   * NEW: optional progress callback for image-prep + render. (done, total).
   */
  onProgress?: (done: number, total: number, phase?: 'images' | 'render') => void;
}

/** Build legacy-aligned minimal-light brand from the old (title/storeName/logoUrl) call shape. */
const legacyToBrand = (options: CatalogOptions): ProviderBranding => {
  if (options.brand) return options.brand;
  return {
    templateId: 'minimal-light',
    palette: { primary: '#111827', secondary: '#6B7280', accent: '#B45309', ink: '#1F2937', paper: '#FFFFFF' },
    logoUrl: options.logoUrl || undefined,
    companyName: options.storeName || 'LILU TECNO',
    tagline: options.title || '',
    contact: {},
  };
};

// ============================================================
// LIVE PREVIEW + DOWNLOAD (same @react-pdf Document tree; G2)
// ============================================================

/**
 * Returns the Document element prepared for the BrandingEditor's <PDFViewer>.
 * Caller responsibility: ensurePdfFonts() has been called (the editor does
 * this on mount). Defined via dynamic import so it lives in the editor chunk.
 */
export const renderCatalogDoc = async (
  brand: ProviderBranding,
  products: Product[],
  imagesBySource?: Map<string, string | null>,
): Promise<React.ReactElement> => {
  const { buildCatalogDocument, SKIN_BY_ID } = await import('./pdf/templates/catalogLayout');
  const skin = SKIN_BY_ID[brand.templateId];
  return buildCatalogDocument({ brand, products, images: imagesBySource ? { bySource: imagesBySource } : undefined }, skin) as React.ReactElement;
};

// ============================================================
// DOWNLOAD — prepares image COPIES, builds the document, saves the blob
// ============================================================

interface PreparedMaps {
  bySource: Map<string, string | null>;
  brokenCount: number;
}

/**
 * Walks the product list, collects unique source URLs, prepares them in
 * deduplicated cap-3 batches (M2), and emits onProgress(done,total,'images').
 */
const prepareAllImages = async (
  products: Product[],
  onProgress?: (done: number, total: number, phase?: 'images' | 'render') => void,
): Promise<PreparedMaps> => {
  const seen = new Set<string>();
  const requests: Array<{ source: string; opts: { maxW: number; maxH?: number; quality?: number } }> = [];
  for (const p of products) {
    for (const src of (p.images || [])) {
      if (!src || seen.has(src)) continue;
      seen.add(src);
      // Grid thumbs target ~150pt; the featured image uses ~300pt. We prepare
      // once at the larger size and let PdfImage scale down for the thumbnail
      // (renderer does this crisply). Keeps ONE embed per source (dedup).
      requests.push({ source: src, opts: { maxW: 320, maxH: 320, quality: 0.78 } });
    }
  }
  const { prepareImagesBatched } = await import('./pdf/prepareImage');
  const prepared = await prepareImagesBatched(requests, (d, t) => onProgress?.(d, t, 'images'), 3);
  const bySource = new Map<string, string | null>();
  let broken = 0;
  for (const { source, dataUrl } of prepared) {
    bySource.set(source, dataUrl);
    if (!dataUrl) broken++;
  }
  return { bySource, brokenCount: broken };
};

export const downloadCatalogPdf = async (
  products: Product[],
  fileName: string,
  titleOrOptions: string | CatalogOptions = 'Catálogo Lilu Tecno',
): Promise<void> => {
  const options: CatalogOptions = typeof titleOrOptions === 'string' ? { title: titleOrOptions } : titleOrOptions;

  // Brand: explicit options.brand supersedes; legacy fields synthesize a minimal-light brand.
  const brand: ProviderBranding = options.brand || legacyToBrand(options);

  // 1) prepare image COPIES (never the stored asset) — chunked + dedup + skip-broken.
  const { bySource, brokenCount } = await prepareAllImages(products, options.onProgress);

  // 2) ensure fonts + dynamic-import the renderer (lazy chunk).
  const { ensurePdfFonts } = await import('./pdf/pdfFonts');
  await ensurePdfFonts();
  const { buildCatalogDocument, SKIN_BY_ID } = await import('./pdf/templates/catalogLayout');
  const skin = SKIN_BY_ID[brand.templateId];
  const docEl = buildCatalogDocument({ brand, products, images: { bySource } }, skin);

  // 3) render to blob via the renderer's pdf() API.
  const renderer = await import('@react-pdf/renderer');
  options.onProgress?.((products.length || 0), products.length || 0, 'render');
  const blob: Blob = await (renderer as any).pdf(docEl).toBlob();

  // 4) surface broken-image count to caller (after success, never fatal).
  if (brokenCount > 0) {
    try {
      console.warn(`PDF Catalog v2: ${brokenCount} imagen(es) no disponible(s) — se omitieron.`);
    } catch { /* ignore */ }
  }

  // 5) save the blob as a file.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

// ============================================================
// Reserved: a tiny @react-pdf download helper for tests/manual callers.
// ============================================================
export const _internal = { legacyToBrand, prepareAllImages, PLATFORM_LOGO_URL, buildPlatformCatalogBrand, PLATFORM_NIGHT_BRAND_PALETTE, DCT, formatPrice, DEFAULT_CATALOG_TEMPLATE };
export type { CatalogTemplateId };
