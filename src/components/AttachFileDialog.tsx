import { useState, useRef, useEffect } from 'react';
import { UploadCloud, File as FileIcon, Search, Loader2, X, Link2, HardDrive } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FileItem } from '../types/database';

interface AttachFileDialogProps {
  open: boolean;
  onClose: () => void;
  noteId: string;
  onFileLinked: (file: FileItem) => void;
  existingFileIds: string[];
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

  const handleSelectExisting = async (file: FileItem) => {
    setError(null);
    try {
      const { error: linkError } = await supabase
        .from('note_files')
        .insert({
          note_id: noteId,
          file_id: file.id,
          user_id: user!.id,
        });

      if (linkError) throw linkError;

      onFileLinked(file);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to link file';
      setError(message);
    }
  };

  const filteredFiles = files.filter((f) =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-t-2xl sm:rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg sm:mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">Attach File</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 flex items-center gap-2 bg-red-600/10 border border-red-600/30 rounded-lg p-3 text-sm text-red-400">
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-600/20 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {mode === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => setMode('upload')}
                className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl border border-slate-600 hover:border-emerald-500 transition-all group"
              >
                <div className="p-2.5 sm:p-3 bg-emerald-600/20 rounded-lg group-hover:bg-emerald-600/30 transition-colors flex-shrink-0">
                  <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-white font-medium text-sm sm:text-base">Upload New File</p>
                  <p className="text-xs sm:text-sm text-slate-400">Choose a file from your device</p>
                </div>
              </button>

              <button
                onClick={() => setMode('select')}
                className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl border border-slate-600 hover:border-emerald-500 transition-all group"
              >
                <div className="p-2.5 sm:p-3 bg-blue-600/20 rounded-lg group-hover:bg-blue-600/30 transition-colors flex-shrink-0">
                  <HardDrive className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-white font-medium text-sm sm:text-base">Select from Storage</p>
                  <p className="text-xs sm:text-sm text-slate-400">Choose a file already in your storage</p>
                </div>
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
                className="w-full border-2 border-dashed border-slate-600 hover:border-emerald-500 rounded-xl py-8 sm:py-12 flex flex-col items-center justify-center gap-3 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    <p className="text-slate-400">Uploading...</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-slate-500" />
                    <p className="text-slate-400">Click to select a file</p>
                  </>
                )}
              </button>

              <button
                onClick={() => setMode('choose')}
                className="mt-4 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {mode === 'select' && (
            <div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FileIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No files found</p>
                  </div>
                ) : (
                  filteredFiles.map((file) => {
                    const isLinked = existingFileIds.includes(file.id);
                    return (
                      <button
                        key={file.id}
                        onClick={() => !isLinked && handleSelectExisting(file)}
                        disabled={isLinked}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                          isLinked
                            ? 'bg-slate-700/30 border-slate-700 opacity-50 cursor-not-allowed'
                            : 'bg-slate-700/50 border-slate-600 hover:border-emerald-500 hover:bg-slate-700'
                        }`}
                      >
                        <span className="text-xl">{getFileIcon(file.file_type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {file.filename}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatFileSize(file.file_size)}
                          </p>
                        </div>
                        {isLinked ? (
                          <Link2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span className="text-xs text-emerald-400">Link</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              <button
                onClick={() => setMode('choose')}
                className="mt-4 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
