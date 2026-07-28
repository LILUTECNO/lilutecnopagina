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

import type { FC, ReactNode } from 'react';
import { Image as PdfImage, Link as PdfLink, Text as PdfText, View as PdfView } from '@react-pdf/renderer';
import type { BrandPalette, CatalogTemplateId, ProviderBranding } from '../../../types';
import type { Product } from '../../../types';
import { PLATFORM_NAME, PLATFORM_CONTACT, PLATFORM_LOGO_URL, buildPlatformCatalogBrand } from '../../platformBrand';
import type { PreparedImage } from '../prepareImage';

/** Currency formatting: pulls from the product's currency (default COP per app). */
const formatCatalogPrice = (price: number | string | undefined, currency?: string): string => {
  const n = typeof price === 'string' ? parseFloat(price) : (price ?? 0);
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${n.toLocaleString('es-CO')}`;
  }
};

const priceParts = (price: number | undefined, currency?: string): { intPart: string; decPart: string } => {
  const formatted = formatCatalogPrice(price, currency);
  // Split into integer magnitude + the rest; rendered as big-int + small-decimals per the reference.
  const m = formatted.match(/^([^\d]*)(\d[\d.]*)(,?\d*)?$/);
  if (!m) return { intPart: formatted, decPart: '' };
  const cur = m[1] || '';
  const int = m[2] || '';
  const dec = m[3] || '';
  return { intPart: `${cur}${int}`, decPart: dec };
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
      <PdfText style={{ fontSize: 8, color: ink, fontFamily: 'CatalogDisplay', fontWeight: 700, letterSpacing: 0.5 }}>
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
      <PdfText style={{ fontSize: 11, color: ink as any, fontFamily: 'CatalogDisplay', fontWeight: 700, letterSpacing: 1 }}>
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
    return (
      <PdfText style={{ fontFamily: 'CatalogDisplay', fontWeight: 700, fontSize: height * 0.78, color, letterSpacing: 0.5 }}>
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
      <PdfText style={{ fontSize: 7, fontFamily: 'CatalogBody', fontWeight: 700, color: textColor, letterSpacing: 0.6 }}>
        {label}
      </PdfText>
    </PdfView>
  );
};

/** Price — big integer + small decimals (per the reference image structure). */
export const PriceDisplay: FC<{ price: number | undefined; currency?: string; color: string }> =
  ({ price, currency, color }) => {
    const { intPart, decPart } = priceParts(price, currency);
    return (
      <PdfView style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 0 }}>
        <PdfText style={{ fontFamily: 'CatalogDisplay', fontWeight: 700, fontSize: 22, color, lineHeight: 1 }}>{intPart}</PdfText>
        {decPart ? (
          <PdfText style={{ fontFamily: 'CatalogDisplay', fontWeight: 500, fontSize: 11, color, marginBottom: 2, marginLeft: 1 }}>{decPart}</PdfText>
        ) : null}
      </PdfView>
    );
  };

/** Return the prepared dataURL for a source, or null. */
export const getImageFor = (images: PreparedImagesMap | undefined, src?: string): string | null => {
  if (!images || !src) return null;
  return images.bySource.get(src) ?? null;
};

/** Placeholder view shown when a product image is broken/unavailable. */
export const ImagePlaceholder: FC<{ isDark: boolean; width: number; height: number }> =
  ({ isDark, width, height }) => {
    const ink = isDark ? '#8E90AC' : '#9A9AA8';
    return (
      <PdfView style={{ width, height, backgroundColor: 'transparent', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
        <PdfText style={{ fontSize: 7, color: ink, fontFamily: 'CatalogBody', letterSpacing: 0.6, textTransform: 'uppercase' }}>
          Sin foto
        </PdfText>
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
