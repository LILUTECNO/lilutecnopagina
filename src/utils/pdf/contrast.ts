/**
 * WCAG-based contrast utilities used by:
 *   - the BrandingEditor palette tool (per-pair AA / AA-Large chips),
 *   - badge / CTA checks across the storefront.
 *
 * AA body text: 4.5:1 (small/UI).
 * AA-Large     : 3.0:1 (>= 18pt body or >= 14pt bold).
 *
 * Returns a { ratio, aa, aaLarge } verdict per pair. WARNING only — the editor
 * never hard-blocks a save (the provider might choose low-contrast on purpose
 * for big display text); it just prevents shipping unreadable body text.
 */

const clampChannel = (c: number) => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const srgbToLin = (hex: string): number => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  return 0.2126 * clampChannel(r) + 0.7152 * clampChannel(g) + 0.0722 * clampChannel(b);
};

export const contrastRatio = (a: string, b: string): number => {
  const la = srgbToLin(a) + 0.05;
  const lb = srgbToLin(b) + 0.05;
  return la > lb ? la / lb : lb / la;
};

export interface ContrastVerdict {
  ratio: number;
  passes: boolean;       // passes AA body (4.5:1) — used for body / small UI
  passesLarge: boolean;  // passes AA-Large (3:1) — used for large display text
  label: string;         // "AA ✓" / "Contraste bajo ⚠" / "Grande AA ✓ / cuerpo ✗"
}

export const verdict = (fg: string, bg: string): ContrastVerdict => {
  const ratio = contrastRatio(fg, bg);
  const passesLarge = ratio >= 3;
  const passes = ratio >= 4.5;
  let label: string;
  if (passes) label = 'AA ✓';
  else if (passesLarge) label = 'Grande AA ✓ / cuerpo ✗';
  else label = 'Contraste bajo ⚠';
  return { ratio, passes, passesLarge, label };
};

/** Convenience keys the editor consumes. Body pairs (ink-on-paper, primary-on-paper,
 *  accent-on-paper for small text); AA (4.5:1) threshold by default. */
export const contrastPairs = (palette: { ink: string; paper: string; primary: string; accent: string }) => [
  { key: 'ink-on-paper', fg: palette.ink, bg: palette.paper, label: 'Texto sobre fondo' },
  { key: 'primary-on-paper', fg: palette.primary, bg: palette.paper, label: 'Encabezados' },
  { key: 'accent-on-paper', fg: palette.accent, bg: palette.paper, label: 'Acento sobre fondo' },
];
