import { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  File as FileIcon,
  Search,
  Loader2,
  X,
  Link2,
  Check,
  ChevronsLeft,
  ArrowLeft,
  Pilcrow,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FileItem } from '../types/database';

interface UnifiedFileLinkerWindowProps {
  open: boolean;
  onClose: () => void;
  noteId: string;
  /** Title of the note this window is opened from; shown in the header. */
  noteTitle?: string;
  /** Jumps back to the paragraph's text editor (two levels up). */
  onEditParagraph?: () => void;
  /** Goes back to the paragraph's attachments list (one level up). */
  onEditAttachments?: () => void;
  onFileLinked: (file: FileItem) => void | Promise<void>;

  existingFileIds: string[];
  /** When set, newly linked files are attached to this paragraph. */
  paragraphId?: string | null;
  /** Files already attached to that paragraph (shown as linked). */
  paragraphFileIds?: string[];
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf') return '📄';
  if (type.includes('word')) return '📝';
  if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
  return '📎';
}

/**
 * Unified file linking window: storage list + multi-select + inline upload,
 * all on one screen. Selected files are shown as chips above the list.
 */
export function UnifiedFileLinkerWindow({
  open,
  onClose,
  noteId,
  noteTitle,
  onEditParagraph,
  onEditAttachments,
  onFileLinked,
  existingFileIds,
  paragraphId = null,
  paragraphFileIds,
}: UnifiedFileLinkerWindowProps) {

  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [linking, setLinking] = useState(false);
  /**
   * Paragraph number shown in the header. Placeholder for now: a random value
   * is picked each time the window opens, purely for design purposes.
   */
  const [paragraphNumber, setParagraphNumber] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);



  const loadFiles = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('files')
      .select('*')
      .order('filename', { ascending: true });
    if (loadError) setError(loadError.message);
    else setFiles(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSearchQuery('');
    setSelectedIds([]);
    setParagraphNumber(Math.floor(Math.random() * 12) + 1);

    loadFiles();

  }, [open, paragraphId, loadFiles]);

  const isLinked = (id: string) =>
    paragraphFileIds ? paragraphFileIds.includes(id) : existingFileIds.includes(id);

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    setError(null);
    try {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: fileRecord, error: insertError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          filename: file.name,
          storage_path: filePath,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // A freshly uploaded file counts as selected right away.
      setFiles((prev) => [fileRecord as FileItem, ...prev]);
      setSelectedIds((prev) => [...prev, fileRecord.id]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const linkOne = async (file: FileItem) => {
    if (existingFileIds.includes(file.id)) {
      const { error: moveError } = await supabase
        .from('note_files')
        .update({ paragraph_id: paragraphId })
        .eq('note_id', noteId)
        .eq('file_id', file.id);
      if (moveError) throw moveError;
    } else {
      const { error: linkError } = await supabase.from('note_files').insert({
        note_id: noteId,
        file_id: file.id,
        user_id: user!.id,
        paragraph_id: paragraphId,
      });
      if (linkError) throw linkError;
    }
    await onFileLinked(file);
  };

  const handleAttachSelected = async () => {
    setError(null);
    setLinking(true);
    try {
      for (const id of selectedIds) {
        const file = files.find((f) => f.id === id);
        if (file) await linkOne(file);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link file');
    } finally {
      setLinking(false);
    }
  };

  if (!open) return null;

  const filteredFiles = files.filter((f) =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase()),
  );


  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-t-2xl sm:rounded-2xl border-0 sm:border sm:border-slate-700/60 shadow-[0_12px_40px_rgba(0,0,0,0.6)] w-full max-w-lg sm:max-w-2xl lg:max-w-4xl sm:mx-4 overflow-hidden h-[85vh] sm:h-[600px] lg:h-[680px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="h-14 flex items-center justify-between gap-2 px-4 sm:px-5 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">

              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium leading-tight">
                Attach files
              </p>
              <h2
                className="text-sm font-semibold text-slate-100 truncate"
                title={noteTitle || 'Attach Files'}
              >
                {noteTitle || 'Attach Files'}
              </h2>
            </div>

          </div>
          {/* Which paragraph is being edited — number only, placeholder for now */}
          <div
            className="flex items-center gap-1.5 rounded-lg border border-slate-600/60 bg-slate-700/70 px-2 py-1.5 flex-shrink-0"
            title={`Paragraph ${paragraphNumber}`}
          >
            <Pilcrow className="w-3 h-3 text-emerald-300/80" />
            <span className="hidden sm:inline text-[11px] font-medium text-slate-400 leading-none">
              Paragraph
            </span>
            <span className="text-[12px] font-semibold text-slate-100 tabular-nums leading-none">
              {paragraphNumber}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 active:bg-slate-700/80 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-5 flex-1 min-h-0 flex flex-col">
          {error && (
            <div className="mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
              <span className="flex-1 min-w-0 break-words">{error}</span>
              <button
                onClick={() => setError(null)}
                className="p-1 hover:bg-red-500/20 rounded-md flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}


          {/* One line: back to the block's text (double arrow), back to its files (single arrow), then upload */}
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onEditParagraph ?? onClose}
              aria-label="Edit paragraph"
              title="Edit paragraph"
              className="group inline-flex h-9 w-9 sm:w-auto flex-shrink-0 items-center justify-center gap-1.5 sm:px-3.5 rounded-lg border border-slate-500/50 bg-slate-700 text-[13px] font-semibold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 transition-colors duration-200 hover:bg-slate-600 hover:border-emerald-400/40 hover:text-emerald-200 active:translate-y-px"
            >
              <ChevronsLeft className="w-4 h-4 flex-shrink-0 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline truncate">Paragraph</span>
            </button>

            <button
              type="button"
              onClick={onEditAttachments ?? onClose}
              aria-label="Edit attachments"
              title="Edit attachments"
              className="group inline-flex h-9 w-9 sm:w-auto flex-shrink-0 items-center justify-center gap-1.5 sm:px-3.5 rounded-lg border border-slate-500/50 bg-slate-700 text-[13px] font-semibold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 transition-colors duration-200 hover:bg-slate-600 hover:border-emerald-400/40 hover:text-emerald-200 active:translate-y-px"
            >
              <ArrowLeft className="w-4 h-4 flex-shrink-0 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline truncate">Attachments</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || linking}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 min-w-0 rounded-lg text-[13px] font-semibold bg-emerald-500/15 text-emerald-100 border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/40 transition-colors disabled:opacity-50 flex-1"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Upload New File</span>
              <span className="sm:hidden">Upload</span>
            </button>
          </div>




          {/* Search + upload */}


          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            className="hidden"
          />
          {/* Search */}
          <div className="relative h-9 mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search files…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 bg-slate-900/60 border border-transparent rounded-lg pl-9 pr-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 text-[13px]"
            />
          </div>







          {/* Storage list */}


            <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-10">
                  <FileIcon className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No files found</p>
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const linked = isLinked(file.id);
                  const isSelected = selectedIds.includes(file.id);
                  return (
                    <button
                      key={file.id}
                      onClick={() => !linked && toggle(file.id)}
                      disabled={linked || linking}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors text-left ${
                        linked
                          ? 'bg-emerald-500/10 cursor-not-allowed'
                          : isSelected
                            ? 'bg-emerald-500/15'
                            : 'hover:bg-slate-700/40 active:bg-slate-700/60'
                      }`}
                    >
                      {linked ? (
                        <Link2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-slate-900" />}
                        </span>
                      )}
                      <div className="w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0 text-base">
                        {getFileIcon(file.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold truncate leading-snug ${
                            linked || isSelected ? 'text-emerald-100' : 'text-slate-100'
                          }`}
                        >
                          {file.filename}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatFileSize(file.file_size)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>


          <div className="mt-3 flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              disabled={linking}
              className="h-9 px-3 rounded-lg text-[13px] font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAttachSelected}
              disabled={selectedIds.length === 0 || linking}
              className="ml-auto inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[13px] font-semibold bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 transition-colors disabled:opacity-40 disabled:hover:bg-emerald-500/15"
            >
              {linking && <Loader2 className="w-4 h-4 animate-spin" />}
              Attach{selectedIds.length > 0 ? ` ${selectedIds.length}` : ''}
              {selectedIds.length === 1 ? ' file' : ' files'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
