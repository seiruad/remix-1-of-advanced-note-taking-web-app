import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
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
  MoreVertical,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FileItem } from '../types/database';
import { FilePreviewModal, isPreviewable } from './FilePreviewModal';

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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

  // Close mobile menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      const btn = menuRefs.current[openMenuId];
      if (btn && !btn.contains(e.target as Node)) {
        const menu = btn.nextElementSibling;
        if (menu && !menu.contains(e.target as Node)) {
          setOpenMenuId(null);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

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
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Storage</h1>
        </div>

        {/* Storage usage bar */}
        <div className="bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 text-slate-300 min-w-0">
              <HardDrive className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate">Total Usage</span>
            </div>
            <span
              className={`text-xs sm:text-sm font-medium flex-shrink-0 ${
                isNearLimit ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {formatFileSize(totalBytes)} / {formatFileSize(STORAGE_LIMIT)}
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {files.length} file{files.length !== 1 ? 's' : ''} in storage
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 sm:px-8 py-3 sm:py-4 flex items-center gap-2 sm:gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleSort('name')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border text-sm transition-colors ${
              sortMode === 'name'
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
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
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border text-sm transition-colors ${
              sortMode === 'size'
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
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
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Uploading...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              <span className="hidden sm:inline">Upload File</span>
              <span className="sm:hidden">Upload</span>
            </>
          )}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 sm:mx-8 mb-4 flex items-center gap-2 bg-red-600/10 border border-red-600/30 rounded-lg p-3 text-sm text-red-400">
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
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-4 sm:pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
          </div>
        ) : sortedFilteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <FileIcon className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">No files in storage</p>
            <p className="text-sm mt-1">Upload a file to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedFilteredFiles.map((file) => {
              const count = noteCounts[file.id] || 0;
              return (
                <div
                  key={file.id}
                  className="group flex items-center gap-3 sm:gap-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-700 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => isPreviewable(file) && setPreviewFile(file)}
                    disabled={!isPreviewable(file)}
                    className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 text-left disabled:cursor-default"
                    title={isPreviewable(file) ? 'Preview' : undefined}
                  >
                  <span className="text-xl sm:text-2xl flex-shrink-0">
                    {getFileIcon(file.file_type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {file.filename}
                    </p>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 flex-wrap">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline truncate max-w-[120px]">
                        {file.file_type}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                    {/* Note count badge */}
                    <div className="flex items-center gap-1 mt-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
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
                        <Paperclip className="w-2.5 h-2.5" />
                        {count}
                      </span>
                    </div>
                  </div>
                  </button>

                  {/* Desktop actions */}
                  <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(file.id)}
                      className="p-2 hover:bg-red-600/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>

                  {/* Mobile actions menu */}
                  <div className="sm:hidden relative flex-shrink-0">
                    <button
                      ref={(el) => {
                        menuRefs.current[file.id] = el;
                      }}
                      onClick={() =>
                        setOpenMenuId(openMenuId === file.id ? null : file.id)
                      }
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                    {openMenuId === file.id && (
                      <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[140px] py-1">
                        <button
                          onClick={() => {
                            handleDownload(file);
                            setOpenMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors text-left"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDelete(file.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-600/10 transition-colors text-left"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden">
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
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Don't Delete
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
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
