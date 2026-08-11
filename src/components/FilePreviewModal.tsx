import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Loader2, FileQuestion } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FileItem } from '../types/database';
import { PdfPreview } from './PdfPreview';


export type PreviewKind = 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'none';

export function getPreviewKind(file: { file_type: string; filename: string }): PreviewKind {
  const type = (file.file_type || '').toLowerCase();
  const name = (file.filename || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop()! : '';

  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) {
    return 'image';
  }
  if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (type.startsWith('video/') || ['mp4', 'webm', 'mov', 'ogv'].includes(ext)) return 'video';
  if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
  if (
    type.startsWith('text/') ||
    type === 'application/json' ||
    ['txt', 'md', 'csv', 'json', 'log', 'xml', 'yml', 'yaml', 'ts', 'tsx', 'js', 'jsx', 'css', 'html'].includes(ext)
  ) {
    return 'text';
  }
  return 'none';
}

export function isPreviewable(file: { file_type: string; filename: string }) {
  return getPreviewKind(file) !== 'none';
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 20;

function clampZoom(scale: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

interface ZoomableImageProps {
  src: string;
  alt: string;
}

function ZoomableImage({ src, alt }: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const transformRef = useRef({ scale: 1, x: 0, y: 0 });
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    startDist: number;
    startScale: number;
    startTranslate: { x: number; y: number };
    startPointer: { x: number; y: number };
    center: { x: number; y: number };
  }>({
    mode: 'none',
    startDist: 0,
    startScale: 1,
    startTranslate: { x: 0, y: 0 },
    startPointer: { x: 0, y: 0 },
    center: { x: 0, y: 0 },
  });
  const baseSizeRef = useRef({ w: 0, h: 0 });
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const clampTranslate = useCallback((scale: number, x: number, y: number) => {
    const container = containerRef.current;
    if (!container) return { x, y };
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const bw = baseSizeRef.current.w;
    const bh = baseSizeRef.current.h;
    if (!bw || !bh) return { x: 0, y: 0 };

    const sw = bw * scale;
    const sh = bh * scale;
    const maxX = Math.max(0, (sw - cw) / 2);
    const maxY = Math.max(0, (sh - ch) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const commitTransform = useCallback(
    (scale: number, x: number, y: number) => {
      const clamped = clampTranslate(scale, x, y);
      const next = { scale, ...clamped };
      transformRef.current = next;
      setTransform(next);
    },
    [clampTranslate]
  );

  const resetBaseSize = useCallback(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    baseSizeRef.current = { w: img.clientWidth, h: img.clientHeight };
    commitTransform(1, 0, 0);
  }, [commitTransform]);

  useEffect(() => {
    resetBaseSize();
    const onResize = () => resetBaseSize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [src, resetBaseSize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const current = transformRef.current;
      const nextScale = clampZoom(current.scale * Math.exp(-dy * 0.0015));
      const px = e.clientX - rect.left - rect.width / 2;
      const py = e.clientY - rect.top - rect.height / 2;
      const tx = current.x + (px - current.x) * (1 - nextScale / current.scale);
      const ty = current.y + (py - current.y) * (1 - nextScale / current.scale);
      commitTransform(nextScale, tx, ty);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [commitTransform]);

  const getMidpoint = useCallback(() => {
    const pts = Array.from(pointersRef.current.values());
    if (pts.length < 2) return pts[0] ?? { x: 0, y: 0 };
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    pointersRef.current.set(e.pointerId, { x, y });

    if (pointersRef.current.size === 1 && lastTapRef.current) {
      const dx = x - lastTapRef.current.x;
      const dy = y - lastTapRef.current.y;
      const dt = Date.now() - lastTapRef.current.time;
      if (dt < DOUBLE_TAP_MS && Math.hypot(dx, dy) < DOUBLE_TAP_DISTANCE_PX) {
        const current = transformRef.current;
        if (current.scale > 1.2) {
          commitTransform(1, 0, 0);
        } else {
          const nextScale = 2.5;
          commitTransform(nextScale, x * (1 - nextScale), y * (1 - nextScale));
        }
        lastTapRef.current = null;
        gestureRef.current.mode = 'none';
        return;
      }
    }
    lastTapRef.current = { time: Date.now(), x, y };

    if (pointersRef.current.size === 1) {
      setIsGesturing(true);
      gestureRef.current = {
        ...gestureRef.current,
        mode: 'pan',
        startPointer: { x, y },
        startTranslate: transformRef.current,
        center: { x, y },
      };
    } else if (pointersRef.current.size === 2 && gestureRef.current.mode !== 'pinch') {
      const [p1, p2] = Array.from(pointersRef.current.values());
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      gestureRef.current = {
        mode: 'pinch',
        startDist: dist,
        startScale: transformRef.current.scale,
        startTranslate: transformRef.current,
        startPointer: { x, y },
        center: getMidpoint(),
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!pointersRef.current.has(e.pointerId)) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    pointersRef.current.set(e.pointerId, { x, y });

    const gesture = gestureRef.current;
    if (gesture.mode === 'pan' && pointersRef.current.size === 1) {
      const tx = gesture.startTranslate.x + (x - gesture.startPointer.x);
      const ty = gesture.startTranslate.y + (y - gesture.startPointer.y);
      commitTransform(transformRef.current.scale, tx, ty);
    } else if (gesture.mode === 'pinch' && pointersRef.current.size === 2) {
      const [p1, p2] = Array.from(pointersRef.current.values());
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const nextScale = clampZoom(gesture.startScale * (dist / gesture.startDist));
      const P = getMidpoint();
      const s0 = gesture.startScale;
      const t0 = gesture.startTranslate;
      const tx = t0.x + (P.x - t0.x) * (1 - nextScale / s0);
      const ty = t0.y + (P.y - t0.y) * (1 - nextScale / s0);
      commitTransform(nextScale, tx, ty);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size === 0) {
      setIsGesturing(false);
      gestureRef.current.mode = 'none';
      const current = transformRef.current;
      if (current.scale < 1.01) {
        commitTransform(1, 0, 0);
      } else {
        commitTransform(current.scale, current.x, current.y);
      }
    } else if (pointersRef.current.size === 1 && gestureRef.current.mode === 'pinch') {
      const remaining = Array.from(pointersRef.current.values())[0];
      gestureRef.current = {
        ...gestureRef.current,
        mode: 'pan',
        startPointer: remaining,
        startTranslate: transformRef.current,
        center: remaining,
      };
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex items-center justify-center touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        draggable={false}
        className="max-w-full max-h-full object-contain select-none"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transition: isGesturing ? 'none' : 'transform 0.2s ease-out',
          cursor: isGesturing ? 'grabbing' : 'grab',
        }}
      />
    </div>
  );
}

interface FilePreviewModalProps {
  file: FileItem | null;
  onClose: () => void;
  onDownload?: (file: FileItem) => void;
}

export function FilePreviewModal({ file, onClose, onDownload }: FilePreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kind = file ? getPreviewKind(file) : 'none';

  useEffect(() => {
    if (!file) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setUrl(null);
      setBlob(null);
      setTextContent(null);
      const { data, error: dlError } = await supabase.storage
        .from('attachments')
        .download(file.storage_path);

      if (cancelled) return;
      if (dlError || !data) {
        setError('Не удалось загрузить файл для предпросмотра');
        setLoading(false);
        return;
      }

      const k = getPreviewKind(file);
      if (k === 'text') {
        const text = await data.text();
        if (cancelled) return;
        setTextContent(text.slice(0, 200000));
      } else if (k === 'pdf') {
        setBlob(data);
      } else {
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      }
      setLoading(false);
    };


    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [file, onClose]);

  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl border-0 sm:border border-slate-700 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 flex items-center gap-3 px-3 sm:px-4 border-b border-slate-700/60 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{file.filename}</p>
            <p className="text-[11px] text-slate-500">
              {formatFileSize(file.file_size)}
              {file.file_type ? ` · ${file.file_type}` : ''}
            </p>
          </div>
          {onDownload && (
            <button
              onClick={() => onDownload(file)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto bg-slate-900/60 flex items-center justify-center">
          {loading ? (
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
          ) : error ? (
            <p className="text-sm text-red-400 px-6 py-10 text-center">{error}</p>
          ) : kind === 'image' && url ? (
            <ZoomableImage src={url} alt={file.filename} />
          ) : kind === 'pdf' && blob ? (
            <div className="w-full h-full min-h-[70vh] self-stretch">
              <PdfPreview data={blob} />
            </div>

          ) : kind === 'video' && url ? (
            <video src={url} controls className="max-w-full max-h-full" />
          ) : kind === 'audio' && url ? (
            <div className="w-full px-6 py-10">
              <audio src={url} controls className="w-full" />
            </div>
          ) : kind === 'text' && textContent !== null ? (
            <pre className="w-full h-full text-xs text-slate-300 p-4 whitespace-pre-wrap break-words font-mono">
              {textContent}
            </pre>
          ) : (
            <div className="flex flex-col items-center text-slate-500 px-6 py-14 text-center">
              <FileQuestion className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">Предпросмотр для этого формата недоступен</p>
              <p className="text-xs mt-1">Скачайте файл, чтобы открыть его</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
