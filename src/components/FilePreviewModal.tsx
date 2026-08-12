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

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  return (
    <ZoomPanSurface resetKey={src}>
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="max-w-full max-h-full object-contain select-none block"
      />
    </ZoomPanSurface>
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
