/**
 * Shared template contract — every template renderer consumes the SAME props
 * (brand + products + signature), so adding a template later is one component.
 *
 * A template is a React component built from @react-pdf primitives
 * (<Document>, <Page>, <View>, <Text>, <Image>, <Link>) — the SAME component
 * is used both for the BrandingEditor live preview (inside <PDFViewer>) and
 * for the downloaded file (via pdf().toBlob()). Single source of truth (G2).
 *
 * G3 (Halos/shadows) — @react-pdf does NOT honor CSS box-shadow reliably.
 * Depth is simulated with WRAPPING <View> dark-background + borderRadius +
 * padding (the dark panel) + an inner corner tick accent. Confirmed in the
 * generated PDF, not just the preview DOM.
 */

// --- PDF-RUNTIME POLYFILL (D1) ---------------------------------------------
// MUST run before any `@react-pdf/renderer` import in this (lazy) chunk. See the
// matching block in ./catalogLayout.tsx for the full rationale. @react-pdf/
// fontkit needs Node `Buffer` to decode font/image bytes; without it the
// browser throws "Buffer is not defined" and fontkit then throws
// `RangeError: Offset is outside the bounds of the DataView` while parsing
// glyph metrics. Polyfill the two globals here too, because Rollup co-bundles
// this module with catalogLayout.tsx and either may win side-effect ordering.
import { Buffer } from 'buffer';
if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = Buffer;
if (typeof globalThis.process === 'undefined')
  (globalThis as unknown as { process: Record<string, unknown> }).process = { env: {} };

import type { FC, ReactNode } from 'react';
import { Image as PdfImage, Link as PdfLink, Path as PdfPath, Rect as PdfRect, Svg, Circle as PdfCircle, Text as PdfText, View as PdfView } from '@react-pdf/renderer';
import type { BrandPalette, CatalogTemplateId, ProviderBranding } from '../../../types';
import type { Product } from '../../../types';
import { PLATFORM_NAME, PLATFORM_CONTACT, PLATFORM_LOGO_URL, buildPlatformCatalogBrand } from '../../platformBrand';
import type { PreparedImage } from '../prepareImage';

/**
 * Catalog price formatter (V3) — single source for ALL price rendering in every
 * template. Never touches utils/formatters.ts (out of scope; that one keeps its
 * Intl-with-NBSP shape for the rest of the app).
 *
 * CONTRACT (asserted below):
 *   - Symbol GLUED to the number ("$53.361", never "$ 53.361");
 *   - Thousands separator "." (COP style), NEVER a space;
 *   - Trims the cents part SEPARATELY so PriceDisplay can render the integer
 *     big/bold + the cents smaller/superscript IF (and only if) the input had
 *     fractional cents — for COP (no cents) we only render the big integer.
 *
 * @react-pdf/renderer's Intl output for es-CO produces "$\u00A053.361" (symbol
 * + NBSP + space-thousands), which is exactly the V3 split "$ 53 361" the owner
 * saw. We deliberately bypass Intl and roll our own so we own the glyph order.
 */
const formatCatalogPriceParts = (price: number | string | undefined, currency?: string): { intPart: string; decPart: string; symbol: string } => {
  const n = typeof price === 'string' ? parseFloat(price) : (price ?? 0);
  if (!Number.isFinite(n)) return { intPart: '—', decPart: '', symbol: '' };
  // Symbol map kept tiny (COP/USD/EUR). Defaults to "$" for everything else.
  const cur = (currency || 'COP').toUpperCase();
  const symbol = cur === 'EUR' ? '€' : '$';
  const neg = n < 0;
  const abs = Math.abs(n);
  // Round to 2dp, then split integer vs fraction cents.
  const rounded = Math.round(abs * 100) / 100;
  const hasCents = Math.round(abs * 100) % 100 !== 0;
  const intStr = Math.floor(rounded).toLocaleString('de-DE'); // de-DE uses '.' for thousands, no leading sign/cur
  const sym = neg ? `-${symbol}` : symbol;
  if (!hasCents) {
    return { intPart: `${sym}${intStr}`, decPart: '', symbol: sym };
  }
  // Cents exist (e.g. USD): render ",NN" as the small superscript part.
  const cents = Math.round((rounded - Math.floor(rounded)) * 100).toString().padStart(2, '0');
  return { intPart: `${sym}${intStr}`, decPart: `,${cents}`, symbol: sym };
};

// Pure helper for any caller that wants the full string in one piece (e.g. the
// overlap checker). Contract: no internal spaces, symbol glued.
export const formatCatalogPrice = (price: number | string | undefined, currency?: string): string => {
  const { intPart, decPart } = formatCatalogPriceParts(price, currency);
  return `${intPart}${decPart}`;
};

export interface PreparedImagesMap {
  /** Map: source URL -> prepared dataURL (or null if broken). */
  bySource: Map<string, string | null>;
}

export interface TemplateProps {
  brand: ProviderBranding;
  products: Product[];
  /** Optional: already-prepared image dataURLs keyed by source URL. */
  images?: PreparedImagesMap;
  /** Discreet LILU signature is always shown (no toggle) — read from platformBrand. */
  showSignature?: boolean;
}

