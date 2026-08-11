import { useEffect, useRef, useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';


pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface PdfPreviewProps {
  data: Blob;
}

export function PdfPreview({ data }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let doc: any = null;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const buf = await data.arrayBuffer();
        doc = await pdfjsLib.getDocument({ data: buf }).promise;
        if (cancelled) {
          doc.destroy();
          return;
        }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setPage(1);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError('Не удалось открыть PDF');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (doc) doc.destroy();
      docRef.current = null;
    };
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      const doc = docRef.current;
      const canvas = canvasRef.current;
      if (!doc || !canvas) return;
      const pdfPage = await doc.getPage(page);
      if (cancelled) return;
      const containerWidth = containerRef.current?.clientWidth ?? 600;
      const base = pdfPage.getViewport({ scale: 1 });
      const scale = Math.max(0.2, (containerWidth - 16) / base.width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({ scale: scale * dpr });
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
    };
    render().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [page, numPages, loading]);

  if (loading) {
    return <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />;
  }
  if (error) {
    return <p className="text-sm text-red-400 px-6 py-10 text-center">{error}</p>;
  }

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto flex justify-center p-2">
        <canvas ref={canvasRef} className="shadow-lg bg-white h-fit" />
      </div>
      {numPages > 1 && (
        <div className="h-12 flex-shrink-0 flex items-center justify-center gap-3 border-t border-slate-700/60 bg-slate-800/80">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-700/60 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400 tabular-nums">
            {page} / {numPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={page >= numPages}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-700/60 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
