import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  Search,
  UploadCloud,
  Download,
  Trash2,
  Loader2,
  File as FileIcon,
  HardDrive,
  AlertCircle,
  X,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Paperclip,
  Pencil,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FileItem } from '../types/database';
import { FilePreviewModal } from './FilePreviewModal';
import { UnifiedMenu } from './UnifiedMenu';

interface StoragePageProps {
  onBack: () => void;
}

type SortMode = 'name' | 'size';

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
  if (type.includes('zip') || type.includes('compressed')) return '🗜️';
  return '📎';
}

const STORAGE_LIMIT = 100 * 1024 * 1024; // 100 MB

export function StoragePage({ onBack }: StoragePageProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    const [filesRes, noteFilesRes] = await Promise.all([
      supabase.from('files').select('*').order('created_at', { ascending: false }),
      supabase.from('note_files').select('file_id'),
    ]);

    if (filesRes.error) {
      setError(filesRes.error.message);
    } else {
      setFiles(filesRes.data || []);
    }

    if (!noteFilesRes.error && noteFilesRes.data) {
      const counts: Record<string, number> = {};
      for (const row of noteFilesRes.data) {
        counts[row.file_id] = (counts[row.file_id] || 0) + 1;
      }
      setNoteCounts(counts);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`files-changes-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files' },
        () => loadFiles()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'note_files' },
        () => loadFiles()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadFiles]);

  const totalBytes = files.reduce((sum, f) => sum + f.file_size, 0);
  const percentage = Math.min((totalBytes / STORAGE_LIMIT) * 100, 100);
  const isNearLimit = percentage > 80;

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

      const { error: insertError } = await supabase.from('files').insert({
        user_id: user.id,
        filename: file.name,
        storage_path: filePath,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
      });

      if (insertError) throw insertError;

      await loadFiles();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload file';
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    setError(null);
    try {
      await supabase.storage.from('attachments').remove([file.storage_path]);

      const { error: deleteError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (deleteError) throw deleteError;

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete file';
      setError(message);
    }
    setConfirmDelete(null);
  };

  const startRename = (file: FileItem) => {
    setRenamingId(file.id);
    setRenameValue(file.filename);
  };

  const submitRename = async () => {
    const id = renamingId;
    const name = renameValue.trim();
    if (!id) return;
    setRenamingId(null);
    const current = files.find((f) => f.id === id);
    if (!name || !current || name === current.filename) return;

    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, filename: name } : f)));
    const { error: updateError } = await supabase
      .from('files')
      .update({ filename: name })
      .eq('id', id);
    if (updateError) {
      setError('Failed to rename file');
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, filename: current.filename } : f)));
    }
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const handleDownload = async (file: FileItem) => {
    const { data, error } = await supabase.storage
      .from('attachments')
      .download(file.storage_path);

    if (error) {
      setError('Failed to download file');
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (mode: SortMode) => {
    if (sortMode === mode) {
      setSortAsc(!sortAsc);
    } else {
      setSortMode(mode);
      setSortAsc(true);
    }
  };

  const sortedFilteredFiles = [...files]
    .filter((f) => f.filename.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortMode === 'name') {
        return sortAsc
          ? a.filename.localeCompare(b.filename)
          : b.filename.localeCompare(a.filename);
      } else {
        return sortAsc ? a.file_size - b.file_size : b.file_size - a.file_size;
      }
    });

  return (
    <div className="flex flex-col h-full bg-slate-800">
      {/* Header + usage bar — one unified block */}
      <div className="flex-shrink-0 border-b border-slate-700/50">
        <div className="h-14 px-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 active:bg-slate-700/80 transition-colors"
            aria-label="Back"
            title="Back"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium leading-tight">
                Storage
              </p>
              <p
                className={`text-sm font-semibold tabular-nums ${
                  isNearLimit ? 'text-amber-400' : 'text-slate-200'
                }`}
              >
                {formatFileSize(totalBytes)} / {formatFileSize(STORAGE_LIMIT)}
              </p>
            </div>
          </div>
        </div>

        {/* Usage bar — sits inside the header, not between separators */}
        <div className="px-3 pb-3">
          <div className="h-1.5 bg-slate-700/70 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Toolbar / nav bar — roomier on mobile */}
      <div className="h-auto px-3 py-3 sm:py-2 border-b border-slate-700/50 flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1 min-w-0 h-9">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search files…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 bg-slate-900/60 border border-transparent rounded-lg pl-9 pr-8 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 text-[13px] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/60">
          <button
            onClick={() => toggleSort('name')}
            className={`flex items-center justify-center gap-1 px-2.5 h-7 rounded-md text-[13px] font-semibold transition-all ${
              sortMode === 'name'
                ? 'bg-slate-700 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Sort by name"
          >
            <span className="hidden sm:inline">Name</span>
            {sortMode === 'name' ? (
              sortAsc ? (
                <ArrowUp className="w-3.5 h-3.5" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5" />
              )
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
            )}
          </button>
          <button
            onClick={() => toggleSort('size')}
            className={`flex items-center justify-center gap-1 px-2.5 h-7 rounded-md text-[13px] font-semibold transition-all ${
              sortMode === 'size'
                ? 'bg-slate-700 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Sort by size"
          >
            <span className="hidden sm:inline">Size</span>
            {sortMode === 'size' ? (
              sortAsc ? (
                <ArrowUp className="w-3.5 h-3.5" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5" />
              )
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
            )}
          </button>
        </div>

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
          className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex-shrink-0"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UploadCloud className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Upload</span>
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-3 mt-3 flex items-center gap-2 bg-red-600/10 border border-red-600/30 rounded-xl p-3 text-sm text-red-400 flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 min-w-0 break-words">{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-600/20 rounded flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
          </div>
        ) : sortedFilteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <FileIcon className="w-10 h-10 mb-3 text-slate-700" />
            <p className="text-sm font-medium text-slate-500">
              {searchQuery ? 'No files match your search' : 'No files in storage'}
            </p>
            {!searchQuery && (
              <p className="text-xs text-slate-600 mt-1">Upload a file to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {searchQuery && (
              <p className="text-xs text-slate-500 px-1 mb-1">
                {sortedFilteredFiles.length} file{sortedFilteredFiles.length !== 1 ? 's' : ''} match
              </p>
            )}
            {sortedFilteredFiles.map((file) => {
              const count = noteCounts[file.id] || 0;
              const isRenaming = renamingId === file.id;

              if (isRenaming) {
                return (
                  <div
                    key={file.id}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700/60 rounded-xl border border-emerald-500/40"
                  >
                    <div className="flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 rounded-md bg-emerald-500/15 flex-shrink-0">
                      <span className="text-lg sm:text-xl">{getFileIcon(file.file_type)}</span>
                    </div>
                    <input
                      ref={renameInputRef}
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') submitRename();
                        if (e.key === 'Escape') cancelRename();
                      }}
                      onBlur={submitRename}
                      className="flex-1 min-w-0 bg-slate-700/80 text-white rounded-lg px-2 py-1 text-sm font-semibold outline-none border border-emerald-500/60 ring-2 ring-emerald-500/20"
                    />
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={submitRename}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 transition-colors flex-shrink-0"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={cancelRename}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors flex-shrink-0"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={file.id}
                  className="group file-row w-full flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700/70 active:bg-slate-700 rounded-xl transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewFile(file)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    title="Preview"
                  >
                    <div className="flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 rounded-md bg-emerald-500/15 flex-shrink-0">
                      <span className="text-lg sm:text-xl">{getFileIcon(file.file_type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {file.filename}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-xs text-slate-500">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline truncate max-w-[120px]">
                          {file.file_type}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                      </div>
                      {/* Note count badge */}
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0 rounded-full font-medium ${
                            count > 0
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-700/50 text-slate-500 border border-slate-600/30'
                          }`}
                          title={
                            count > 0
                              ? `Linked to ${count} note${count !== 1 ? 's' : ''}`
                              : 'Not linked to any note'
                          }
                        >
                          <Paperclip className="w-2 h-2" />
                          {count}
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <UnifiedMenu
                      ariaLabel="File options"
                      onOpenChange={(open) => setMenuOpenId(open ? file.id : null)}
                      triggerClassName={`w-8 h-8 sm:w-7 sm:h-7 text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 ${
                        menuOpenId === file.id ? '' : 'sm:opacity-0 sm:group-hover:opacity-100'
                      }`}
                      iconClassName="w-4 h-4 sm:w-3.5 sm:h-3.5"
                      items={[
                        {
                          id: 'download',
                          label: 'Download',
                          icon: Download,
                          onSelect: () => handleDownload(file),
                        },
                        {
                          id: 'rename',
                          label: 'Rename',
                          icon: Pencil,
                          onSelect: () => startRename(file),
                        },
                        {
                          id: 'delete',
                          label: 'Delete',
                          icon: Trash2,
                          danger: true,
                          onSelect: () => setConfirmDelete(file.id),
                        },
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 sm:px-0">
          <div className="bg-slate-800 border-0 sm:border sm:border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm sm:mx-4 overflow-hidden">
            <div className="px-5 sm:px-6 py-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-600/20 rounded-lg">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Delete File</h3>
              </div>
              <p className="text-sm text-slate-400 mb-5">
                This will permanently delete the file from storage and remove it from
                all linked notes. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Don't Delete
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
