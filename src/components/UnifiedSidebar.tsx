import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { UnifiedMenu } from './UnifiedMenu';
import { UnifiedWarningWindow } from './UnifiedWarningWindow';
import {
  Folder as FolderIcon,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  Trash2,
  Search,
  FolderOpen,
  Notebook,
  LayoutList,
  FolderTree as FolderTreeIcon,
  X,
  Pencil,
  MoreHorizontal,
  FolderPlus,
  Inbox,
} from 'lucide-react';
import { NoteWithDetails, Folder as FolderType } from '../types/database';
import { StorageUsage } from './StorageUsage';
import { UnifiedNoteList, NoteCard, formatDate } from './UnifiedNoteList';


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
  onOpenAccount: () => void;
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

  const sortedNotes = [...notes].sort((a, b) => {
    const aNew = a.is_new ?? false;
    const bNew = b.is_new ?? false;
    if (aNew !== bNew) return aNew ? -1 : 1;
    if (aNew && bNew) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return (a.title || '').localeCompare(b.title || '');
  });

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
  onRenameFolder,
  onOpenDeleteFolder,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  folders: FolderType[];
  notes: NoteWithDetails[];
  unfiledCount: number;
  onRenameFolder: (folderId: string, name: string) => void;
  onOpenDeleteFolder: (folder: FolderType) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const persistMode = (m: Mode) => {
    setMode(m);
    setSelectedFolderId(null);
    try { localStorage.setItem(MODE_STORAGE_KEY, m); } catch { /* noop */ }
  };


  const isNoFolder = selectedFolderId === NO_FOLDER_ID;
  const insideFolder = !!selectedFolderId;
  const currentFolder = insideFolder && !isNoFolder
    ? folders.find((f) => f.id === selectedFolderId) ?? null
    : null;

  const crumbInfo = (() => {
    if (isNoFolder) {
      return { name: 'No Folder', count: unfiledCount, dot: 'bg-slate-500', dotShadow: 'shadow-[0_0_8px_rgba(148,163,184,0.35)]', italic: true, canMenu: false, isNew: false };
    }
    if (currentFolder) {
      const folderNoteCount = _notes.filter((n) => n.folder_id === currentFolder.id).length;
      return {
        name: currentFolder.name,
        count: folderNoteCount,
        dot: currentFolder.is_new ? 'bg-amber-400' : 'bg-emerald-400',
        dotShadow: currentFolder.is_new ? 'shadow-[0_0_8px_rgba(251,191,36,0.45)]' : 'shadow-[0_0_8px_rgba(52,211,153,0.45)]',
        italic: false,
        canMenu: true,
        isNew: !!currentFolder.is_new,
      };
    }
    return null;
  })();

  return (
    <div className="border-b border-slate-700/50 bg-slate-800">
      {/* Full-width segmented navigation — the only element in this row */}
      <div className="h-11 px-3 flex items-center">
        <div className="flex-1 min-w-0 h-9 flex gap-1 p-1 rounded-lg bg-slate-900/60">
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
            onClick={() => {
              if (mode === 'folders' && insideFolder) setSelectedFolderId(null);
              else persistMode('folders');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-all ${
              mode === 'folders' ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 active:bg-slate-700/40'
            }`}
          >
            <FolderTreeIcon className="w-3.5 h-3.5" />
            Folders
          </button>
        </div>
      </div>

      {/* Folder context strip — only inside a folder */}
      {insideFolder && crumbInfo && (
        <div className="h-11 px-2 flex items-center gap-1 bg-slate-800/60 border-t border-slate-700/50">
          <button
            onClick={() => setSelectedFolderId(null)}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 active:bg-slate-700/80 active:scale-95 transition-all"
            aria-label="Back to all folders"
            title="Back to all folders"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>

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
              <div className="flex-1 min-w-0 flex items-center gap-2.5 ml-1">
                <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${crumbInfo.dot}`} />
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className={`truncate text-sm font-medium ${crumbInfo.italic ? 'text-slate-300 italic' : 'text-slate-100'}`}>
                    {crumbInfo.name}
                  </span>
                  {crumbInfo.isNew && (
                    <span className="flex-shrink-0 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 uppercase">
                      New
                    </span>
                  )}
                </div>
                <span className="flex-shrink-0 text-[11px] font-medium text-slate-500 tabular-nums">
                  {crumbInfo.count}
                </span>
              </div>

              {crumbInfo.canMenu && currentFolder && (
                <UnifiedMenu
                  ariaLabel="Folder options"
                  triggerClassName="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700/60"
                  iconClassName="w-5 h-5"
                  items={[
                    {
                      id: 'rename',
                      label: 'Rename',
                      icon: Pencil,
                      onSelect: () => { setRenameValue(currentFolder.name); setIsRenaming(true); },
                    },
                    {
                      id: 'delete',
                      label: 'Delete',
                      icon: Trash2,
                      danger: true,
                      onSelect: () => onOpenDeleteFolder(currentFolder),
                    },
                  ]}
                />
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}

/* ---------- Sidebar FAB (contextual create) ---------- */

type FabMode = 'note' | 'note-in-folder' | 'unfiled' | 'folder';

function SidebarFab({
  fabMode,
  onCreateNote,
  onCreateFolder,
}: {
  fabMode: FabMode;
  onCreateNote: () => void;
  onCreateFolder: () => void;
}) {
  const label = fabMode === 'folder' ? 'New Folder' : 'New Note';

  const handleClick = () => {
    if (fabMode === 'folder') {
      onCreateFolder();
    } else {
      onCreateNote();
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label={label}
      title={label}
      className="group w-full flex items-center justify-center gap-2.5 h-12 sm:h-11 rounded-xl text-sm font-semibold text-white bg-emerald-500/90 hover:bg-emerald-500 active:bg-emerald-600/90 ring-1 ring-emerald-300/40 shadow-[0_8px_24px_-6px_rgba(16,185,129,0.45)] active:scale-[0.98] transition-all duration-150"
    >
      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/15 text-white">
        <Plus className="w-4 h-4" strokeWidth={2.5} />
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
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
  const [isRenaming, setIsRenaming] = useState(folder.is_new ?? false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (folder.is_new && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [folder.is_new]);

  const handleRename = () => {
    if (renameValue.trim() && renameValue !== folder.name) onRename(renameValue.trim());
    setIsRenaming(false);
  };

  const count = notes.filter((n) => n.folder_id === folder.id).length;

  const folderBtnClasses = folder.is_new
    ? 'bg-amber-500/[0.06] hover:bg-amber-500/10 active:bg-amber-500/15'
    : 'hover:bg-slate-700/40 active:bg-slate-700/60';

  return (
    <div className={`group folder-row relative w-full flex items-center gap-1 overflow-hidden rounded-xl transition-colors ${folderBtnClasses}`}>
      {isRenaming ? (
        <div className="flex items-center gap-3 flex-1 min-w-0 py-3.5 sm:py-3 pl-4 pr-2">
          <div className={`flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-lg flex-shrink-0 ${
            folder.is_new ? 'bg-amber-500/15' : 'bg-emerald-500/15'
          }`}>
            {folder.is_new ? (
              <FolderPlus className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-300" />
            ) : (
              <FolderIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-400" />
            )}
          </div>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={handleRename}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setRenameValue(folder.name); setIsRenaming(false); }
            }}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
            ref={renameInputRef}
            className="folder-rename-input flex-1 min-w-0 bg-slate-700/80 text-white rounded-lg px-2.5 py-1.5 outline-none border border-emerald-500/60 ring-2 ring-emerald-500/20"
            autoFocus
          />
        </div>
      ) : (
        <button onClick={onSelect} className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl py-3.5 sm:py-3 pl-4 pr-2">
          <div className={`flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-lg flex-shrink-0 ${
            folder.is_new ? 'bg-amber-500/15' : 'bg-emerald-500/15'
          }`}>
            {folder.is_new ? (
              <FolderPlus className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-300" />
            ) : (
              <FolderIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-400" />
            )}
          </div>
          <span className="folder-name flex-1 min-w-0 text-left text-base sm:text-sm font-semibold text-white truncate">{folder.name}</span>
          <span className="folder-count-badge flex-shrink-0 inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-slate-900/50 text-[11px] font-semibold text-slate-400 tabular-nums">
            {count}
          </span>
        </button>
      )}

      <div className="flex items-center flex-shrink-0 p-1" onClick={(e) => e.stopPropagation()}>
        <UnifiedMenu
          ariaLabel="Folder options"
          onOpenChange={setMenuOpen}
          triggerClassName={`w-9 h-9 sm:w-8 sm:h-8 text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 ${
            menuOpen ? '' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
          }`}
          iconClassName="folder-menu-icon"
          items={[
            {
              id: 'rename',
              label: 'Rename',
              icon: Pencil,
              onSelect: () => { setRenameValue(folder.name); setIsRenaming(true); },
            },
            { id: 'delete', label: 'Delete', icon: Trash2, danger: true, onSelect: onDelete },
          ]}
        />
      </div>
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
  onOpenAccount,
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

  const noteMatches = useCallback(
    (n: NoteWithDetails, q: string) =>
      n.title.toLowerCase().includes(q) ||
      JSON.stringify(n.content).toLowerCase().includes(q),
    [],
  );

  const switchToAllNotes = useCallback(() => {
    setSelectedFolderId(null);
    setMode('all');
    try { localStorage.setItem(MODE_STORAGE_KEY, 'all'); } catch { /* noop */ }
  }, []);


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

  const unfiledExpanded = isExpanded(UNFILED_KEY);
  const folderToDeleteNoteCount = folderToDelete
    ? notes.filter((n) => n.folder_id === folderToDelete.id).length
    : 0;

  const [searchOpen, setSearchOpen] = useState<boolean>(() => !!searchQuery);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchQuery && !searchOpen) setSearchOpen(true);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  const isNoFolderView = selectedFolderId === NO_FOLDER_ID;
  const insideFolderView = !!selectedFolderId;
  const currentFolderView = insideFolderView && !isNoFolderView
    ? folders.find((f) => f.id === selectedFolderId) ?? null
    : null;

  const searchPlaceholder = (() => {
    if (mode === 'all') return 'Search all notes…';
    if (!insideFolderView) return 'Search folders…';
    if (isNoFolderView) return 'Search in "No Folder"…';
    if (currentFolderView) return `Search in "${currentFolderView.name}"…`;
    return 'Search…';
  })();

  const fabMode: FabMode = (() => {
    if (mode === 'all') return 'note';
    if (!insideFolderView) return 'folder';
    if (isNoFolderView) return 'unfiled';
    return 'note-in-folder';
  })();

  const handleFabCreateNote = () => {
    if (mode === 'all') { onCreateNote(); return; }
    if (insideFolderView) {
      if (isNoFolderView) onCreateNote();
      else if (currentFolderView) handleCreateNoteInFolder(currentFolderView.id);
    }
  };

  const handleFabCreateFolder = () => {
    onCreateFolder('New Folder', null);
  };

  const hideFab = searchOpen && !!searchQuery;

  return (
    <div className="flex flex-col h-full bg-slate-800 border-r border-slate-700/50">
      {/* Workspace header — 56px, in-place swap between workspace info and search */}
      <div className="w-full h-14 px-3 border-b border-slate-700/50 flex items-center gap-2">
        {!searchOpen ? (
          <>
            <button
              onClick={onOpenWorkspaceManagement}
              className="min-w-0 flex items-center gap-2.5 text-left group/header rounded-lg px-1.5 py-1 hover:bg-slate-700/40 active:bg-slate-700/60 transition-colors"
              aria-label="Switch workspace"
              title="Switch workspace"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Notebook className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium leading-tight">Workspace</p>
                <div className="flex items-center gap-1 min-w-0">
                  <h1 className="text-sm font-semibold text-slate-100 truncate">{workspaceName || 'My Notes'}</h1>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover/header:text-emerald-400 transition-colors flex-shrink-0" />
                </div>
              </div>
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setSearchOpen(true)}
              className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                searchQuery
                  ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 active:bg-slate-700/80'
              }`}
              aria-label="Open search"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <div className="flex-1 min-w-0 relative h-9">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { onSearchChange(''); setSearchOpen(false); } }}
                autoFocus
                className="w-full h-9 bg-slate-900/60 border border-transparent rounded-lg pl-9 pr-8 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 text-[13px]"
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
        )}
      </div>

      <SidebarNavBar
        mode={mode}
        setMode={setMode}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={setSelectedFolderId}
        folders={sortedFolders}
        notes={notes}
        unfiledCount={unfiledNotes.length}
        onRenameFolder={onRenameFolder}
        onOpenDeleteFolder={(f) => setFolderToDelete(f)}
      />

      {/* ===== NoteList-Viewer ===== */}
      <div className="flex-1 relative min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto notes-list-scroll min-h-0">

        {(() => {
          const q = searchQuery.trim().toLowerCase();
          const hasQuery = q.length > 0;

          const NoMatchesFallback = ({ label }: { label: string }) => (
            <div className="py-12 text-center px-4">
              <Search className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No {label} match "{searchQuery}"</p>
              <button
                onClick={switchToAllNotes}
                className="mt-3 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Search all notes instead →
              </button>
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
                          folders={sortedFolders}
                          isActive={currentNoteId === note.id}
                          onSelect={() => onSelectNote(note.id)}
                          onDelete={() => setNoteToDelete(note)}
                          onMove={(fid) => onMoveNote(note.id, fid)}
                          workspaceName={workspaceName}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          }

          /* ---------- Folders mode ---------- */
          return (
            <div className="p-3">
              {(() => {
                const NO_FOLDER_ID = '__no_folder__';

                /* Inside a folder — search only inside its notes */
                if (selectedFolderId) {
                  const isNoFolder = selectedFolderId === NO_FOLDER_ID;
                  const folder = isNoFolder ? null : sortedFolders.find((f) => f.id === selectedFolderId);
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
                    <div>
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
                        </>
                      ) : hasQuery ? (
                        <NoMatchesFallback label="notes in this folder" />
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

                /* Folders list — search only folder names. "No Folder" is always pinned on top. */
                const foldersFiltered = hasQuery
                  ? sortedFolders.filter((f) => f.name.toLowerCase().includes(q))
                  : sortedFolders;
                const showUnfiled = !hasQuery || 'no folder'.includes(q);


                if (hasQuery && foldersFiltered.length === 0 && !showUnfiled) {
                  return <NoMatchesFallback label="folders" />;
                }

                return (
                  <>
                    {hasQuery && (
                      <p className="text-xs text-slate-500 px-1 mb-2">
                        {foldersFiltered.length + (showUnfiled ? 1 : 0)} folder{foldersFiltered.length + (showUnfiled ? 1 : 0) !== 1 ? 's' : ''} match
                      </p>
                    )}
                    <div className="space-y-2.5">
                      {showUnfiled && (
                        <div className="group relative w-full flex items-center gap-1 overflow-hidden rounded-xl hover:bg-slate-700/40 active:bg-slate-700/60 transition-colors">
                          <button
                            onClick={() => setSelectedFolderId(NO_FOLDER_ID)}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl py-3.5 sm:py-3 pl-4 pr-2 overflow-hidden"
                          >
                            <div className="flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-slate-600/30 flex-shrink-0">
                              <Inbox className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-300" />
                            </div>
                            <span className="flex-1 min-w-0 text-left text-base sm:text-sm font-semibold italic text-slate-300 truncate">No Folder</span>
                            <span className="folder-count-badge flex-shrink-0 inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-slate-900/50 text-[11px] font-semibold text-slate-400 tabular-nums">
                              {unfiledNotes.length}
                            </span>
                          </button>
                          <span aria-hidden className="flex-shrink-0 w-11 h-11 sm:w-10 sm:h-10" />
                        </div>
                      )}


                      {foldersFiltered.map((folder) => (
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
                  </>
                );
              })()}
            </div>
          );
        })()}
        </div>

        {/* FAB — contextual create */}
        {!hideFab && (
          <div className="px-3 pt-2 pb-3 bg-slate-800 border-t border-slate-700/50 flex-shrink-0">
            <SidebarFab
              fabMode={fabMode}
              onCreateNote={handleFabCreateNote}
              onCreateFolder={handleFabCreateFolder}
            />
          </div>
        )}
      </div>


      {/* Footer: Storage */}
      <StorageUsage totalBytes={totalStorageBytes} onOpen={onOpenStorage} onOpenSettings={onOpenSettings} onOpenAccount={onOpenAccount} />


      {/* Delete note confirmation */}
      <UnifiedWarningWindow
        open={!!noteToDelete}
        title="Delete note?"
        description={
          noteToDelete
            ? `"${noteToDelete.title || 'Untitled'}" will be permanently deleted. This action cannot be undone.`
            : null
        }
        onCancel={() => setNoteToDelete(null)}
        onConfirm={() => { if (noteToDelete) onDeleteNote(noteToDelete.id); setNoteToDelete(null); }}
      />

      {/* Delete folder confirmation */}
      <UnifiedWarningWindow
        open={!!folderToDelete}
        title="Delete folder?"
        description={
          folderToDelete
            ? `"${folderToDelete.name}" will be deleted. ${
                folderToDeleteNoteCount > 0
                  ? `${folderToDeleteNoteCount} note${folderToDeleteNoteCount !== 1 ? 's' : ''} inside will be moved to No folder — nothing will be lost.`
                  : 'The folder is empty.'
              }`
            : null
        }
        onCancel={() => setFolderToDelete(null)}
        onConfirm={() => { if (folderToDelete) onDeleteFolder(folderToDelete.id); setFolderToDelete(null); }}
      />

    </div>
  );
}
