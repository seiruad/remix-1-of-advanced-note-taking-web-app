import { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  File as FileIcon,
  Search,
  Loader2,
  X,
  Link2,
  Check,
  ArrowUpDown,
  ChevronsLeft,
  ArrowLeft,
  Pilcrow,
  ChevronDown,
  ArrowLeftRight,
  ArrowUpToLine,
  ArrowDownToLine,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FileItem } from '../types/database';
import { Button } from './Button';
import { UnifiedMenu, type UnifiedMenuItem } from './UnifiedMenu';
import { moveAttachmentChip, type ChipMoveAction } from './attachmentChipOrder';

interface UnifiedFileLinkerWindowProps {
  open: boolean;
  onClose: () => void;
  noteId: string;
  /** Title of the note this window is opened from; shown in the header. */
  noteTitle?: string;
  /** Jumps back to the paragraph's text editor (two levels up). */
  onEditParagraph?: () => void;
  /** Legacy callback; the Attachments control now switches views within this window. */
  onEditAttachments?: () => void;
  onFileLinked: (file: FileItem) => void | Promise<void>;

  existingFileIds: string[];
  /** When set, newly linked files are attached to this paragraph. */
  paragraphId?: string | null;
  /** Files already attached to that paragraph (shown as linked). */
  paragraphFileIds?: string[];
  /** Open directly on the attached-chips view instead of the file list. */
  initialShowAttached?: boolean;
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
 * all on one screen. The Attachments control swaps the search/list area for
 * the Selected block, where picked files show as chips.
 */
export function UnifiedFileLinkerWindow({
  open,
  onClose,
  noteId,
  noteTitle,
  onEditParagraph,
  onFileLinked,
  existingFileIds,
  paragraphId = null,
  paragraphFileIds,
  initialShowAttached = false,
}: UnifiedFileLinkerWindowProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [linking, setLinking] = useState(false);
  /** True = the Selected block (chips) replaces search + storage list. */
  const [showAttached, setShowAttached] = useState(false);
  /**
   * Paragraph number shown in the header. Placeholder for now: a random value
   * is picked each time the window opens, purely for design purposes.
   */
  const [paragraphNumber, setParagraphNumber] = useState(1);
  /** Chip order chosen by the user, chips kept but switched off, and chips removed from the list. */
  const [chipOrder, setChipOrder] = useState<string[]>([]);
  const [deselected, setDeselected] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  /** Chip the user picked up with the move control; its copy pins to the bottom centre. */
  const [movingChipId, setMovingChipId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const linkedIds = paragraphFileIds ?? existingFileIds;

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
    setShowAttached(initialShowAttached);
    setChipOrder([]);
    setDeselected([]);
    setRemovedIds([]);
    setMovingChipId(null);
    setMoveTargetId(null);
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
        user_id: user?.id,
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
      for (const id of selectedIds.filter((x) => !deselected.includes(x))) {
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

  useEffect(() => {
    if (!movingChipId) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMovingChipId(null);
      }
    };
    document.addEventListener('keydown', dismiss);
    return () => {
      document.removeEventListener('keydown', dismiss);
    };
  }, [movingChipId]);

  if (!open) return null;

  const filteredFiles = files.filter((file) =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  // Already-attached files first, then newly picked ones; user can reorder, deselect or remove chips.
  const baseIds = [...linkedIds, ...selectedIds].filter((id) => !removedIds.includes(id));
  const orderedIds = [
    ...chipOrder.filter((id) => baseIds.includes(id)),
    ...baseIds.filter((id) => !chipOrder.includes(id)),
  ];
  const displayFiles = orderedIds
    .map((id) => files.find((f) => f.id === id))
    .filter((f): f is FileItem => Boolean(f));

  const toggleDeselect = (id: string) =>
    setDeselected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const removeChip = (id: string) => {
    if (selectedIds.includes(id)) toggle(id);
    else setRemovedIds((prev) => [...prev, id]);
    setDeselected((prev) => prev.filter((x) => x !== id));
  };

  /** Emerald tile — the attached-only (chips) view's nav buttons. */
  const navBtn =
    'group inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/15 text-[13px] font-semibold text-emerald-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 transition-colors duration-200 hover:bg-emerald-500/25 hover:border-emerald-500/45 hover:text-emerald-50 active:translate-y-px';

  /** Raised slate tile — the all-files view's Paragraph / Attachments buttons. */
  const slateBtn =
    'group inline-flex h-9 w-9 sm:w-auto flex-shrink-0 items-center justify-center gap-1.5 sm:px-3.5 rounded-lg border border-slate-500/50 bg-slate-700 text-[13px] font-semibold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 transition-colors duration-200 hover:bg-slate-600 hover:border-emerald-400/40 hover:text-emerald-200 active:translate-y-px';

  const chipBtn =
    'w-6 h-6 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none';

  const applyMove = (target: string, action: ChipMoveAction) => {
    if (!movingChipId) return;
    setChipOrder(moveAttachmentChip(orderedIds, movingChipId, target, action));
    setMoveTargetId(null);
    setMovingChipId(null);
  };

  const renderChip = (file: FileItem) => {
    const off = deselected.includes(file.id);
    const moving = movingChipId === file.id;
    const moveItems: UnifiedMenuItem[] = [
      { id: 'swap', label: 'Swap positions', icon: ArrowLeftRight, onSelect: () => applyMove(file.id, 'swap') },
      { id: 'before', label: 'Place before', icon: ArrowUpToLine, onSelect: () => applyMove(file.id, 'before') },
      { id: 'after', label: 'Place after', icon: ArrowDownToLine, onSelect: () => applyMove(file.id, 'after') },
    ];
    return (
      <span
        key={file.id}
        data-chip-id={file.id}
        data-moving={moving}
        className={`relative inline-flex items-center gap-0.5 h-8 pl-1 pr-1 rounded-full border transition-colors text-[11px] font-medium max-w-full ${
          moving ? 'bg-primary/20 border-primary/50 text-primary-foreground'
            : off ? 'bg-transparent border-dashed border-border/50 text-muted-foreground'
              : 'bg-muted/40 border-border/30 text-foreground/80'
        }`}
      >
        {!movingChipId && <Button
          type="button"
          onClick={() => toggleDeselect(file.id)}
          aria-label={off ? `Select ${file.filename}` : `Deselect ${file.filename}`}
          aria-pressed={!off}
          title={off ? 'Select' : 'Deselect'}
          className={`${chipBtn} hover:bg-muted/40`}
        >
          <span
            className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
              off ? 'border-border' : 'bg-primary border-primary'
            }`}
          >
            {!off && <Check className="w-2.5 h-2.5 text-background" />}
          </span>
        </Button>}
        <span className={`truncate max-w-[160px] px-1 ${off ? 'line-through' : ''}`} title={file.filename}>
          {file.filename}
        </span>
        {movingChipId ? (
          <UnifiedMenu
            items={moveItems}
            ariaLabel={`Placement options for ${file.filename}`}
            triggerClassName="!rounded-full w-6 h-6 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary/25"
            iconClassName="w-3.5 h-3.5"
            openTriggerClassName="!bg-primary/30 !text-primary-foreground"
            triggerContent={<ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />}
          />
        ) : <Button
          type="button"
          onClick={() => setMovingChipId((cur) => (cur === file.id ? null : file.id))}
          aria-label={`Move ${file.filename}`}
          aria-pressed={movingChipId === file.id}
          title="Move"
          className={chipBtn}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
        </Button>}
        {!movingChipId && <Button
          type="button"
          onClick={() => removeChip(file.id)}
          aria-label={`Remove ${file.filename} chip`}
          title="Remove chip"
          className={`${chipBtn} hover:text-destructive`}
        >
          <X className="w-3.5 h-3.5" />
        </Button>}
      </span>
    );
  };
  const activeSelected = selectedIds.filter((id) => !deselected.includes(id));
  const movingFile = displayFiles.find((f) => f.id === movingChipId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-slate-800 rounded-t-2xl sm:rounded-2xl border-0 sm:border sm:border-slate-700/60 shadow-[0_12px_40px_rgba(0,0,0,0.6)] w-full max-w-lg sm:max-w-2xl lg:max-w-4xl sm:mx-4 overflow-hidden h-[85vh] sm:h-[600px] lg:h-[680px] max-h-[90vh] flex flex-col">
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
            {/* Which paragraph is being edited — number only, placeholder for now */}
            <span
              className="flex items-center gap-1 flex-shrink-0 pl-2.5 border-l border-slate-700/60 text-[11px] font-medium text-slate-500 tabular-nums leading-none"
              title={`Paragraph ${paragraphNumber}`}
            >
              <Pilcrow className="w-3 h-3" />
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

          {/* One line: back to the block's text (double arrow), the main action, then upload.
              The all-files view keeps its original button design; only the
              attached-only (chips) view uses the emerald tile row. */}
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onEditParagraph ?? onClose}
              aria-label="Edit paragraph"
              title="Edit paragraph"
              className={slateBtn}
            >
              <ChevronsLeft className="w-4 h-4 flex-shrink-0 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline truncate">Paragraph</span>
            </button>

            {showAttached ? (
              <button
                type="button"
                onClick={() => setShowAttached(false)}
                aria-label="Choose from existing files"
                title="Choose from existing files"
                className={`${navBtn} min-w-0 flex-1 px-3.5`}
              >
                <Search className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110" />
                <span className="truncate">Choose existing</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAttached((value) => !value)}
                aria-pressed={showAttached}
                aria-label="Edit attachments"
                title="Edit attachments"
                className={slateBtn}
              >
                <ArrowLeft className="w-4 h-4 flex-shrink-0 transition-transform group-hover:-translate-x-0.5" />
                <span className="hidden sm:inline truncate">Attachments</span>
              </button>
            )}

            {showAttached ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || linking}
                aria-label="Upload new file"
                title="Upload new file"
                className={`${navBtn} w-9 flex-shrink-0 disabled:opacity-50`}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || linking}
                aria-label="Upload new file"
                title="Upload new file"
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
            )}
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

          {showAttached ? (
            /* Selected files — every chip visible; fills all available height */
            <div className="flex-1 min-h-0 rounded-xl bg-slate-900/40 border border-slate-700/40 p-2 flex flex-col">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5 px-0.5 h-6 flex items-center">
                Selected · {displayFiles.length - deselected.filter((id) => displayFiles.some((f) => f.id === id)).length}
                {' / '}
                {displayFiles.length}
              </p>
              <div className={`flex flex-wrap gap-1.5 content-start items-start overflow-y-auto flex-1 min-h-0 ${movingFile ? 'pb-20' : ''}`}>
                {displayFiles.length === 0 ? (
                  <span className="inline-flex items-center h-7 px-0.5 text-[11px] text-slate-500">
                    No files selected yet — pick files in the list or upload a new one.
                  </span>
                ) : (
                  displayFiles.map((f) => renderChip(f))
                )}
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}

          {!showAttached && (
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
              disabled={activeSelected.length === 0 || linking}
              className="ml-auto inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[13px] font-semibold bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 transition-colors disabled:opacity-40 disabled:hover:bg-emerald-500/15"
            >
              {linking && <Loader2 className="w-4 h-4 animate-spin" />}
              Attach{activeSelected.length > 0 ? ` ${activeSelected.length}` : ''}
              {activeSelected.length === 1 ? ' file' : ' files'}
            </button>
          </div>
          )}
        </div>

        {/* Copy of the chip the user picked up with the move control, pinned to the bottom centre. */}
        {showAttached && movingFile && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center border-t border-slate-700/60 bg-slate-800 py-2.5"
          >
            <span className="inline-flex items-center h-11 px-5 rounded-full border border-emerald-400/50 bg-emerald-500/20 text-sm font-medium text-emerald-100">
              <span className="truncate max-w-[280px]">{movingFile.filename}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
