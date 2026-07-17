import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Folder as FolderIcon,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Search,
  FileText,
  Clock,
  FolderOpen,
  AlertTriangle,
  Notebook,
  LayoutList,
  FolderTree as FolderTreeIcon,
  X,
  Pencil,
  Settings2,
  MoreHorizontal,
  FolderInput,
  
  FolderPlus,
  ChevronLeft,
  Inbox,
} from 'lucide-react';
import { NoteWithDetails, Folder as FolderType } from '../types/database';
import { StorageUsage } from './StorageUsage';


interface UnifiedSidebarProps {
  workspaceName?: string;
  folders: FolderType[];
  notes: NoteWithDetails[];
  currentNoteId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectNote: (noteId: string) => void;
  onCreateNote: (folderId?: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteNote: (noteId: string) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  totalStorageBytes: number;
  onOpenStorage: () => void;
  onOpenWorkspaceManagement: () => void;
  onOpenSettings: () => void;
}

type Mode = 'all' | 'folders';

const EXPANDED_STORAGE_KEY = 'sidebar-folders-expanded';
const MODE_STORAGE_KEY = 'sidebar-mode';
const UNFILED_KEY = '__unfiled__';

function loadExpandedState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupt state
  }
  return {};
}

function formatDate(date: string) {
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

/* ---------- NoteFolderLinker (mobile-first folder picker for a note) ---------- */

function NoteFolderLinker({
  note,
  folders,
  onMove,
  onClose,
  workspaceName,
}: {
  note: NoteWithDetails;
  folders: FolderType[];
  onMove: (folderId: string | null) => void;
  onClose: () => void;
  workspaceName?: string;
}) {
  const currentFolder = folders.find((f) => f.id === note.folder_id) || null;
  const sortedFolders = [...folders].sort((a, b) => {
    const aNew = a.is_new ?? false;
    const bNew = b.is_new ?? false;
    if (aNew !== bNew) return aNew ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const [selected, setSelected] = useState<string | null>(note.folder_id);

  const handleConfirm = () => {
    if (selected !== note.folder_id) onMove(selected);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
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
            <h3 className="text-sm font-semibold text-white">Move to folder</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Note info card */}
        <div className="px-5 py-3.5 bg-slate-900/30 border-b border-slate-700/40">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{note.title || 'Untitled'}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  {formatDate(note.updated_at)}
                </span>
                <span className={`flex items-center gap-1 text-xs ${currentFolder ? 'text-emerald-400/80' : 'text-slate-500'}`}>
                  <FolderOpen className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">
                    {currentFolder ? currentFolder.name : 'No folder'}
                  </span>
                </span>
                {note.files && note.files.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <FileText className="w-3 h-3" />
                    {note.files.length}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <LayoutList className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">
                    {workspaceName || 'My Notes'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Folder list (radio-style single selection) */}
        <div className="flex-1 overflow-y-auto py-2">
          <button
            onClick={() => setSelected(null)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              selected === null ? 'bg-emerald-600/10' : 'hover:bg-slate-700/40'
            }`}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              selected === null ? 'border-emerald-500' : 'border-slate-600'
            }`}>
              {selected === null && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </span>
            <FolderOpen className={`w-4 h-4 flex-shrink-0 ${selected === null ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className={selected === null ? 'text-emerald-400 font-medium' : 'text-slate-300'}>No folder</span>
          </button>

          {sortedFolders.length > 0 && <div className="border-t border-slate-700/40 my-1" />}

          {sortedFolders.map((f) => {
            const isSelected = selected === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelected(f.id)}
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
            disabled={selected === note.folder_id}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Note card ---------- */

function NoteCard({
  note,
  folders,
  isActive,
  onSelect,
  onDelete,
  onMove,
  showFolder = true,
  workspaceName,
}: {
  note: NoteWithDetails;
  folders: FolderType[];
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
  showFolder?: boolean;
  workspaceName?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveSheetOpen, setMoveSheetOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const folderName = folders.find((f) => f.id === note.folder_id)?.name || null;

  const openMenu = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuW = 196;
      const menuH = 108;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuH + 8 && rect.top > menuH + 8;
      const left = Math.min(rect.right - menuW, window.innerWidth - menuW - 8);
      setMenuPos({
        top: openUp ? rect.top - menuH - 4 : rect.bottom + 4,
        left: Math.max(8, left),
      });
    }
    setMenuOpen(true);
  };

  const isNew = note.is_new ?? false;

  return (
    <>
      <div
        className={`group/card relative flex items-stretch rounded-xl cursor-pointer transition-all duration-150 ${
          isActive
            ? 'bg-emerald-600/15 border border-emerald-500/30 shadow-sm'
            : isNew
              ? 'bg-amber-500/5 border border-dashed border-amber-500/40 hover:bg-amber-500/10'
              : 'border border-transparent hover:bg-slate-700/40 active:bg-slate-700/60'
        }`}
        onClick={onSelect}
      >
        {/* Active indicator bar */}
        {isActive && (
          <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-full" />
        )}

        <div className="flex-1 py-3.5 sm:py-3 pl-4 pr-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={`text-base sm:text-sm font-semibold leading-snug truncate ${
              isActive ? 'text-emerald-100' : isNew ? 'text-amber-200 italic' : 'text-slate-100'
            }`}>
              {note.title || 'Untitled'}
            </h3>
            {isNew && (
              <span className="flex-shrink-0 text-[10px] uppercase tracking-wider font-bold text-amber-400/90 bg-amber-500/15 border border-amber-500/30 rounded-full px-1.5 py-0.5">
                New
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 sm:mt-1.5">
            {showFolder && (
              <span className={`flex items-center gap-1 text-sm sm:text-xs ${
                folderName ? 'text-emerald-400/80' : 'text-slate-500'
              }`}>
                <FolderOpen className="w-4 h-4 sm:w-3 sm:h-3 flex-shrink-0" />
                <span className="truncate max-w-[100px]">{folderName || 'No folder'}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-sm sm:text-xs text-slate-500">
              <Clock className="w-4 h-4 sm:w-3 sm:h-3 flex-shrink-0" />
              {formatDate(note.updated_at)}
            </span>
            {note.files && note.files.length > 0 && (
              <span className="flex items-center gap-1 text-sm sm:text-xs text-slate-500">
                <FileText className="w-4 h-4 sm:w-3 sm:h-3 flex-shrink-0" />
                {note.files.length}
              </span>
            )}
          </div>
        </div>


        {/* Action button */}
        <div className="flex items-center pr-2 flex-shrink-0">
          <button
            ref={triggerRef}
            onClick={(e) => {
              e.stopPropagation();
              if (menuOpen) {
                setMenuOpen(false);
              } else {
                openMenu();
              }
            }}
            className={`p-2 rounded-lg transition-colors ${
              menuOpen
                ? 'bg-slate-600/60 text-slate-200'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 sm:opacity-0 sm:group-hover/card:opacity-100'
            }`}
            title="Note options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {menuOpen && menuPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
            className="w-[196px] bg-slate-800 border border-slate-600/60 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] py-1.5 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                setMoveSheetOpen(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-slate-200 hover:bg-slate-700/70 active:bg-slate-700 transition-colors"
            >
              <FolderInput className="w-4 h-4 text-slate-400 flex-shrink-0" />
              Move to folder
            </button>
            <div className="mx-3 border-t border-slate-700/60" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              Delete
            </button>
          </div>
        </>,
        document.body
      )}

      {moveSheetOpen && (
        <NoteFolderLinker
          note={note}
          folders={folders}
          onMove={onMove}
          onClose={() => setMoveSheetOpen(false)}
          workspaceName={workspaceName}
        />
      )}
    </>
  );
}

/* ---------- Folder section ---------- */

function FolderSection({
  folder,
  notes,
  allFolders,
  currentNoteId,
  expanded,
  onToggle,
  onSelectNote,
  onDeleteNote,
  onMoveNote,
  onRequestDelete,
  onRenameFolder,
  onCreateNoteInFolder,
  workspaceName,
}: {
  folder: FolderType;
  notes: NoteWithDetails[];
  allFolders: FolderType[];
  currentNoteId: string | null;
  expanded: boolean;
  onToggle: () => void;
  onSelectNote: (id: string) => void;
  onDeleteNote: (n: NoteWithDetails) => void;
  onMoveNote: (id: string, fid: string | null) => void;
  onRequestDelete: (folder: FolderType) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onCreateNoteInFolder: (folderId: string) => void;
  workspaceName?: string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleRename = () => {
    if (renameValue.trim() && renameValue !== folder.name)
      onRenameFolder(folder.id, renameValue.trim());
    setIsRenaming(false);
  };

  const sortedNotes = [...notes].sort((a, b) =>
    (a.title || '').localeCompare(b.title || '')
  );

  return (
    <div className="mb-1">
      {/* Folder header */}
      <div
        className="flex items-center gap-1 rounded-xl hover:bg-slate-700/40 active:bg-slate-700/60 transition-colors cursor-pointer select-none group"
        onClick={() => { if (!isRenaming) onToggle(); }}
      >
        <span className="p-3 sm:p-2.5 text-slate-500 flex-shrink-0">
          {expanded ? (
            <ChevronDown className="w-5 h-5 sm:w-4 sm:h-4" />
          ) : (
            <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4" />
          )}
        </span>

        <div className="flex-1 flex items-center gap-2 py-1 sm:py-0.5 min-w-0">
          {expanded ? (
            <FolderOpen className="w-5 h-5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
          ) : (
            <FolderIcon className="w-5 h-5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
          )}

          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') { setRenameValue(folder.name); setIsRenaming(false); }
              }}
              className="flex-1 bg-slate-700 text-white text-base sm:text-sm rounded-lg px-2 py-1 sm:py-0.5 outline-none border border-emerald-500 min-w-0"
              autoFocus
            />
          ) : (
            <span
              className="text-base sm:text-sm font-semibold text-slate-200 truncate"
              onDoubleClick={(e) => { e.stopPropagation(); setRenameValue(folder.name); setIsRenaming(true); }}
            >
              {folder.name}
            </span>
          )}

          {!isRenaming && (
            <span className="ml-auto mr-1 min-w-[20px] text-center text-sm sm:text-xs font-medium text-slate-500 bg-slate-700/60 rounded-full px-1.5 py-0.5 flex-shrink-0">
              {notes.length}
            </span>
          )}
        </div>

        {/* Folder actions */}
        <div className="flex items-center flex-shrink-0 pr-1 gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onCreateNoteInFolder(folder.id); }}
            className="p-2.5 sm:p-2 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-slate-700/60 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            title="New note in folder"
          >
            <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>

          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-2.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              title="Folder options"
            >
              <MoreHorizontal className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-40 min-w-[150px] py-1.5 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { setRenameValue(folder.name); setIsRenaming(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-300 hover:bg-slate-700/60 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Rename
                </button>
                <div className="border-t border-slate-700/60 my-1" />
                <button
                  onClick={() => { onRequestDelete(folder); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes inside folder */}
      {expanded && (
        <div className="mt-0.5 ml-3 pl-3 border-l border-slate-700/50 space-y-0.5">
          {sortedNotes.length === 0 ? (
            <p className="text-xs text-slate-600 italic py-2 px-1">Empty folder</p>
          ) : (
            sortedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                folders={allFolders}
                isActive={currentNoteId === note.id}
                onSelect={() => onSelectNote(note.id)}
                onDelete={() => onDeleteNote(note)}
                onMove={(fid) => onMoveNote(note.id, fid)}
                showFolder={false}
                workspaceName={workspaceName}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Sidebar nav-bar (mode toggle / breadcrumb / search / + New) ---------- */

const NO_FOLDER_ID = '__no_folder__';

function SidebarNavBar({
  mode,
  setMode,
  selectedFolderId,
  setSelectedFolderId,
  folders,
  notes: _notes,
  unfiledCount,
  searchQuery,
  onSearchChange,
  onCreateNote,
  onCreateFolder,
  onCreateNoteInFolder,
  onRenameFolder,
  onOpenDeleteFolder,
  onExpandUnfiled,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  folders: FolderType[];
  notes: NoteWithDetails[];
  unfiledCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCreateNote: (folderId?: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onCreateNoteInFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onOpenDeleteFolder: (folder: FolderType) => void;
  onExpandUnfiled: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState<boolean>(() => !!searchQuery);
  const [plusOpen, setPlusOpen] = useState(false);
  const [plusPos, setPlusPos] = useState<{ top: number; left: number } | null>(null);
  const [crumbMenuOpen, setCrumbMenuOpen] = useState(false);
  const [crumbMenuPos, setCrumbMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const plusRef = useRef<HTMLButtonElement | null>(null);
  const crumbRef = useRef<HTMLButtonElement | null>(null);
  
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);

  // Sync mode -> localStorage
  const persistMode = (m: Mode) => {
    setMode(m);
    setSelectedFolderId(null);
    try { localStorage.setItem(MODE_STORAGE_KEY, m); } catch { /* noop */ }
  };

  // Auto-open mobile search when there's a query (e.g. restored)
  useEffect(() => {
    if (searchQuery && !searchOpen) setSearchOpen(true);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchOpen && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Close popovers on outside click / Escape
  useEffect(() => {
    if (!plusOpen && !crumbMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPlusOpen(false); setCrumbMenuOpen(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [plusOpen, crumbMenuOpen]);

  const openPlus = () => {
    const rect = plusRef.current!.getBoundingClientRect();
    const MENU_W = 220;
    const MENU_H = 120;
    const MARGIN = 8;
    const left = Math.min(rect.right - MENU_W, window.innerWidth - MENU_W - MARGIN);
    const top = Math.min(rect.bottom + 6, window.innerHeight - MENU_H - MARGIN);
    setPlusPos({ top: Math.max(MARGIN, top), left: Math.max(MARGIN, left) });
    setPlusOpen(true);
  };

  const openCrumbMenu = () => {
    const rect = crumbRef.current!.getBoundingClientRect();
    const MENU_W = 200;
    const MENU_H = 130;
    const MARGIN = 8;
    const left = Math.min(rect.right - MENU_W, window.innerWidth - MENU_W - MARGIN);
    const top = Math.min(rect.bottom + 6, window.innerHeight - MENU_H - MARGIN);
    setCrumbMenuPos({ top: Math.max(MARGIN, top), left: Math.max(MARGIN, left) });
    setCrumbMenuOpen(true);
  };

  // Which primary action?
  const isNoFolder = selectedFolderId === NO_FOLDER_ID;
  const insideFolder = !!selectedFolderId;
  const currentFolder = insideFolder && !isNoFolder
    ? folders.find((f) => f.id === selectedFolderId) ?? null
    : null;

  const handlePlusClick = () => {
    if (mode === 'all') {
      onCreateNote();
      return;
    }
    if (insideFolder) {
      if (isNoFolder) onCreateNote();
      else if (currentFolder) onCreateNoteInFolder(currentFolder.id);
      return;
    }
    // Folders mode, no folder open -> popover
    plusOpen ? setPlusOpen(false) : openPlus();
  };

  // Breadcrumb variant (color dot)
  const crumbInfo = (() => {
    if (isNoFolder) {
      return { name: 'No Folder', count: unfiledCount, dot: 'bg-slate-500', italic: true, canMenu: false, isNew: false };
    }
    if (currentFolder) {
      const folderNoteCount = _notes.filter((n) => n.folder_id === currentFolder.id).length;
      return {
        name: currentFolder.name,
        count: folderNoteCount,
        dot: currentFolder.is_new ? 'bg-amber-400' : 'bg-emerald-400',
        italic: false,
        canMenu: true,
        isNew: !!currentFolder.is_new,
      };
    }
    return null;
  })();

  

  const mobileSearchVisible = searchOpen || !!searchQuery;

  /* Left slot: segmented toggle (default) or breadcrumb (inside a folder).
     Both variants share the same shell: h-9, rounded-xl, bg-slate-900/40. */
  const leftSlot = insideFolder && crumbInfo ? (
    <div className="flex-1 min-w-0 h-9 flex items-center gap-1 pl-1 pr-1 rounded-xl bg-slate-900/40">
      <button
        onClick={() => setSelectedFolderId(null)}
        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 active:bg-slate-700/80 transition-colors"
        aria-label="Back to folders"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span className={`flex-shrink-0 w-2 h-2 rounded-full ${crumbInfo.dot}`} />

      {isRenaming && crumbInfo.canMenu && currentFolder ? (
        <input
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={() => {
            const v = renameValue.trim();
            if (v && v !== currentFolder.name) onRenameFolder(currentFolder.id, v);
            setIsRenaming(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') { setRenameValue(currentFolder.name); setIsRenaming(false); }
          }}
          className="flex-1 min-w-0 h-7 bg-slate-700/80 text-white rounded-md px-2 text-[13px] font-semibold outline-none border border-emerald-500/60"
          autoFocus
        />
      ) : (
        <>
          <span className={`min-w-0 flex-1 truncate text-[13px] font-semibold leading-none ${crumbInfo.italic ? 'text-slate-300 italic' : 'text-slate-100'}`}>
            {crumbInfo.name}
          </span>
          {crumbInfo.isNew && (
            <span className="flex-shrink-0 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 uppercase">
              New
            </span>
          )}
          <span className="flex-shrink-0 text-[12px] font-medium text-slate-500 tabular-nums pr-1">
            {crumbInfo.count}
          </span>
          {crumbInfo.canMenu && (
            <button
              ref={crumbRef}
              onClick={(e) => { e.stopPropagation(); crumbMenuOpen ? setCrumbMenuOpen(false) : openCrumbMenu(); }}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 active:bg-slate-700/80 transition-colors"
              aria-label="Folder options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        </>
      )}
    </div>
  ) : (
    <div className="flex-1 min-w-0 h-9 flex gap-1 p-1 rounded-xl bg-slate-900/40">
      <button
        onClick={() => persistMode('all')}
        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-all ${
          mode === 'all' ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 active:bg-slate-700/40'
        }`}
      >
        <LayoutList className="w-3.5 h-3.5" />
        All Notes
      </button>
      <button
        onClick={() => persistMode('folders')}
        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-all ${
          mode === 'folders' ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 active:bg-slate-700/40'
        }`}
      >
        <FolderTreeIcon className="w-3.5 h-3.5" />
        Folders
      </button>
    </div>
  );

  return (
    <div className="border-b border-slate-700/50 bg-slate-800">
      {/* Single nav row — swaps between controls and search inline (no vertical growth) */}
      <div className="h-11 px-3 flex items-center gap-2">
        {mobileSearchVisible ? (
          <>
            <div className="flex-1 min-w-0 relative h-9">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { onSearchChange(''); setSearchOpen(false); }
                }}
                className="w-full h-9 bg-slate-900/40 border border-slate-700/50 rounded-xl pl-9 pr-8 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 text-[13px]"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => { onSearchChange(''); setSearchOpen(false); }}
              className="flex-shrink-0 h-9 px-2.5 rounded-lg text-[13px] font-medium text-slate-300 hover:text-white hover:bg-slate-700/60 active:bg-slate-700/80 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {leftSlot}

            <button
              onClick={() => setSearchOpen(true)}
              className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 active:bg-slate-700/80 transition-colors"
              aria-label="Search notes"
            >
              <Search className="w-4 h-4" />
            </button>

            {(() => {
              const isChoice = mode === 'folders' && !insideFolder;
              const isUnfiled = insideFolder && isNoFolder;
              const tone = isChoice
                ? {
                    grad: 'from-amber-400 to-amber-600',
                    ring: 'ring-amber-300/40',
                    glow: 'shadow-[0_4px_14px_-4px_rgba(245,158,11,0.55)]',
                  }
                : isUnfiled
                ? {
                    grad: 'from-slate-500 to-slate-700',
                    ring: 'ring-slate-300/20',
                    glow: 'shadow-[0_4px_14px_-4px_rgba(148,163,184,0.45)]',
                  }
                : {
                    grad: 'from-emerald-400 to-emerald-600',
                    ring: 'ring-emerald-300/40',
                    glow: 'shadow-[0_4px_14px_-4px_rgba(16,185,129,0.55)]',
                  };
              const label = isChoice
                ? 'Create note or folder'
                : isUnfiled
                ? 'New unfiled note'
                : 'New note';
              return (
                <button
                  ref={plusRef}
                  onClick={handlePlusClick}
                  className={`group relative flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-white bg-gradient-to-b ${tone.grad} ring-1 ${tone.ring} ${tone.glow} hover:brightness-110 active:brightness-95 active:scale-[0.97] transition-all duration-150`}
                  aria-label={label}
                  title={label}
                >
                  {/* subtle inner highlight */}
                  <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 to-transparent opacity-60" />
                  {isChoice ? (
                    <span className="relative flex items-center justify-center">
                      <FolderPlus className="w-[17px] h-[17px]" strokeWidth={2.25} />
                      <span className="absolute -bottom-1 -right-1.5 flex items-center justify-center w-3 h-3 rounded-full bg-white/95 text-amber-600 ring-1 ring-amber-700/20">
                        <ChevronDown className="w-2 h-2" strokeWidth={3.5} />
                      </span>
                    </span>
                  ) : isUnfiled ? (
                    <FileText className="relative w-[17px] h-[17px]" strokeWidth={2.25} />
                  ) : (
                    <Plus className="relative w-[19px] h-[19px]" strokeWidth={2.5} />
                  )}
                </button>
              );
            })()}


          </>
        )}
      </div>



      {/* + New popover (Folders mode, no folder open) */}
      {plusOpen && plusPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setPlusOpen(false)} />
          <div
            style={{ position: 'fixed', top: plusPos.top, left: plusPos.left, zIndex: 9999, width: 220 }}
            className="bg-slate-800/97 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.75)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setPlusOpen(false);
                onCreateNote();
                onExpandUnfiled();
                setSelectedFolderId(NO_FOLDER_ID);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 text-slate-100 hover:bg-white/5 active:bg-white/10 transition-colors"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-300">
                <FileText className="w-4 h-4" />
              </span>
              <span className="text-sm font-medium">New Note</span>
            </button>
            <div className="h-px bg-white/8" />
            <button
              onClick={() => { setPlusOpen(false); onCreateFolder('New Folder', null); }}
              className="w-full flex items-center gap-3 px-3 py-3 text-slate-100 hover:bg-white/5 active:bg-white/10 transition-colors"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-700/70 text-slate-200">
                <FolderPlus className="w-4 h-4" />
              </span>
              <span className="text-sm font-medium">New Folder</span>
            </button>
          </div>
        </>,
        document.body,
      )}

      {/* Breadcrumb ⋯ popover (Rename / Delete) */}
      {crumbMenuOpen && crumbMenuPos && currentFolder && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setCrumbMenuOpen(false)} />
          <div
            style={{ position: 'fixed', top: crumbMenuPos.top, left: crumbMenuPos.left, zIndex: 9999, width: 200 }}
            className="bg-slate-800/97 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.75)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setCrumbMenuOpen(false);
                setRenameValue(currentFolder.name);
                setIsRenaming(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-100 hover:bg-white/5 active:bg-white/10 transition-colors"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700/80 text-slate-200">
                <Pencil className="w-4 h-4" />
              </span>
              <span className="text-sm font-medium">Rename</span>
            </button>
            <div className="h-px bg-white/8" />
            <button
              onClick={() => { setCrumbMenuOpen(false); onOpenDeleteFolder(currentFolder); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/15 text-red-400">
                <Trash2 className="w-4 h-4" />
              </span>
              <span className="text-sm font-medium">Delete</span>
            </button>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}



/* ---------- Flat folder row (Folders mode) ---------- */

function FolderRowFlat({
  folder,
  notes,
  onSelect,
  onRename,
  onDelete,
}: {
  folder: FolderType;
  notes: NoteWithDetails[];
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(folder.is_new ?? false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (folder.is_new && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [folder.is_new]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const openMenu = () => {
    const rect = triggerRef.current!.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const MENU_W = isMobile ? 230 : 200;
    const MENU_H = isMobile ? 200 : 140;
    const MARGIN = 8;
    const left = Math.min(rect.right - MENU_W, window.innerWidth - MENU_W - MARGIN);
    const top = Math.min(rect.bottom + 4, window.innerHeight - MENU_H - MARGIN);
    setMenuPos({ top: Math.max(MARGIN, top), left: Math.max(MARGIN, left) });
    setMenuOpen(true);
  };

  const handleRename = () => {
    if (renameValue.trim() && renameValue !== folder.name) onRename(renameValue.trim());
    setIsRenaming(false);
  };

  const count = notes.filter((n) => n.folder_id === folder.id).length;

  return (
    <div className="group folder-row w-full flex items-center gap-3 px-4 py-3.5 sm:px-3 sm:py-2.5 bg-slate-700/40 hover:bg-slate-700/70 active:bg-slate-700 border border-slate-700/50 hover:border-emerald-500/40 rounded-xl transition-all">
      <button onClick={onSelect} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-emerald-600/10 flex-shrink-0">
          {folder.is_new ? (
            <FolderPlus className="w-5 h-5 sm:w-4.5 sm:h-4.5 text-amber-400/80 group-hover:text-amber-400 transition-colors" />
          ) : (
            <FolderIcon className="w-5 h-5 sm:w-4.5 sm:h-4.5 text-emerald-400/70 group-hover:text-emerald-400 transition-colors" />
          )}
        </div>
        {isRenaming ? (
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setRenameValue(folder.name); setIsRenaming(false); }
            }}
            ref={renameInputRef}
            className="folder-rename-input flex-1 min-w-0 bg-slate-700/80 text-white rounded-lg px-2.5 py-1.5 outline-none border border-emerald-500/60 ring-2 ring-emerald-500/20"
            autoFocus
          />
        ) : (
          <span className="folder-name flex-1 min-w-0 text-[17px] sm:text-sm font-semibold text-white truncate">{folder.name}</span>
        )}
        {!isRenaming && (
          <span className="folder-count-badge flex-shrink-0 inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-slate-600/50 text-[11px] font-semibold text-slate-400 tabular-nums">
            {count}
          </span>
        )}
      </button>

      <button
        ref={triggerRef}
        onClick={(e) => { e.stopPropagation(); menuOpen ? setMenuOpen(false) : openMenu(); }}
        className="folder-menu-btn flex-shrink-0 flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        title="Folder options"
      >
        <MoreHorizontal className="folder-menu-icon" />
      </button>

      {menuOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos!.top, left: menuPos!.left, zIndex: 9999 }}
            className="folder-dropdown bg-slate-800/97 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden
                       shadow-[0_20px_60px_rgba(0,0,0,0.75),0_0_0_0.5px_rgba(255,255,255,0.07)]
                       animate-[dropdownIn_0.18s_cubic-bezier(0.34,1.4,0.64,1)_both]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setRenameValue(folder.name); setIsRenaming(true); setMenuOpen(false); }}
              className="folder-dropdown-item neutral w-full flex items-center text-slate-100 active:bg-white/12"
            >
              <span className="folder-dropdown-icon flex items-center justify-center rounded-xl bg-slate-700/80 flex-shrink-0">
                <Pencil className="text-slate-200" />
              </span>
              Rename
            </button>
            <div className="h-px bg-white/8" />
            <button
              onClick={() => { setMenuOpen(false); onDelete(); }}
              className="folder-dropdown-item danger w-full flex items-center text-red-400 active:bg-red-500/15"
            >
              <span className="folder-dropdown-icon flex items-center justify-center rounded-xl bg-red-500/15 flex-shrink-0">
                <Trash2 className="text-red-400" />
              </span>
              Delete
            </button>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

/* ---------- Main sidebar ---------- */

export function UnifiedSidebar({
  workspaceName,
  folders,
  notes,
  currentNoteId,
  searchQuery,
  onSearchChange,
  onSelectNote,
  onCreateNote,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onDeleteNote,
  onMoveNote,
  totalStorageBytes,
  onOpenStorage,
  onOpenWorkspaceManagement,
  onOpenSettings,
}: UnifiedSidebarProps) {
  const [mode, setMode] = useState<Mode>(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      if (saved === 'all' || saved === 'folders') return saved;
    } catch { /* storage unavailable */ }
    return 'all';
  });

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<NoteWithDetails | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(loadExpandedState);

  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(expandedMap));
    } catch {
      // storage unavailable
    }
  }, [expandedMap]);

  const isExpanded = useCallback(
    (key: string) => expandedMap[key] !== false,
    [expandedMap]
  );

  const setExpanded = useCallback((key: string, value: boolean) => {
    setExpandedMap((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleExpanded = (key: string) => setExpanded(key, !isExpanded(key));

  const handleToggleFolder = (folderId: string) => {
    const wasExpanded = isExpanded(folderId);
    setExpanded(folderId, !wasExpanded);
    if (wasExpanded && currentNoteId) {
      const folderNotes = notes.filter((n) => n.folder_id === folderId);
      if (folderNotes.some((n) => n.id === currentNoteId)) {
        onSelectNote('');
      }
    }
  };

  const handleToggleUnfiled = () => {
    const wasExpanded = unfiledExpanded;
    toggleExpanded(UNFILED_KEY);
    if (wasExpanded && currentNoteId && unfiledNotes.some((n) => n.id === currentNoteId)) {
      onSelectNote('');
    }
  };
  void handleToggleFolder;
  void handleToggleUnfiled;
  void FolderSection;

  useEffect(() => {
    if (!currentNoteId) return;
    const note = notes.find((n) => n.id === currentNoteId);
    if (note?.folder_id && !isExpanded(note.folder_id)) {
      setExpanded(note.folder_id, true);
    }
  }, [currentNoteId, notes, isExpanded, setExpanded]);

  const handleCreateNoteInFolder = (folderId: string) => {
    onCreateNote(folderId);
    setExpanded(folderId, true);
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        JSON.stringify(n.content).toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => {
      const aNew = a.is_new ?? false;
      const bNew = b.is_new ?? false;
      if (aNew !== bNew) return aNew ? -1 : 1;
      return a.name.localeCompare(b.name);
    }),
    [folders]
  );

  const allNotesSorted = useMemo(
    () => [...notes].sort((a, b) => {
      const aNew = a.is_new ?? false;
      const bNew = b.is_new ?? false;
      if (aNew !== bNew) return aNew ? -1 : 1;
      return (a.title || '').localeCompare(b.title || '');
    }),
    [notes]
  );

  const unfiledNotes = useMemo(
    () => notes.filter((n) => !n.folder_id).sort((a, b) => {
      const aNew = a.is_new ?? false;
      const bNew = b.is_new ?? false;
      if (aNew !== bNew) return aNew ? -1 : 1;
      return (a.title || '').localeCompare(b.title || '');
    }),
    [notes]
  );

  const unfiledExpanded = isExpanded(UNFILED_KEY);
  const folderToDeleteNoteCount = folderToDelete
    ? notes.filter((n) => n.folder_id === folderToDelete.id).length
    : 0;

  return (
    <div className="flex flex-col h-full bg-slate-800 border-r border-slate-700/50">
      {/* Workspace header */}
      <button
        onClick={onOpenWorkspaceManagement}
        className="w-full px-4 pt-4 pb-3 border-b border-slate-700/50 text-left group/header hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <Notebook className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Workspace</p>
            <h1 className="text-sm font-bold text-white truncate">{workspaceName || 'My Notes'}</h1>
          </div>
          <Settings2 className="w-4 h-4 text-slate-500 group-hover/header:text-emerald-400 transition-colors flex-shrink-0" />
        </div>
      </button>

      <SidebarNavBar
        mode={mode}
        setMode={setMode}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={setSelectedFolderId}
        folders={sortedFolders}
        notes={notes}
        unfiledCount={unfiledNotes.length}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onCreateNote={onCreateNote}
        onCreateFolder={onCreateFolder}
        onCreateNoteInFolder={handleCreateNoteInFolder}
        onRenameFolder={onRenameFolder}
        onOpenDeleteFolder={(f) => setFolderToDelete(f)}
        onExpandUnfiled={() => setExpanded(UNFILED_KEY, true)}
      />



      {/* ===== NoteList-Viewer ===== */}
      <div className="flex-1 overflow-y-auto notes-list-scroll">
        {searchResults ? (
          /* Search results */
          <div className="p-3">
            <p className="text-xs text-slate-500 px-1 mb-2">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </p>
            {searchResults.length === 0 ? (
              <div className="py-12 text-center">
                <Search className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No notes found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {searchResults.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    folders={sortedFolders}
                    isActive={currentNoteId === note.id}
                    onSelect={() => onSelectNote(note.id)}
                    onDelete={() => setNoteToDelete(note)}
                    onMove={(fid) => onMoveNote(note.id, fid)}
                    workspaceName={workspaceName}
                  />
                ))}
              </div>
            )}
          </div>

        ) : mode === 'all' ? (
          /* All Notes — flat alphabetical */
          <div className="p-3">
            {allNotesSorted.length === 0 ? (
              <div className="py-16 text-center">
                <Notebook className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">No notes yet</p>
                <p className="text-xs text-slate-600 mt-1">Tap "New Note" to get started</p>
              </div>
            ) : (
              <div className="space-y-1">
                {allNotesSorted.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    folders={sortedFolders}
                    isActive={currentNoteId === note.id}
                    onSelect={() => onSelectNote(note.id)}
                    onDelete={() => setNoteToDelete(note)}
                    onMove={(fid) => onMoveNote(note.id, fid)}
                    workspaceName={workspaceName}
                  />
                ))}
              </div>
            )}
          </div>

        ) : (
          /* Folders mode */
          <div className="p-3">
            {/* Folders mode — drill-down view */}
            {(() => {
              const NO_FOLDER_ID = '__no_folder__';

              if (selectedFolderId) {
                const isNoFolder = selectedFolderId === NO_FOLDER_ID;
                const folder = isNoFolder ? null : sortedFolders.find((f) => f.id === selectedFolderId);
                if (!isNoFolder && !folder) return null;
                const folderNotes = (isNoFolder
                  ? unfiledNotes
                  : notes.filter((n) => n.folder_id === folder!.id)
                ).slice().sort((a, b) => {
                  const aNew = a.is_new ?? false;
                  const bNew = b.is_new ?? false;
                  if (aNew !== bNew) return aNew ? -1 : 1;
                  return (a.title || '').localeCompare(b.title || '');
                });
                
                return (
                  <div>
                    {folderNotes.length > 0 ? (

                      <div className="space-y-1.5">
                        {folderNotes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            folders={sortedFolders}
                            isActive={currentNoteId === note.id}
                            onSelect={() => onSelectNote(note.id)}
                            onDelete={() => setNoteToDelete(note)}
                            onMove={(fid) => onMoveNote(note.id, fid)}
                            showFolder={false}
                            workspaceName={workspaceName}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <FileText className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-500">
                          {isNoFolder ? 'No unfiled notes' : 'No notes in this folder'}
                        </p>
                        {!isNoFolder && (
                          <button
                            onClick={() => handleCreateNoteInFolder(folder!.id)}
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

              if (sortedFolders.length === 0 && unfiledNotes.length === 0) {
                return (
                  <div className="py-12 text-center">
                    <FolderIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">No folders yet</p>
                    <p className="text-xs text-slate-600 mt-1">Folders keep your notes organized</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2.5">
                  {/* No Folder — always first, unique design */}
                  {unfiledNotes.length > 0 && (
                    <button
                      onClick={() => setSelectedFolderId(NO_FOLDER_ID)}
                      className="group w-full flex items-center gap-3 px-4 py-3.5 sm:px-3 sm:py-2.5 bg-slate-700/20 hover:bg-slate-700/40 active:bg-slate-700/30 border border-dashed border-slate-600/60 hover:border-slate-500/60 rounded-xl transition-all"
                    >
                      <div className="flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-slate-700/60 flex-shrink-0">
                        <Inbox className="w-5 h-5 sm:w-4.5 sm:h-4.5 text-slate-400 group-hover:text-slate-300 transition-colors" />
                      </div>
                      <span className="flex-1 min-w-0 text-[17px] sm:text-sm font-semibold text-slate-300 truncate">No Folder</span>
                      <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-slate-600/40 text-[11px] font-semibold text-slate-500 tabular-nums">
                        {unfiledNotes.length}
                      </span>
                      {/* spacer matching the three-dots button width so badge aligns with other folder rows */}
                      <span className="flex-shrink-0 w-10 sm:w-8" aria-hidden="true" />
                    </button>
                  )}

                  {/* Named folders */}
                  {sortedFolders.map((folder) => (
                    <FolderRowFlat
                      key={folder.id}
                      folder={folder}
                      notes={notes}
                      onSelect={() => setSelectedFolderId(folder.id)}
                      onRename={(name) => onRenameFolder(folder.id, name)}
                      onDelete={() => setFolderToDelete(folder)}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Footer: Storage */}
      <StorageUsage totalBytes={totalStorageBytes} onOpen={onOpenStorage} onOpenSettings={onOpenSettings} />

      {/* Delete note confirmation */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border-0 sm:border sm:border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 max-w-sm w-full sm:mx-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-600/15 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Delete note?</h2>
              <p className="text-sm text-slate-400 mb-6">
                "{noteToDelete.title || 'Untitled'}" will be permanently deleted. This action cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setNoteToDelete(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onDeleteNote(noteToDelete.id); setNoteToDelete(null); }}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete folder confirmation */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border-0 sm:border sm:border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 max-w-sm w-full sm:mx-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-600/15 flex items-center justify-center mb-4">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Delete folder?</h2>
              <p className="text-sm text-slate-400 mb-6">
                "{folderToDelete.name}" will be deleted.{' '}
                {folderToDeleteNoteCount > 0
                  ? `${folderToDeleteNoteCount} note${folderToDeleteNoteCount !== 1 ? 's' : ''} inside will be moved to No folder — nothing will be lost.`
                  : 'The folder is empty.'}
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setFolderToDelete(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onDeleteFolder(folderToDelete.id); setFolderToDelete(null); }}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
                >
                  Delete Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