export interface TemplateComponent extends FC<TemplateProps>, TemplateMeta {}

// ============================================================
// Signature component — discreet "by LILU TECNO" mark.
// Color is chosen PER TEMPLATE for legibility on that template's own canvas:
// muted ink on light templates, muted light-grey on dark templates.
// NEVER uses the provider's accent (so it never reads as part of their brand).
// ============================================================

export interface SignatureProps {
  /** true = dark canvas (use light-grey text); false = light canvas (muted ink). */
  darkCanvas: boolean;
  /** Compact (footer line) vs full (back-cover stripe). */
  mode?: 'footer' | 'cover';
}

const SignatureFooter: FC<{ darkCanvas: boolean }> = ({ darkCanvas }) => {
  const ink = darkCanvas ? '#8E90AC' : '#7A7A85';
  return (
    <PdfView
      style={{
        position: 'absolute',
        bottom: 18,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
      }}
      wrap={false}
    >
      <PdfText style={{ fontSize: 7, color: ink, fontFamily: 'CatalogBody' }}>
        Catálogo generado con
      </PdfText>
      {/* V1: letterSpacing is in PX in @react-pdf (NOT em). Keep it tiny on short wordmarks. */}
      <PdfText style={{ fontSize: 8, color: ink, fontFamily: 'CatalogDisplay', fontWeight: 700, letterSpacing: 0.3 }}>
        {PLATFORM_NAME}
      </PdfText>
    </PdfView>
  );
};

const SignatureCoverBack: FC<{ darkCanvas: boolean }> = ({ darkCanvas }) => {
  const ink = darkCanvas ? '#8E90AC' : '#6E6E72';
  return (
    <PdfView style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: ink as any }}>
      <PdfText style={{ fontSize: 9, color: ink as any, fontFamily: 'CatalogBody' }}>
        Catálogo generado con
      </PdfText>
      <PdfText style={{ fontSize: 11, color: ink as any, fontFamily: 'CatalogDisplay', fontWeight: 700, letterSpacing: 0.4 }}>
        {PLATFORM_NAME}
      </PdfText>
      <PdfLink
        src={PLATFORM_CONTACT.web || '#'}
        style={{ fontSize: 7, color: ink as any, fontFamily: 'CatalogBody' }}
      >
        {PLATFORM_CONTACT.web?.replace(/^https?:\/\//, '')}
      </PdfLink>
    </PdfView>
  );
};

export const LiluSignature: FC<SignatureProps> = ({ darkCanvas, mode = 'footer' }) =>
  mode === 'footer' ? <SignatureFooter darkCanvas={darkCanvas} /> : <SignatureCoverBack darkCanvas={darkCanvas} />;

/** Logo <PdfImage>. If brand.logoUrl is unreachable/prepared-null, renders a text wordmark (companyName). */
export const BrandLogo: FC<{ brand: ProviderBranding; fallbackText: string; height: number; color: string }> =
  ({ brand, fallbackText, height, color }) => {
    const dataUrl = brand.logoUrl;
    // Note: when used in preview/download the renderer should be fed a PREPARED
    // dataUrl already (see catalogPdf.ts entry). For text fallback use companyName.
    if (dataUrl) {
      return (
        <PdfView style={{ height, flexDirection: 'row', alignItems: 'center' }}>
          <PdfImage src={dataUrl} style={{ height, maxHeight: height, width: 'auto', objectFit: 'contain' }} />
        </PdfView>
      );
    }
    // V1: letter-spacing on a long wordmark ("LILU TECNO") even tiny looks bad
    // at large sizes. Use 0 here — the long-form company name is body text.
    return (
      <PdfText style={{ fontFamily: 'CatalogDisplay', fontWeight: 700, fontSize: height * 0.78, color, letterSpacing: 0 }}>
        {(fallbackText || 'Catálogo').toUpperCase()}
      </PdfText>
    );
  };

/** Stock pill with colored dot — color depends on stock level (semantic, not brand). */
export const StockPill: FC<{ stock: number }> = ({ stock }) => {
  const isOut = !Number.isFinite(Number(stock)) || stock <= 0;
  const isLow = !isOut && stock <= 5;
  const dotColor = isOut ? '#EF4444' : isLow ? '#F59E0B' : '#10B981';
  const textColor = isOut ? '#EF4444' : isLow ? '#B45309' : '#047857';
  const label = isOut ? 'AGOTADO' : isLow ? `BAJO · ${stock}` : `STOCK · ${stock}`;
  return (
    <PdfView style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, borderWidth: 0.5, borderColor: dotColor }}>
      <PdfView style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: dotColor }} />
      {/* Stock labels are SHORT eyebrow-style ("EN STOCK · 50"), so a tiny px
          letter-spacing is fine and helps the pill read as a badge. */}
      <PdfText style={{ fontSize: 7, fontFamily: 'CatalogBody', fontWeight: 700, color: textColor, letterSpacing: 0.3 }}>
        {label}
      </PdfText>
    </PdfView>
  );
};

