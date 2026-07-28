/**
 * Shared catalog layout — one engine, several skins.
 *
 * Consumes (brand, products, optional prepared images) + a "skin" descriptor
 * that picks the canvas dark/light, the cover photo shape, headline weight,
 * and the editorial-vs-grid margins. All three templates
 * (tron-night / minimal-light / editorial) use this same component and differ
 * ONLY via the skin descriptor + the brand palette (the brand object decides
 * the hues; the template decides light/dark canvas + cover treatment).
 *
 * G2 (single source of truth) + G3 (halos via wrapper, not box-shadow) +
 * G4 (fonts: CatalogDisplay / CatalogBody) + G5 (PdfImage takes a dataURL).
 */

import { Document, Page, Image as PdfImage, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { FC } from 'react';
import type { Product } from '../../../types';
import { TEMPLATE_DEFAULT_PALETTES } from '../../../types';
import type { CatalogTemplateId, ProviderBranding } from '../../../types';
import {
  BrandLogo,
  ImagePlaceholder,
  LiluSignature,
  PriceDisplay,
  StockPill,
  getImageFor,
} from './commonTemplate';
import type { TemplateProps } from './commonTemplate';

const PAGE_W = 595.28;
const PAGE_H = 841.89;

const GRID_COLS = 3;
const GRID_PAGE = GRID_COLS * 3;

export interface CatalogSkin {
  /** Stable id matching CatalogTemplateId. */
  templateId: CatalogTemplateId;
  /** Human label (es). */
  templateName: string;
  /** One-line vibe (es). */
  templateVibe: string;
  /** Whether the canvas is dark (drives signature color + dark-on-dark guard). */
  isDarkCanvas: boolean;
  /** Cover photo aspect shape: 'square' (minimal) / 'wide-bar' (tron, full-bleed hero) / 'editorial-frame' (warm frame inset). */
  coverShape: 'square' | 'wide-bar' | 'editorial-frame';
  /** Page horizontal padding. */
  pagePadding: number;
  /** Gutter between grid cells. */
  gridGap: number;
  /** Headline face: 'CatalogDisplay' or 'CatalogBody'. */
  headlineFace: 'CatalogDisplay' | 'CatalogBody';
  /** Larger gap above the price block. */
  editorialSpacing: boolean;
}

const StockPageHeader: FC<{ brand: ProviderBranding; pageNum: number }> = ({ brand, pageNum }) => {
  const palette = brand.palette;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: palette.secondary }}>
      <Text style={{ fontFamily: 'CatalogDisplay', fontWeight: 700, fontSize: 10, color: palette.primary, letterSpacing: 1.5, textTransform: 'uppercase' }}>
        {(brand.companyName || 'Catálogo') + ' · Catálogo'}
      </Text>
      <Text style={{ fontSize: 8, color: palette.secondary }}>Página {pageNum}</Text>
    </View>
  );
};

const ProductCard: FC<{
  product: Product;
  brand: ProviderBranding;
  images: TemplateProps['images'];
  width: number;
  skin: CatalogSkin;
}> = ({ product, brand, images, width, skin }) => {
  const palette = brand.palette;
  const img = getImageFor(images, product.images?.[0]);
  const photoH = Math.round(width * 0.6);

  return (
    <View style={{ width, backgroundColor: skin.isDarkCanvas ? palette.paper : '#FFFFFF', borderRadius: skin.templateId === 'editorial' ? 0 : 8, borderWidth: 0.5, borderColor: palette.secondary, overflow: 'hidden', position: 'relative' }}>
      {/* Accent corner tick top-right */}
      <View style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderTopWidth: 2, borderRightWidth: 2, borderColor: palette.primary }} />
      {/* Halo wrapper: dark panel = paper-tinted bg + small padding (NOT box-shadow). */}
      <View style={{ backgroundColor: palette.paper, padding: 4, borderBottomWidth: 0.5, borderBottomColor: palette.secondary }}>
        {img ? (
          <PdfImage src={img} style={{ width: width - 8, height: photoH, objectFit: 'cover', borderRadius: skin.templateId === 'editorial' ? 0 : 4 }} />
        ) : (
          <ImagePlaceholder isDark={skin.isDarkCanvas} width={width - 8} height={photoH} />
        )}
      </View>
      <View style={{ padding: skin.editorialSpacing ? 12 : 10, gap: 3, flexGrow: 1 }}>
        <Text style={{ fontFamily: skin.headlineFace, fontWeight: 700, fontSize: skin.templateId === 'editorial' ? 12 : 11, color: palette.ink, lineHeight: 1.2 }}>
          {(product.name || '—').slice(0, 70)}
        </Text>
        <Text style={{ fontSize: 8, color: palette.secondary, lineHeight: 1.2 }}>
          {(product.summary || '').slice(0, 90)}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: skin.editorialSpacing ? 8 : 4 }}>
          <PriceDisplay price={product.price} color={palette.primary} />
          <StockPill stock={product.stock} />
        </View>
      </View>
    </View>
  );
};

