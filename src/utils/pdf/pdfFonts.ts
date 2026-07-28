/**
 * PDF fonts + renderer init — registered ONCE, shared by:
 *   - the BrandingEditor live preview (<PDFViewer>), and
 *   - the download path (pdf().toBlob()).
 *
 * Loaded lazily through the encapsulating module boundary (catalogPdf.ts uses
 * dynamic import) so the main bundle never contains @react-pdf/renderer
 * (G1 lazy-load guardrail).
 *
 * G4 — minimal weights: two families (display + body), one/two weights each.
 *   display: "Saira Semi Condensed" — premium/technical, condensed display
 *            geometry that reads as the web's Chakra Petch / Cinzel vibe
 *            without forcing the user's Cinzel font (Cinzel being decorative
 *            serif would be unreadable for product prices). Weights 700 + 500.
 *   body:    "Inter" — readable body; matches the web's Plus Jakarta Sans
 *            family feel. Weights 400 + 700.
 *
 * Source URLs are Google Fonts' Latin-cut TTF files (Mozilla UA), open license
 * (OFL) so they can be embedded legally. If a fetch fails, the renderer falls
 * back to the built-in "Helvetica" — the PDF never blank-pages (Win Ansi
 * subset of Helvetica ships with the renderer).
 *
 * Registration is idempotent (guarded by `__fontsRegistered`).
 */

let __fontsRegistered = false;

export const ensurePdfFonts = async (): Promise<void> => {
  if (__fontsRegistered) return;
  const { Font } = await import('@react-pdf/renderer');

  const safeRegister = async (family: string, src: string, fontWeight: 400 | 500 | 700) => {
    try {
      Font.register({ family, fonts: [{ src, fontWeight, fontStyle: 'normal' }] });
    } catch {
      /* tolerate registration errors; renderer falls back to Helvetica */
    }
  };

  await Promise.all([
    safeRegister('CatalogDisplay', 'https://fonts.gstatic.com/s/sairasemicondensed/v15/U9MM6c-2-nnJkHxyCjRcnMHcWVWV1cWRRXf_S8MW.ttf', 500),
    safeRegister('CatalogDisplay', 'https://fonts.gstatic.com/s/sairasemicondensed/v15/U9MM6c-2-nnJkHxyCjRcnMHcWVWV1cWRRXe3TcMW.ttf', 700),
    safeRegister('CatalogBody', 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf', 400),
    safeRegister('CatalogBody', 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf', 700),
  ]);

  try {
    Font.registerHyphenationCallback((word: string) => [word]);
  } catch {
    /* older renderer API: ignore */
  }

  __fontsRegistered = true;
};

/** Display + Body family names for templates to consume (constants; never inline). */
export const FONT_FAMILY = {
  display: 'CatalogDisplay',
  body: 'CatalogBody',
  fallback: 'Helvetica',
} as const;
