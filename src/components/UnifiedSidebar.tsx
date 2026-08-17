import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { UnifiedMenu } from './UnifiedMenu';
import { UnifiedWarningWindow } from './UnifiedWarningWindow';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Search,
  Notebook,
  LayoutList,
  FolderTree as FolderTreeIcon,
  X,
  Pencil,
} from 'lucide-react';
import { NoteWithDetails, Folder as FolderType } from '../types/database';
import { StorageUsage } from './StorageUsage';
import { UnifiedNoteList } from './UnifiedNoteList';
import { UnifiedFolderList } from './UnifiedFolderList';


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

function loadExpandedState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupt state
  }
  return {};
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

        {mode === 'all' || selectedFolderId ? (
          <UnifiedNoteList
            mode={mode}
            selectedFolderId={selectedFolderId}
            notes={notes}
            folders={sortedFolders}
            currentNoteId={currentNoteId}
            searchQuery={searchQuery}
            workspaceName={workspaceName}
            onSelectNote={onSelectNote}
            onDeleteNote={(note) => setNoteToDelete(note)}
            onMoveNote={onMoveNote}
            onCreateNoteInFolder={handleCreateNoteInFolder}
            onSwitchToAllNotes={switchToAllNotes}
          />
        ) : (
          <UnifiedFolderList
            folders={sortedFolders}
            notes={notes}
            searchQuery={searchQuery}
            onSelectFolder={(fid) => setSelectedFolderId(fid)}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={(f) => setFolderToDelete(f)}
            onSwitchToAllNotes={switchToAllNotes}
          />
        )}
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