const FeaturedPage: FC<TemplateProps & { index: number; skin: CatalogSkin }> = ({ brand, products, images, index, skin }) => {
  const palette = brand.palette;
  const product = products[index];
  if (!product) return null;
  const hero = getImageFor(images, product.images?.[0]);
  const thumbs = (product.images || []).slice(1, 6).map((src) => ({ src, data: getImageFor(images, src) }));

  return (
    <Page size={[PAGE_W, PAGE_H]} style={{ padding: skin.pagePadding, fontFamily: 'CatalogBody', position: 'relative', backgroundColor: palette.paper, color: palette.ink }}>
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 18 }}>
        <View style={{ flex: 1.1 }}>
          {hero ? (
            <PdfImage src={hero} style={{ width: '100%', height: 360, objectFit: 'cover', borderRadius: skin.templateId === 'editorial' ? 0 : 6 }} />
          ) : (
            <ImagePlaceholder isDark={skin.isDarkCanvas} width={300} height={360} />
          )}
        </View>
        <View style={{ flex: 1, gap: 12, justifyContent: 'space-between' }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: skin.headlineFace, fontWeight: 700, fontSize: 22, color: palette.ink, lineHeight: 1.1 }}>
              {(product.name || '—').slice(0, 50)}
            </Text>
            <Text style={{ fontSize: 9, color: palette.secondary, lineHeight: 1.3 }}>
              {(product.summary || '').slice(0, 110)}
            </Text>
          </View>
          <Text style={{ fontFamily: 'CatalogDisplay', fontWeight: 700, fontSize: 8, color: palette.primary, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Características Técnicas
          </Text>
          <View style={{ gap: 4 }}>
            {(product.features || []).slice(0, 6).map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={{ fontSize: 8, color: palette.primary }}>{i + 1}.</Text>
                <Text style={{ fontSize: 9, color: palette.ink, lineHeight: 1.3, flex: 1 }}>{String(f)}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <PriceDisplay price={product.price} color={palette.primary} />
            <StockPill stock={product.stock} />
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {thumbs.map((t, i) => (
          <View key={i} style={{ width: 54, height: 54, borderRadius: 4 }}>
            {t.data ? (
              <PdfImage src={t.data} style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 4 }} />
            ) : (
              <ImagePlaceholder isDark={skin.isDarkCanvas} width={54} height={54} />
            )}
          </View>
        ))}
      </View>
      <LiluSignature darkCanvas={skin.isDarkCanvas} />
    </Page>
  );
};

