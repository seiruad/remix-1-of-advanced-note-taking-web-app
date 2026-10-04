import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { UnifiedMenu } from './UnifiedMenu';
import {
  FileText,
  Clock,
  FolderOpen,
  FolderInput,
  ArrowRight,
  X,
  Trash2,
  Notebook,
  Search,
  Folder as FolderIcon,
  FolderPlus,
  Layers,
} from 'lucide-react';
import { NoteWithDetails, Folder as FolderType, Workspace } from '../types/database';

export const NO_FOLDER_ID = '__no_folder__';

export function formatDate(date: string) {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
    }
    return `${hours}h ago`;
  } else if (days === 1) return 'Yesterday';
  else if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString();
}

type MoveTarget = { kind: 'folder' | 'workspace' | 'none'; id: string | null };

/* ---------- NoteFolderLinker (mobile-first folder/workspace picker for a note) ---------- */

function NoteFolderLinker({
  note,
  folders,
  workspaces,
  activeWorkspaceId,
  onMove,
  onClose,
}: {
  note: NoteWithDetails;
  folders: FolderType[];
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onMove: (folderId: string | null, workspaceId?: string) => void;
  onClose: () => void;
}) {
  const currentFolder = folders.find((f) => f.id === note.folder_id) || null;
  const originWorkspace = workspaces.find((w) => w.id === note.workspace_id) || null;
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;
  const sortedFolders = [...folders].sort((a, b) => {
    const aNew = a.is_new ?? false;
    const bNew = b.is_new ?? false;
    if (aNew !== bNew) return aNew ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const [tab, setTab] = useState<'folders' | 'workspaces'>('folders');
  const initialTarget = useMemo<MoveTarget>(
    () => (note.folder_id ? { kind: 'folder', id: note.folder_id } : { kind: 'none', id: null }),
    [note.folder_id]
  );
  const [selected, setSelected] = useState<MoveTarget>(initialTarget);

  const selectedFolder = selected.kind === 'folder' ? folders.find((f) => f.id === selected.id) || null : null;
  const selectedWorkspace = selected.kind === 'workspace' ? workspaces.find((w) => w.id === selected.id) || null : null;
  const changed = JSON.stringify(selected) !== JSON.stringify(initialTarget);

  const handleConfirm = () => {
    if (!changed) return;
    if (selected.kind === 'workspace' && selected.id) {
      onMove(null, selected.id);
    } else {
      onMove(selected.kind === 'folder' ? selected.id : null);
    }
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md sm:mx-4 bg-slate-800 border-0 sm:border sm:border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/15 border border-emerald-500/20 flex items-center justify-center">
              <FolderInput className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Move</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Note info card */}
        <div className="px-5 py-3 bg-slate-900/20 border-b border-slate-700/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{note.title || 'Untitled'}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  {formatDate(note.updated_at)}
                </span>
                {note.files && note.files.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <FileText className="w-3 h-3" />
                    {note.files.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Folders / Workspaces switch */}
        <div className="px-5 pt-3 pb-3 bg-slate-900/20 border-b border-slate-700/40">
          <div className="flex p-1 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <button
              onClick={() => setTab('folders')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === 'folders'
                  ? 'bg-emerald-600/20 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderIcon className="w-3.5 h-3.5" />
              Folders
            </button>
            <button
              onClick={() => setTab('workspaces')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === 'workspaces'
                  ? 'bg-emerald-600/20 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Workspaces
            </button>
          </div>
        </div>

        {/* From → To route: workspace + folder on each side (updates live) */}
        <div className="px-5 py-3.5 bg-slate-900/30 border-b border-slate-700/40">
          <div className="flex items-stretch gap-2">
            {/* From: current workspace + folder */}
            <div className="min-w-0 flex-1 rounded-lg bg-slate-700/40 border border-slate-600/40 px-2.5 py-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Layers className="w-3 h-3 text-slate-500 flex-shrink-0" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 truncate">
                  {originWorkspace?.name || 'Workspace'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0 mt-1">
                <FolderOpen className="w-3 h-3 text-slate-500 flex-shrink-0" />
                <span className="text-xs text-slate-400 truncate">
                  {currentFolder ? currentFolder.name : 'No folder'}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center flex-shrink-0">
              <ArrowRight
                className={`w-4 h-4 transition-colors ${
                  changed ? 'text-emerald-400' : 'text-slate-600'
                }`}
              />
            </div>

            {/* To: destination workspace + folder */}
            <div
              className={`min-w-0 flex-1 rounded-lg px-2.5 py-2 border transition-colors duration-150 ${
                changed
                  ? 'bg-emerald-600/15 border-emerald-500/30'
                  : 'bg-slate-700/40 border-slate-600/40'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Layers
                  className={`w-3 h-3 flex-shrink-0 ${
                    selected.kind === 'workspace' && changed ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider truncate ${
                    selected.kind === 'workspace' && changed ? 'text-emerald-300' : 'text-slate-500'
                  }`}
                >
                  {(selected.kind === 'workspace' ? selectedWorkspace?.name : activeWorkspace?.name) || 'Workspace'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0 mt-1">
                {selectedFolder?.is_new ? (
                  <FolderPlus
                    className={`w-3 h-3 flex-shrink-0 ${
                      changed ? 'text-amber-400' : 'text-amber-500/70'
                    }`}
                  />
                ) : (
                  <FolderOpen
                    className={`w-3 h-3 flex-shrink-0 ${
                      selected.kind === 'folder' && changed ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  />
                )}
                <span
                  className={`text-xs truncate ${
                    selected.kind === 'folder' && changed ? 'text-emerald-300 font-medium' : 'text-slate-400'
                  }`}
                >
                  {selected.kind === 'folder'
                    ? selectedFolder
                      ? selectedFolder.name
                      : 'No folder'
                    : 'No folder'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* List (radio-style single selection) */}
        <div className="flex-1 overflow-y-auto py-2">
          {tab === 'folders' ? (
            <>
              <button
                onClick={() => setSelected({ kind: 'none', id: null })}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  selected.kind === 'none' ? 'bg-emerald-600/10' : 'hover:bg-slate-700/40'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  selected.kind === 'none' ? 'border-emerald-500' : 'border-slate-600'
                }`}>
                  {selected.kind === 'none' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                </span>
                <FolderOpen className={`w-4 h-4 flex-shrink-0 ${selected.kind === 'none' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className={selected.kind === 'none' ? 'text-emerald-400 font-medium' : 'text-slate-300'}>No folder</span>
              </button>

              {sortedFolders.length > 0 && <div className="border-t border-slate-700/40 my-1" />}

              {sortedFolders.map((f) => {
                const isSelected = selected.kind === 'folder' && selected.id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelected({ kind: 'folder', id: f.id })}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      isSelected ? 'bg-emerald-600/10' : 'hover:bg-slate-700/40'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'border-emerald-500' : 'border-slate-600'
                    }`}>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                    </span>
                    {f.is_new ? (
                      <FolderPlus className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-amber-400' : 'text-amber-500/70'}`} />
                    ) : (
                      <FolderIcon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                    )}
                    <span className={isSelected ? 'text-emerald-400 font-medium' : 'text-slate-300'}>{f.name}</span>
                  </button>
                );
              })}
            </>
          ) : (
            <>
              {workspaces.map((w) => {
                const isCurrent = w.id === activeWorkspaceId;
                const isSelected = selected.kind === 'workspace' && selected.id === w.id;
                return (
                  <button
                    key={w.id}
                    disabled={isCurrent}
                    onClick={() => setSelected({ kind: 'workspace', id: w.id })}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      isCurrent
                        ? 'cursor-not-allowed opacity-50'
                        : isSelected
                          ? 'bg-emerald-600/10'
                          : 'hover:bg-slate-700/40'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'border-emerald-500' : 'border-slate-600'
                    }`}>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                    </span>
                    <Layers className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className={isSelected ? 'text-emerald-400 font-medium' : 'text-slate-300'}>{w.name}</span>
                    {isCurrent && (
                      <span className="ml-auto flex-shrink-0 text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-700/60 rounded-full px-1.5 py-0.5">
                        Current
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer with confirm/cancel */}
        <div className="px-5 py-3.5 border-t border-slate-700/60 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!changed}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            Move
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ---------- Note card ---------- */

export function NoteCard({
  note,
  folders,
  workspaces,
  activeWorkspaceId,
  isActive,
  onSelect,
  onDelete,
  onMove,
  showFolder = true,
}: {
  note: NoteWithDetails;
  folders: FolderType[];
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMove: (folderId: string | null, workspaceId?: string) => void;
  showFolder?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveSheetOpen, setMoveSheetOpen] = useState(false);

  const folderName = folders.find((f) => f.id === note.folder_id)?.name || null;

  const isNew = note.is_new ?? false;

  return (
    <>
      <div
        className={`group/card relative flex items-stretch rounded-xl cursor-pointer transition-colors duration-150 overflow-hidden ${
          isActive && isNew
            ? 'bg-amber-500/10 hover:bg-amber-500/[0.12] active:bg-amber-500/[0.14]'
            : isNew
              ? 'hover:bg-amber-500/[0.08] active:bg-amber-500/[0.12]'
              : isActive
                ? 'bg-emerald-500/[0.07] hover:bg-emerald-500/[0.09] active:bg-emerald-500/[0.11]'
                : 'hover:bg-slate-700/40 active:bg-slate-700/60'
        }`}
        onClick={onSelect}
      >
        {/* Left accent bar: only when active (emerald for normal, amber for new) */}
        {isActive && (
          <span
            className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full ${
              isNew ? 'bg-amber-400' : 'bg-emerald-400/80'
            }`}
          />
        )}

        <div className="flex-1 py-3.5 sm:py-3 pl-4 pr-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={`text-base sm:text-sm font-semibold leading-snug truncate ${
              isNew ? 'text-slate-100' : isActive ? 'text-emerald-100/90' : 'text-slate-100'
            }`}>
              {note.title || 'Untitled'}
            </h3>
            {isNew && (
              <span className="flex-shrink-0 text-[10px] uppercase tracking-wider font-bold text-amber-400/70 bg-amber-500/10 rounded-full px-1.5 py-0.5">
                New
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 sm:mt-1.5">
            {showFolder && (
              <span className={`flex items-center gap-1 text-sm sm:text-xs ${isNew ? 'text-amber-400/70' : 'text-slate-500'}`}>
                <FolderOpen className="w-4 h-4 sm:w-3 sm:h-3 flex-shrink-0" />
                <span className="truncate max-w-[100px]">{folderName || 'No folder'}</span>
              </span>
            )}

            <span className={`flex items-center gap-1 text-sm sm:text-xs ${isNew ? 'text-amber-400/70' : 'text-slate-500'}`}>
              <Clock className="w-4 h-4 sm:w-3 sm:h-3 flex-shrink-0" />
              {formatDate(note.updated_at)}
            </span>
            {note.files && note.files.length > 0 && (
              <span className={`flex items-center gap-1 text-sm sm:text-xs ${isNew ? 'text-amber-400/70' : 'text-slate-500'}`}>
                <FileText className="w-4 h-4 sm:w-3 sm:h-3 flex-shrink-0" />
                {note.files.length}
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center pr-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <UnifiedMenu
            ariaLabel="Note options"
            onOpenChange={setMenuOpen}
            triggerClassName={`w-9 h-9 sm:w-8 sm:h-8 text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 ${
              menuOpen ? '' : 'sm:opacity-0 sm:group-hover/card:opacity-100'
            }`}
            iconClassName="w-5 h-5 sm:w-4 sm:h-4"
            items={[
              {
                id: 'move',
                label: 'Move to folder',
                icon: FolderInput,
                onSelect: () => setMoveSheetOpen(true),
              },
              { id: 'delete', label: 'Delete', icon: Trash2, danger: true, onSelect: onDelete },
            ]}
          />
        </div>
      </div>

      {moveSheetOpen && (
        <NoteFolderLinker
          note={note}
          folders={folders}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onMove={onMove}
          onClose={() => setMoveSheetOpen(false)}
        />
      )}
    </>
  );
}

/* ---------- Public note list ---------- */

export interface UnifiedNoteListProps {
  mode: 'all' | 'folders';
  selectedFolderId: string | null;
  notes: NoteWithDetails[];
  folders: FolderType[];
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  currentNoteId: string | null;
  searchQuery: string;
  onSelectNote: (noteId: string) => void;
  onDeleteNote: (note: NoteWithDetails) => void;
  onMoveNote: (noteId: string, folderId: string | null, workspaceId?: string) => void;
  onCreateNoteInFolder?: (folderId: string) => void;
  onSwitchToAllNotes?: () => void;
}

export function UnifiedNoteList({
  mode,
  selectedFolderId,
  notes,
  folders,
  workspaces,
  activeWorkspaceId,
  currentNoteId,
  searchQuery,
  onSelectNote,
  onDeleteNote,
  onMoveNote,
  onCreateNoteInFolder,
  onSwitchToAllNotes,
}: UnifiedNoteListProps) {
  const noteMatches = useCallback(
    (n: NoteWithDetails, q: string) =>
      n.title.toLowerCase().includes(q) ||
      JSON.stringify(n.content).toLowerCase().includes(q),
    []
  );

  const allNotesSorted = useMemo(
    () => [...notes].sort((a, b) => {
      const aNew = a.is_new ?? false;
      const bNew = b.is_new ?? false;
      if (aNew !== bNew) return aNew ? -1 : 1;
      if (aNew && bNew) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return (a.title || '').localeCompare(b.title || '');
    }),
    [notes]
  );

  const unfiledNotes = useMemo(
    () => notes.filter((n) => !n.folder_id).sort((a, b) => {
      const aNew = a.is_new ?? false;
      const bNew = b.is_new ?? false;
      if (aNew !== bNew) return aNew ? -1 : 1;
      if (aNew && bNew) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return (a.title || '').localeCompare(b.title || '');
    }),
    [notes]
  );

  const q = searchQuery.trim().toLowerCase();
  const hasQuery = q.length > 0;

  const NoMatchesFallback = ({ label }: { label: string }) => (
    <div className="py-12 text-center px-4">
      <Search className="w-8 h-8 text-slate-700 mx-auto mb-2" />
      <p className="text-sm text-slate-500">No {label} match "{searchQuery}"</p>
      {onSwitchToAllNotes && (
        <button
          onClick={onSwitchToAllNotes}
          className="mt-3 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Search all notes instead →
        </button>
      )}
    </div>
  );

  /* ---------- All Notes mode ---------- */
  if (mode === 'all') {
    const list = hasQuery ? allNotesSorted.filter((n) => noteMatches(n, q)) : allNotesSorted;
    return (
      <div className="p-3">
        {allNotesSorted.length === 0 ? (
          <div className="py-16 text-center">
            <Notebook className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">No notes yet</p>
            <p className="text-xs text-slate-600 mt-1">Tap "New Note" to get started</p>
          </div>
        ) : list.length === 0 ? (
          <div className="py-12 text-center">
            <Search className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No notes match "{searchQuery}"</p>
          </div>
        ) : (
          <>
            {hasQuery && (
              <p className="text-xs text-slate-500 px-1 mb-2">
                {list.length} result{list.length !== 1 ? 's' : ''}
              </p>
            )}
            <div className="space-y-1">
              {list.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  folders={folders}
                  workspaces={workspaces}
                  activeWorkspaceId={activeWorkspaceId}
                  isActive={currentNoteId === note.id}
                  onSelect={() => onSelectNote(note.id)}
                  onDelete={() => onDeleteNote(note)}
                  onMove={(fid, wid) => onMoveNote(note.id, fid, wid)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  /* ---------- Folders mode: inside a folder ---------- */
  if (selectedFolderId) {
    const isNoFolder = selectedFolderId === NO_FOLDER_ID;
    const folder = isNoFolder ? null : folders.find((f) => f.id === selectedFolderId);
    if (!isNoFolder && !folder) return null;
    const baseNotes = (isNoFolder
      ? unfiledNotes
      : notes.filter((n) => n.folder_id === folder!.id)
    ).slice().sort((a, b) => {
      const aNew = a.is_new ?? false;
      const bNew = b.is_new ?? false;
      if (aNew !== bNew) return aNew ? -1 : 1;
      if (aNew && bNew) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return (a.title || '').localeCompare(b.title || '');
    });
    const folderNotes = hasQuery ? baseNotes.filter((n) => noteMatches(n, q)) : baseNotes;

    return (
      <div className="p-3">
        {folderNotes.length > 0 ? (
          <>
            {hasQuery && (
              <p className="text-xs text-slate-500 px-1 mb-2">
                {folderNotes.length} result{folderNotes.length !== 1 ? 's' : ''} in folder
              </p>
            )}
            <div className="space-y-1.5">
              {folderNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  folders={folders}
                  workspaces={workspaces}
                  activeWorkspaceId={activeWorkspaceId}
                  isActive={currentNoteId === note.id}
                  onSelect={() => onSelectNote(note.id)}
                  onDelete={() => onDeleteNote(note)}
                  onMove={(fid, wid) => onMoveNote(note.id, fid, wid)}
                  showFolder={false}
                />
              ))}
            </div>
          </>
        ) : hasQuery ? (
          <NoMatchesFallback label="notes in this folder" />
        ) : (
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">
              {isNoFolder ? 'No unfiled notes' : 'No notes in this folder'}
            </p>
            {!isNoFolder && onCreateNoteInFolder && folder && (
              <button
                onClick={() => onCreateNoteInFolder(folder.id)}
                className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                Create a note here
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ---------- Folders mode: folder list (not our responsibility) ---------- */
  return null;
}
