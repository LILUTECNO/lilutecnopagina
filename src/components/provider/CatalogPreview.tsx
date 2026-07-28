/**
 * CatalogPreview — wraps the @react-pdf <PDFViewer> for the BrandingEditor.
 *
 * Lazy-loaded (G1): this entire component lives in a SEPARATE chunk from the
 * editor; rolled up dynamically via the editor's useEffect import. The
 * heavy react-pdf runtime lands here, so the editor's HTML+form controls do
 * NOT pull the renderer into the main bundle.
 *
 * Pipeline:
 *  - Sample 2-3 preview products passed in by the editor.
 *  - prepareImageForPdf runs over the products' photos at grid-thumb size
 *    (maxW 320, q 0.78) to mirror the download path's image quality.
 *  - buildCatalogDocument({brand, products, images}) is the SAME Document
 *    tree the download path emits (G2 single source of truth).
 *  - ensurePdfFonts() called once for preview + share.
 */

import React, { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import type { ProviderBranding, Product } from '../../types';
import { ensurePdfFonts } from '../../utils/pdf/pdfFonts';
import { prepareImagesBatched } from '../../utils/pdf/prepareImage';

interface CatalogPreviewProps {
  branding: ProviderBranding;
  products: Product[];
}

const INNER: React.FC<CatalogPreviewProps> = ({ branding, products }) => {
  const [ready, setReady] = useState(false);
  const [docEl, setDocEl] = useState<React.ReactElement | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await ensurePdfFonts();
        const { buildCatalogDocument, SKIN_BY_ID } = await import('../../utils/pdf/templates/catalogLayout');
        const skin = SKIN_BY_ID[branding.templateId];
        // prepare the few sample images COPIES (no stored-asset mutation).
        const sources: { source: string; opts: { maxW: number; maxH?: number; quality?: number } }[] = [];
        const seen = new Set<string>();
        for (const p of products) for (const s of (p.images || [])) {
          if (!s || seen.has(s)) continue;
          seen.add(s);
          sources.push({ source: s, opts: { maxW: 320, maxH: 320, quality: 0.78 } });
        }
        const prepared = await prepareImagesBatched(sources, undefined, 3);
        const bySource = new Map<string, string | null>();
        for (const r of prepared) bySource.set(r.source, r.dataUrl);
        if (!active) return;
        const doc = buildCatalogDocument({ brand: branding, products, images: { bySource } }, skin);
        if (!active) return;
        setDocEl(doc as React.ReactElement);
        setReady(true);
      } catch (e: any) {
        setErr(String(e?.message || e));
      }
    })();
    return () => { active = false; };
  }, [branding, products]);

  // Lazy-load the PDFViewer itself so the renderer is in a single shared chunk
  // with the rest of the PDF usage (it is imported once by the editor's own
  // useEffect + here; both resolve to the SAME chunk hash).
  const [Viewer, setViewer] = useState<ComponentType<{ children: React.ReactNode; showToolbar?: boolean; style?: React.CSSProperties; }> | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mod = await import('@react-pdf/renderer');
        const V = (mod as any).PDFViewer as ComponentType<{ children: React.ReactNode; showToolbar?: boolean; style?: React.CSSProperties; }>;
        if (active) setViewer(() => V);
      } catch (e: any) {
        if (active) setErr(String(e?.message || e));
      }
    })();
    return () => { active = false; };
  }, []);

  if (err) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-xs p-6">
        Vista previa no disponible: {err}
      </div>
    );
  }
  if (!ready || !Viewer || !docEl) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-[10px] uppercase tracking-widest">
        Preparando vista previa…
      </div>
    );
  }

  const V = Viewer;
  return (
    <V showToolbar={false} style={{ width: '100%', height: '100%', minHeight: 480, border: 0 }}>
      {docEl}
    </V>
  );
};

const CatalogPreview: React.FC<CatalogPreviewProps> = (props) => <INNER {...props} />;
export default CatalogPreview;