const CoverPage: FC<TemplateProps & { skin: CatalogSkin }> = ({ brand, images, products, skin }) => {
  const palette = brand.palette;
  const cover = getImageFor(images, products[0]?.images?.[0]);

  let coverBlock: React.ReactNode = null;
  if (skin.coverShape === 'wide-bar') {
    coverBlock = (
      <View style={{ width: '100%', height: 380, backgroundColor: palette.secondary, padding: 14, borderRadius: 12 }}>
        {cover ? (
          <PdfImage src={cover} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
        ) : (
          <ImagePlaceholder isDark={skin.isDarkCanvas} width={460} height={360} />
        )}
      </View>
    );
  } else if (skin.coverShape === 'editorial-frame') {
    coverBlock = (
      <View style={{ width: '100%', height: 380, borderWidth: 4, borderColor: palette.primary, padding: 10, backgroundColor: palette.paper }}>
        {cover ? (
          <PdfImage src={cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <ImagePlaceholder isDark={skin.isDarkCanvas} width={460} height={356} />
        )}
      </View>
    );
  } else {
    coverBlock = (
      <View style={{ width: '100%', height: 380, backgroundColor: palette.secondary, padding: 14, borderRadius: 12 }}>
        {cover ? (
          <PdfImage src={cover} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
        ) : (
          <ImagePlaceholder isDark={skin.isDarkCanvas} width={460} height={360} />
        )}
      </View>
    );
  }

  return (
    <Page size={[PAGE_W, PAGE_H]} style={{ padding: skin.pagePadding, fontFamily: 'CatalogBody', position: 'relative', backgroundColor: palette.paper, color: palette.ink, flexDirection: 'column', justifyContent: 'space-between' }}>
      <View style={{ gap: 8 }}>
        <BrandLogo brand={brand} fallbackText={brand.companyName || ''} height={42} color={palette.primary} />
        <Text style={{ fontSize: 11, color: palette.secondary, maxWidth: 340 }}>{brand.tagline || ''}</Text>
      </View>
      {coverBlock}
      <View style={{ gap: 4, alignItems: 'flex-start' }}>
        <View style={{ width: 60, height: 3, backgroundColor: palette.primary, marginBottom: 6 }} />
        <Text style={{ fontFamily: skin.headlineFace, fontWeight: 700, fontSize: 30, color: palette.ink }}>Catálogo</Text>
        <Text style={{ fontSize: 10, color: palette.secondary }}>{new Date().toLocaleDateString('es-CO')}</Text>
      </View>
      <LiluSignature darkCanvas={skin.isDarkCanvas} />
    </Page>
  );
};

const BackCover: FC<Pick<TemplateProps, 'brand'> & { skin: CatalogSkin }> = ({ brand, skin }) => {
  const palette = brand.palette;
  const c = brand.contact || {};
  return (
    <Page size={[PAGE_W, PAGE_H]} style={{ padding: skin.pagePadding, fontFamily: 'CatalogBody', backgroundColor: palette.paper, color: palette.ink, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
      <BrandLogo brand={brand} fallbackText={brand.companyName || ''} height={36} color={palette.primary} />
      <Text style={{ fontSize: 10, color: palette.secondary, maxWidth: 360, textAlign: 'center' }}>{brand.tagline || ''}</Text>
      <View style={{ marginTop: 16, gap: 3, alignItems: 'center' }}>
        {c.web ? <Text style={{ fontSize: 10, color: palette.primary }}>{c.web}</Text> : null}
        {c.email ? <Text style={{ fontSize: 10, color: palette.secondary }}>{c.email}</Text> : null}
        {c.phone ? <Text style={{ fontSize: 10, color: palette.secondary }}>{c.phone}</Text> : null}
        {c.address ? <Text style={{ fontSize: 9, color: palette.secondary }}>{c.address}</Text> : null}
      </View>
      <LiluSignature darkCanvas={skin.isDarkCanvas} mode="cover" />
    </Page>
  );
};

const styles = StyleSheet.create({ page: { fontFamily: 'CatalogBody', position: 'relative' } as any });

const EmptyPage: FC<{ brand: ProviderBranding; skin: CatalogSkin }> = ({ brand, skin }) => {
  const palette = brand.palette;
  return (
    <Page size={[PAGE_W, PAGE_H]} style={{ padding: skin.pagePadding, fontFamily: 'CatalogBody', backgroundColor: palette.paper, color: palette.ink, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
      <Text style={{ fontFamily: skin.headlineFace, fontWeight: 700, fontSize: 24, color: palette.ink }}>
        Aún no hay productos en tu catálogo
      </Text>
      <Text style={{ fontSize: 11, color: palette.secondary }}>
        Cuando agregues productos, aparecerán aquí en tu catálogo de marca.
      </Text>
      <LiluSignature darkCanvas={skin.isDarkCanvas} mode="cover" />
    </Page>
  );
};

const GridPage: FC<{
  brand: ProviderBranding;
  products: Product[];
  images: TemplateProps['images'];
  skin: CatalogSkin;
  pageNum: number;
  cellW: number;
}> = ({ brand, products, images, skin, pageNum, cellW }) => {
  const palette = brand.palette;
  return (
    <Page size={[PAGE_W, PAGE_H]} style={{ ...styles.page, padding: skin.pagePadding, backgroundColor: palette.paper, color: palette.ink }}>
      <StockPageHeader brand={brand} pageNum={pageNum} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: skin.gridGap }}>
        {products.map((p, i) => (
          <ProductCard key={p.id || i} product={p} brand={brand} images={images} width={cellW} skin={skin} />
        ))}
      </View>
      <LiluSignature darkCanvas={skin.isDarkCanvas} />
    </Page>
  );
};

/**
 * buildCatalogDocument — the shared engine that arrives at the Document root
 * consumed by {@link PDFViewer} (preview) AND by pdf().toBlob() (download).
 * The skin descriptor picks the variant.
 */
export const buildCatalogDocument = (props: TemplateProps, skin: CatalogSkin): React.ReactElement => {
  const { brand, products } = props;
  const palette = brand.palette;

  if (!products || products.length === 0) {
    return (
      <Document>
        <EmptyPage brand={brand} skin={skin} />
      </Document>
    );
  }

  const width = PAGE_W - skin.pagePadding * 2 - skin.gridGap * (GRID_COLS - 1);
  const cellW = Math.floor(width / GRID_COLS);
  const groupedPages: Product[][] = [];
  for (let i = 0; i < products.length; i += GRID_PAGE) {
    groupedPages.push(products.slice(i, i + GRID_PAGE));
  }
  const featuredIdxs: number[] = [];
  for (let i = GRID_PAGE - 1; i < products.length && featuredIdxs.length < 3; i += GRID_PAGE) {
    featuredIdxs.push(Math.min(i, products.length - 1));
  }

  const sharedImages = props.images ? { bySource: new Map(props.images.bySource) } : { bySource: new Map<string, string | null>() };

  // AA guard for dark canvas (rule 8): dark templates must keep light text on
  // dark surfaces. If a provider's ink somehow fell dark, force light text.
  const aaInkCanvasHack = skin.isDarkCanvas
    ? (() => {
        const LUMA_DARK = 0.18 * 255;
        const lum = (hex: string) => {
          const h = hex.replace('#', '');
          const r = parseInt(h.substring(0, 2), 16);
          const g = parseInt(h.substring(2, 4), 16);
          const b = parseInt(h.substring(4, 6), 16);
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        return lum(palette.ink) < LUMA_DARK ? { ink: '#EAFBFF', secondary: '#8E90AC', primary: palette.primary } : null;
      })()
    : null;
  const safeBrand = aaInkCanvasHack
    ? { ...brand, palette: { ...palette, ink: aaInkCanvasHack.ink, secondary: aaInkCanvasHack.secondary } }
    : brand;

  return (
    <Document>
      <CoverPage brand={safeBrand} products={products} images={sharedImages} skin={skin} />
      {groupedPages.map((pageProducts, pgi) => (
        <GridPage key={`g-${pgi}`} brand={safeBrand} products={pageProducts} images={sharedImages} skin={skin} pageNum={pgi + 2} cellW={cellW} />
      ))}
      {featuredIdxs.map((idx) => (
        <FeaturedPage key={`f-${idx}`} brand={safeBrand} products={products} images={sharedImages} index={idx} skin={skin} />
      ))}
      <BackCover brand={safeBrand} skin={skin} />
    </Document>
  );
};

// ============================================================
// SKIN PRESETS (3 templates)
// ============================================================

export const SKIN_TRON_NIGHT: CatalogSkin = {
  templateId: 'tron-night',
  templateName: 'Tron Night',
  templateVibe: 'Tecnología oscura, acentos neón',
  isDarkCanvas: true,
  coverShape: 'wide-bar',
  pagePadding: 34,
  gridGap: 16,
  headlineFace: 'CatalogDisplay',
  editorialSpacing: false,
};

export const SKIN_MINIMAL_LIGHT: CatalogSkin = {
  templateId: 'minimal-light',
  templateName: 'Minimal Clara',
  templateVibe: 'Limpia y directa, la luz hace protagonista al producto',
  isDarkCanvas: false,
  coverShape: 'square',
  pagePadding: 36,
  gridGap: 16,
  headlineFace: 'CatalogDisplay',
  editorialSpacing: false,
};

export const SKIN_EDITORIAL: CatalogSkin = {
  templateId: 'editorial',
  templateName: 'Editorial',
  templateVibe: 'Revista, tipografía fina y marcos cálidos',
  isDarkCanvas: false,
  coverShape: 'editorial-frame',
  pagePadding: 42,
  gridGap: 18,
  headlineFace: 'CatalogDisplay',
  editorialSpacing: true,
};

export const SKIN_BY_ID: Record<CatalogTemplateId, CatalogSkin> = {
  'tron-night': SKIN_TRON_NIGHT,
  'minimal-light': SKIN_MINIMAL_LIGHT,
  'editorial': SKIN_EDITORIAL,
};

export const TEMPLATE_DEFAULT_FOR: Record<CatalogTemplateId, ProviderBranding['palette']> = {
  'tron-night': TEMPLATE_DEFAULT_PALETTES['tron-night'],
  'minimal-light': TEMPLATE_DEFAULT_PALETTES['minimal-light'],
  'editorial': TEMPLATE_DEFAULT_PALETTES['editorial'],
};
