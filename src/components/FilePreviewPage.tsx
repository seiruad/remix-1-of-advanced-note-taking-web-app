import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FileItem } from '../types/database';
import { FilePreviewModal } from './FilePreviewModal';

/**
 * Route: /file/:fileId?source=storage
 *        /file/:fileId?source=note&noteId=:noteId
 */
export function parseFileSource(search: string): { kind: 'storage' | 'note' | 'unknown'; noteId?: string } {
  const params = new URLSearchParams(search);
  const source = params.get('source') || '';
  if (source === 'storage') return { kind: 'storage' };
  if (source === 'note') {
    const noteId = params.get('noteId') || '';
    return noteId ? { kind: 'note', noteId } : { kind: 'unknown' };
  }
  return { kind: 'unknown' };
}

export function buildFileUrl(fileId: string, source: { kind: 'storage' } | { kind: 'note'; noteId: string }) {
  if (source.kind === 'storage') {
    return `/file/${fileId}?source=storage`;
  }
  return `/file/${fileId}?source=note&noteId=${encodeURIComponent(source.noteId)}`;
}

export function FilePreviewPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [file, setFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(true);

  const source = parseFileSource(location.search);
  const backTo =
    source.kind === 'note' && source.noteId ? `/note/${source.noteId}` : source.kind === 'storage' ? '/storage' : '/';
  // Lock background scrolling while the preview overlay is mounted (prevents a second scrollbar).
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);


  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!fileId) return;
      setLoading(true);
      const { data } = await supabase.from('files').select('*').eq('id', fileId).maybeSingle();
      if (cancelled) return;
      setFile((data as FileItem) || null);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  const handleDownload = async (f: FileItem) => {
    const { data, error } = await supabase.storage.from('attachments').download(f.storage_path);
    if (error || !data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasBackground = !!(location.state as { background?: unknown } | null)?.background;
  const close = () => {
    if (hasBackground) navigate(-1);
    else navigate(backTo, { replace: true });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (!file) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-slate-400">Файл не найден</p>
        <button
          onClick={close}
          className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
        >
          Назад
        </button>
      </div>
    );
  }

  return <FilePreviewModal file={file} onClose={close} onDownload={handleDownload} />;
}
