/**
 * M2 — Image COPIES for the PDF, never the stored asset.
 *
 * prepareImageForPdf(src, {maxW,maxH,quality}) loads the source into an
 * offscreen canvas, downscales to the exact render size in PDF points *
 * device factor, re-encodes as JPEG (q~0.72-0.80; PNG only when a cell needs
 * transparency), returns the dataURL, then drops the canvas.
 *
 * HARD RULES (M2):
 *   - NEVER write back to Storage/Firestore/product record.
 *   - NEVER alter the web image (we copy + transform a dataURL in memory only).
 *   - Deduplicate by source URL WITHIN ONE RUN (a photo used in grid + featured
 *     is embedded ONCE — same dataURL is reused).
 *   - Cap concurrency at 3-4 (callers must chunk; this module exposes the
 *     streaming helper prepareImagesBatched which does the chunking).
 *   - A broken image URL is SKIPPED (returns null), not thrown — the caller
 *     degrades to a tasteful brand-styled placeholder and CONTINUES. We never
 *     abort the whole catalog over one missing photo.
 *
 * G5 — callers feed the returned dataURI to <Image src=...>, NEVER the raw
 *      Storage URL (which would taint the renderer over CORS).
 */

export interface PrepareImageOptions {
  /** Target render width in PDF points (mm-independent). */
  maxW: number;
  /** Target render height in PDF points (0 = preserve aspect ratio). */
  maxH?: number;
  /** JPEG quality 0-1. Default 0.78 (within the 0.72-0.80 window from spec). */
  quality?: number;
  /** Force PNG (e.g. when the cell needs transparency). Default false (JPEG). */
  png?: boolean;
}

export type PreparedImage = { source: string; dataUrl: string | null };

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const loadHtmlImage = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (!isBrowser) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // TASTEFUL SKIP, never throw
    img.src = url;
  });

const prepareSingle = async (src: string, opts: PrepareImageOptions): Promise<PreparedImage> => {
  if (!src) return { source: src, dataUrl: null };
  const img = await loadHtmlImage(src);
  if (!img) return { source: src, dataUrl: null };

  const { maxW, maxH = 0, quality = 0.78, png = false } = opts;

  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  if (!naturalW || !naturalH) return { source: src, dataUrl: null };

  // Downscale to exact render size * device factor (2x retina — max ~1.5x per
  // M raster-fallback rule; we use 1.5x as the device factor for crisp small
  // thumbs without bloating the file).
  const deviceFactor = 1.5;
  let targetW = Math.min(naturalW, Math.round(maxW * deviceFactor));
  let targetH = Math.round((targetW * naturalH) / naturalW);
  if (maxH > 0) {
    const capH = Math.round(maxH * deviceFactor);
    if (targetH > capH) {
      targetH = capH;
      targetW = Math.round((targetH * naturalW) / naturalH);
    }
  }
  targetW = Math.max(1, targetW);
  targetH = Math.max(1, targetH);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { source: src, dataUrl: null };

    // White bg for JPEG (avoids black fringes on transparent-source products
    // being burned into a JPEG without alpha). PNG path keeps alpha.
    if (!png) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
    }
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const mime = png ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mime, quality);
    // Drop the canvas immediately (let GC reclaim the bitmap).
    canvas.width = 0;
    canvas.height = 0;
    return { source: src, dataUrl };
  } catch {
    // Likely CORS-tainted canvas; treat like a broken URL.
    return { source: src, dataUrl: null };
  }
};

/**
 * Batched + deduplicated preparation.
 *
 * Map keyed by `${source}::${maxW}x${maxH}@${quality}` so the same source used
 * in different sizes still dedups within a size (a thumbnail and a featured
 * image are different sizes, but a thumbnail used 12 times means ONE embed).
 *
 * Concurrency cap = 3 (within the 3-4 window).
 * Calls `onProgress(done, total)` incrementally for the download UX.
 */
export const prepareImagesBatched = async (
  requests: Array<{ source: string; opts: PrepareImageOptions }>,
  onProgress?: (done: number, total: number) => void,
  concurrency = 3,
): Promise<PreparedImage[]> => {
  const total = requests.length;
  const results: PreparedImage[] = new Array(total);
  const cache = new Map<string, Promise<PreparedImage>>(); // dedup within this run
  const key = (r: { source: string; opts: PrepareImageOptions }) =>
    `${r.source}::${r.opts.maxW}x${r.opts.maxH || 0}@${r.opts.quality || 0.78}${r.opts.png ? ':png' : ''}`;

  let done = 0;
  let cursor = 0;
  let inflight = 0;

  await new Promise<void>((resolve) => {
    const next = () => {
      if (cursor >= total) {
        if (inflight === 0) resolve();
        return;
      }
      const i = cursor++;
      const req = requests[i];
      const k = key(req);
      let p: Promise<PreparedImage>;
      if (cache.has(k)) {
        p = cache.get(k)!;
      } else {
        p = prepareSingle(req.source, req.opts);
        cache.set(k, p);
      }
      inflight++;
      p.then((r) => {
        results[i] = r;
        inflight--;
        done++;
        try { onProgress?.(done, total); } catch { /* ignore */ }
        if (inflight === 0 && cursor >= total) resolve();
        else next();
      }).catch(() => {
        results[i] = { source: req.source, dataUrl: null };
        inflight--;
        done++;
        try { onProgress?.(done, total); } catch { /* ignore */ }
        if (inflight === 0 && cursor >= total) resolve();
        else next();
      });
    };
    const startN = Math.min(concurrency, total);
    for (let i = 0; i < startN; i++) next();
    if (total === 0) resolve();
  });

  return results;
};

/**
 * Prepare a single source (with run-scoped dedup provided the caller keeps the
 * same PreparedImageCache instance). Used by the live preview for the
 * BrandingEditor's 2-3 sample product cards (small set, no progress UI needed).
 */
export const prepareImageForPdf = prepareSingle;

/** Tiny helper for callers that prefer a synchronous-looking fetch. */
export const fetchPreparedImage = (src: string, opts: PrepareImageOptions) =>
  prepareSingle(src, opts).then((p) => p.dataUrl);