/**
 * Price — big integer + (optionally) smaller superscript cents.
 * V1: letterSpacing MUST be 0 (a price is body text, not an eyebrow).
 * V3: thousands = "." (never a space), symbol glued, hierarchy via font size.
 *     For COP (no cents) only the big integer renders — clean and bold.
 */
export const PriceDisplay: FC<{ price: number | undefined; currency?: string; color: string; intSize?: number }> =
  ({ price, currency, color, intSize = 22 }) => {
    const { intPart, decPart } = formatCatalogPriceParts(price, currency);
    return (
      <PdfView style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 0, letterSpacing: 0 }}>
        <PdfText style={{ fontFamily: 'CatalogDisplay', fontWeight: 700, fontSize: intSize, color, lineHeight: 1, letterSpacing: 0 }}>{intPart}</PdfText>
        {decPart ? (
          <PdfText style={{ fontFamily: 'CatalogDisplay', fontWeight: 500, fontSize: Math.round(intSize * 0.5), color, marginBottom: 2, marginLeft: 1, letterSpacing: 0 }}>{decPart}</PdfText>
        ) : null}
      </PdfView>
    );
  };

/** Return the prepared dataURL for a source, or null. */
export const getImageFor = (images: PreparedImagesMap | undefined, src?: string): string | null => {
  if (!images || !src) return null;
  return images.bySource.get(src) ?? null;
};

/**
 * Placeholder shown when a product image is broken/unavailable (V2 redesign).
 *
 * Old version printed the literal "Sin foto" in a tiny box, which clipped to
 * "SIN F" when the box was narrow — the owner saw this splattered across the
 * cover and every featured sheet. NEW version is a brand-styled panel:
 *   - dark rounded surface (mirrors a real photo cell);
 *   - a centered minimal image glyph (a framed-mountain stroke, brand accent);
 *   - a faint brand wordmark watermark at the center.
 *
 * textFit note: prefers NO text. We deliberately DO NOT call out "Sin imagen"
 * anywhere on the panel because every text-extractor pass and every narrow cell
 * conspires to clip a Spanish word into "SIN F". The icon + watermark carry the
 * intent unambiguously without printing a word that can overflow.
 *
 * Used on grid cards (small) and as the no-photo fallback on cover/featured
 * pages (callers use BrandPanel for the BIG no-photo state, not this).
 */
export const ImagePlaceholder: FC<{
  isDark: boolean;
  width: number;
  height: number;
  brand?: { primary?: string; secondary?: string; accent?: string; companyName?: string };
}> = ({ isDark, width, height, brand }) => {
  const panelBg = isDark ? '#12121C' : '#2A2A33';
  const glyphColor = brand?.accent || (isDark ? '#2FE6FF' : '#9CA3AF');
  const markColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)';
  const mark = (brand?.companyName || 'LILU TECNO').toUpperCase();
  const svgSize = Math.min(width, height) * 0.18;
  return (
    <PdfView style={{ width, height, backgroundColor: panelBg, borderRadius: 6, overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      {/* Faint wordmark watermark — never a 7px "Sin foto" that overflows to "SIN F". */}
      <PdfText style={{ position: 'absolute', top: '50%', left: 0, right: 0, textAlign: 'center', fontSize: Math.max(10, Math.round(height * 0.18)), fontWeight: 700, color: markColor as any, fontFamily: 'CatalogDisplay', letterSpacing: 2, transform: 'translateY(-50%)' }}>
        {mark}
      </PdfText>
      {/* Minimal framed-mountain glyph on top of the watermark. */}
      <PdfView style={{ width: svgSize, height: svgSize }}>
        <Svg width={svgSize} height={svgSize} viewBox="0 0 24 24">
          <PdfRect x="2.5" y="3.5" width="19" height="17" rx="1.5" stroke={glyphColor} strokeWidth="1.4" fill="transparent" />
          <PdfPath d="M4 16 L9 10 L13 14 L17 9 L20 14" stroke={glyphColor} strokeWidth="1.4" fill="transparent" strokeLinejoin="round" />
          <PdfCircle cx="8" cy="8" r="1.3" fill={glyphColor} />
        </Svg>
      </PdfView>
    </PdfView>
  );
};

// ============================================================
// TEMPLATE REGISTRY
// A template is registered lazily so the editor can render once + the engine
// can pick by id. The factory returns { id, name, vibe, Component }.
// ============================================================

export interface TemplateMeta {
  templateId: CatalogTemplateId;
  templateName: string;
  templateVibe: string;
  /** Whether this template's canvas is dark (drives signature color). */
  isDarkCanvas: boolean;
  /** Default palette snapshot fallback when none is provided. */
  defaultPalette: BrandPalette;
}

export const PLATFORM_BRAND = buildPlatformCatalogBrand();
export { PLATFORM_NAME, PLATFORM_LOGO_URL, PLATFORM_CONTACT };
export type { ProviderBranding };

/** Re-exports below are convenient for callers; type-only. */
export type { PreparedImage };
export type { FC, ReactNode };
