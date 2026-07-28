/**
 * PDF fonts + renderer init — registered ONCE, shared by:
 *   - the BrandingEditor live preview (<PDFViewer>), and
 *   - the download path (pdf().toBlob()).
 *
 * Loaded lazily through the encapsulating module boundary (catalogPdf.ts uses
 * dynamic import) so the main bundle never contains @react-pdf/renderer
 * (G1 lazy-load guardrail).
 *
 * SELF-HOSTED LOCAL FONTS (in public/fonts/):
 *   display: "Chakra Petch" (Medium 500, Bold 700) -> /fonts/ChakraPetch-Medium.ttf & Bold.ttf
 *   body:    "Plus Jakarta Sans" (Regular 400, Bold 700) -> /fonts/PlusJakartaSans-Regular.ttf & Bold.ttf
 *
 * FONT-LEVEL FALLBACK BELT:
 *   If any font fails to load at render time, Font.register error handling
 *   ensures the renderer gracefully falls back to built-in 'Helvetica'.
 *   Zero remote font URLs (fonts.gstatic / fonts.googleapis) are used.
 */

let __fontsRegistered = false;

export const ensurePdfFonts = async (): Promise<void> => {
  if (__fontsRegistered) return;
  const { Font } = await import('@react-pdf/renderer');

  const registerFamily = (family: string, fonts: Array<{ src: string; fontWeight: 400 | 500 | 700; fontStyle?: 'normal' | 'italic' }>) => {
    try {
      Font.register({ family, fonts: fonts.map((f) => ({ src: f.src, fontWeight: f.fontWeight, fontStyle: f.fontStyle || 'normal' })) });
    } catch (e) {
      console.warn(`[PDF Font Fallback] Failed to register ${family}, using Helvetica fallback:`, e);
    }
  };

  registerFamily('CatalogDisplay', [
    { src: '/fonts/ChakraPetch-Medium.ttf', fontWeight: 500 },
    { src: '/fonts/ChakraPetch-Bold.ttf', fontWeight: 700 },
  ]);

  registerFamily('CatalogBody', [
    { src: '/fonts/PlusJakartaSans-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/PlusJakartaSans-Bold.ttf', fontWeight: 700 },
  ]);

  try {
    Font.registerHyphenationCallback((word: string) => [word]);
  } catch {
    /* older renderer API: ignore */
  }

  __fontsRegistered = true;
};

/** Display + Body family names for templates to consume. */
export const FONT_FAMILY = {
  display: 'CatalogDisplay',
  body: 'CatalogBody',
  fallback: 'Helvetica',
} as const;
