import { useState, useRef, useEffect } from 'react';
import { UploadCloud, File as FileIcon, Search, Loader2, X, Link2, HardDrive, Paperclip, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FileItem } from '../types/database';

interface AttachFileDialogProps {
  open: boolean;
  onClose: () => void;
  noteId: string;
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

export function AttachFileDialog({
  open,
  onClose,
  noteId,
  onFileLinked,
  existingFileIds,
  paragraphId = null,
  paragraphFileIds,
}: AttachFileDialogProps) {

  const { user } = useAuth();
  const [mode, setMode] = useState<'choose' | 'upload' | 'select'>('choose');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMode('choose');
      setError(null);
      setSearchQuery('');
    }
  }, [open]);

  useEffect(() => {
    if (mode === 'select') {
      loadFiles();
    }
  }, [mode]);

  const loadFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('filename', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setFiles(data || []);
    }
    setLoading(false);
  };

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

      // Link to note
      const { error: linkError } = await supabase
        .from('note_files')
        .insert({
          note_id: noteId,
          file_id: fileRecord.id,
          user_id: user.id,
          paragraph_id: paragraphId,
        });

      if (linkError) throw linkError;

      onFileLinked(fileRecord);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload file';
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const linkOne = async (file: FileItem) => {
    if (existingFileIds.includes(file.id)) {
      // Already linked to the note — just move it into this paragraph.
      const { error: moveError } = await supabase
        .from('note_files')
        .update({ paragraph_id: paragraphId })
        .eq('note_id', noteId)
        .eq('file_id', file.id);
      if (moveError) throw moveError;
    } else {
      const { error: linkError } = await supabase
        .from('note_files')
        .insert({
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
      const message = err instanceof Error ? err.message : 'Failed to link file';
      setError(message);
    } finally {
      setLinking(false);
    }
  };



  const filteredFiles = files.filter((f) =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-t-2xl sm:rounded-2xl border-0 sm:border sm:border-slate-700/60 shadow-[0_12px_40px_rgba(0,0,0,0.6)] w-full max-w-lg sm:mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header — mirrors sidebar workspace header */}
        <div className="h-14 flex items-center justify-between gap-2 px-4 sm:px-5 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <Paperclip className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium leading-tight">Note</p>
              <h2 className="text-sm font-semibold text-slate-100 truncate">Attach File</h2>
            </div>
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
        <div className="p-3 sm:p-5 overflow-y-auto">
          {error && (
            <div className="mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
              <span className="flex-1 min-w-0 break-words">{error}</span>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded-md flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {mode === 'choose' && (
            <div className="space-y-1">
              <button
                onClick={() => setMode('upload')}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-700/40 active:bg-slate-700/60"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-100 leading-snug">Upload New File</p>
                  <p className="text-xs text-slate-500 mt-0.5">Choose a file from your device</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
              </button>

              <button
                onClick={() => setMode('select')}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-700/40 active:bg-slate-700/60"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0">
                  <HardDrive className="w-4 h-4 text-slate-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-100 leading-snug">Select from Storage</p>
                  <p className="text-xs text-slate-500 mt-0.5">Choose a file already in your storage</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
              </button>
            </div>
          )}

          {mode === 'upload' && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-700/20 rounded-xl py-10 sm:py-12 flex flex-col items-center justify-center gap-3 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
                    <p className="text-sm text-slate-400">Uploading…</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-7 h-7 text-slate-500" />
                    <p className="text-sm text-slate-400">Click to select a file</p>
                  </>
                )}
              </button>

              <button
                onClick={() => setMode('choose')}
                className="mt-3 flex items-center gap-1 h-9 px-2.5 -ml-1 rounded-lg text-[13px] font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          )}

          {mode === 'select' && (
            <div>
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

              <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-1">
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
                    const isLinked = paragraphFileIds
                      ? paragraphFileIds.includes(file.id)
                      : existingFileIds.includes(file.id);

                    return (
                      <button
                        key={file.id}
                        onClick={() => !isLinked && handleSelectExisting(file)}
                        disabled={isLinked}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors text-left ${
                          isLinked
                            ? 'bg-emerald-500/10 cursor-not-allowed'
                            : 'hover:bg-slate-700/40 active:bg-slate-700/60'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0 text-base">
                          {getFileIcon(file.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate leading-snug ${isLinked ? 'text-emerald-100' : 'text-slate-100'}`}>
                            {file.filename}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatFileSize(file.file_size)}
                          </p>
                        </div>
                        {isLinked ? (
                          <Link2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <span className="text-xs font-medium text-emerald-400 flex-shrink-0">Link</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              <button
                onClick={() => setMode('choose')}
                className="mt-3 flex items-center gap-1 h-9 px-2.5 -ml-1 rounded-lg text-[13px] font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

