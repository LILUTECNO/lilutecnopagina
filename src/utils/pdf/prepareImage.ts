/**
 * M2 — Image COPIES for the PDF, never the stored asset.
 *
 * OPTIONAL CORS IMAGE BRIDGE FLAG:
 * `USE_IMAGE_PROXY` (default false): when set to true, cross-origin images without
 * client-side CORS headers are routed through a public image proxy (weserv.nl)
 * to bypass browser canvas CORS taint. Dead images (404/DNS/cert) will still
 * fall back gracefully to placeholders.
 *
 * TODO(tron-business): product images are hotlinked cross-origin without CORS
 * and many are dead; migrate product imagery to own Storage with CORS so both
 * the web and the PDF render reliably. Client-side PDF cannot embed no-CORS
 * third-party pixels by design.
 */

export const USE_IMAGE_PROXY = false;

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

/**
 * Resolves source URL: if USE_IMAGE_PROXY is enabled and URL is cross-origin,
 * routes through weserv.nl proxy for client-side CORS bypassing.
 */
export const resolveImageSrc = (url: string, maxW = 320, maxH = 320): string => {
  if (!url || !USE_IMAGE_PROXY || !isBrowser) return url;
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.origin === window.location.origin) return url;
    const cleanUrl = url.replace(/^https?:\/\//, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${Math.round(maxW)}&h=${Math.round(maxH)}&output=jpg&q=80`;
  } catch {
    return url;
  }
};

/**
 * Bulletproof image loader with 8s timeout, try/catch, and onerror/ontimeout protection.
 * NEVER rejects; returns null on any error (CORS, 404, DNS, timeout, etc).
 */
const loadHtmlImage = (src: string, timeoutMs = 8000): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (!isBrowser || !src) return resolve(null);
    let resolved = false;

    const cleanup = (img: HTMLImageElement | null, timer: any) => {
      if (resolved) return;
      resolved = true;
      if (timer) clearTimeout(timer);
      if (img) {
        img.onload = null;
        img.onerror = null;
      }
      resolve(img);
    };

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timer = setTimeout(() => {
        cleanup(null, null);
      }, timeoutMs);

      img.onload = () => cleanup(img, timer);
      img.onerror = () => cleanup(null, timer);
      img.src = src;
    } catch {
      resolve(null);
    }
  });

const prepareSingle = async (src: string, opts: PrepareImageOptions): Promise<PreparedImage> => {
  if (!src) return { source: src, dataUrl: null };
  const targetUrl = resolveImageSrc(src, opts.maxW, opts.maxH || opts.maxW);
  const img = await loadHtmlImage(targetUrl);
  if (!img) return { source: src, dataUrl: null };

  const { maxW, maxH = 0, quality = 0.78, png = false } = opts;

  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  if (!naturalW || !naturalH) return { source: src, dataUrl: null };

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

    if (!png) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
    }
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const mime = png ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mime, quality);
    canvas.width = 0;
    canvas.height = 0;
    return { source: src, dataUrl };
  } catch {
    // Canvas SecurityError (CORS-tainted); return null so template renders brand placeholder.
    return { source: src, dataUrl: null };
  }
};

/**
 * Batched + deduplicated preparation.
 */
export const prepareImagesBatched = async (
  requests: Array<{ source: string; opts: PrepareImageOptions }>,
  onProgress?: (done: number, total: number) => void,
  concurrency = 3,
): Promise<PreparedImage[]> => {
  const total = requests.length;
  const results: PreparedImage[] = new Array(total);
  const cache = new Map<string, Promise<PreparedImage>>();
  const key = (r: { source: string; opts: PrepareImageOptions }) =>
    `${r.source}::${r.opts.maxW}x${r.opts.maxH || 0}@${r.opts.quality || 0.78}${r.opts.png ? ':png' : ''}`;

  let done = 0;
  let cursor = 0;
  let inflight = 0;
  let failedCount = 0;

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
        if (!r.dataUrl) failedCount++;
        inflight--;
        done++;
        try { onProgress?.(done, total); } catch { /* ignore */ }
        if (inflight === 0 && cursor >= total) resolve();
        else next();
      }).catch(() => {
        results[i] = { source: req.source, dataUrl: null };
        failedCount++;
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

  if (total > 0) {
    console.info(`[PDF Catalog] Summary: ${failedCount} de ${total} imágenes no se pudieron incluir (CORS/enlaces caídos) y usarán imagen por defecto.`);
  }

  return results;
};

export const prepareImageForPdf = prepareSingle;

export const fetchPreparedImage = (src: string, opts: PrepareImageOptions) =>
  prepareSingle(src, opts).then((p) => p.dataUrl);
