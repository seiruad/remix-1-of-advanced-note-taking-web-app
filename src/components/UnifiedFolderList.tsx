import { useState, useRef, useEffect, useMemo } from 'react';
import { UnifiedMenu } from './UnifiedMenu';
import {
  Folder as FolderIcon,
  FolderPlus,
  Inbox,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import { NoteWithDetails, Folder as FolderType } from '../types/database';
import { NO_FOLDER_ID } from './UnifiedNoteList';

/* ---------- Flat folder row ---------- */

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
  const countLabel = count === 0 ? 'No notes' : `${count} note${count !== 1 ? 's' : ''}`;
  const isNew = folder.is_new ?? false;

  const folderBtnClasses = isNew
    ? 'bg-amber-500/[0.06] hover:bg-amber-500/10 active:bg-amber-500/15'
    : 'hover:bg-slate-700/40 active:bg-slate-700/60';

  const iconBgClasses = isNew
    ? 'bg-amber-500/10'
    : 'bg-slate-700/30';

  return (
    <div className={`group/card relative flex items-stretch rounded-xl cursor-pointer transition-colors duration-150 overflow-hidden ${folderBtnClasses}`}>
      {isRenaming ? (
        <div className="flex items-center gap-3 flex-1 min-w-0 py-3.5 sm:py-3 pl-4 pr-2">
          <div className={`flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 ${iconBgClasses}`}>
            {isNew ? (
              <FolderPlus className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-400" />
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
          <div className={`flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 ${iconBgClasses}`}>
            {isNew ? (
              <FolderPlus className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-400" />
            ) : (
              <FolderIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="folder-name block text-left text-base sm:text-sm font-semibold text-white truncate">{folder.name}</span>
            <span className={`block text-left text-sm sm:text-xs mt-0.5 ${isNew ? 'text-amber-400/70' : 'text-slate-500'}`}>
              {countLabel}
            </span>
          </div>
        </button>
      )}

      <div className="flex items-center pr-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <UnifiedMenu
          ariaLabel="Folder options"
          onOpenChange={setMenuOpen}
          triggerClassName={`w-9 h-9 sm:w-8 sm:h-8 text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 ${
            menuOpen ? '' : 'opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100'
          }`}
          iconClassName="w-5 h-5 sm:w-4 sm:h-4"
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

/* ---------- Public folder list ---------- */

export interface UnifiedFolderListProps {
  folders: FolderType[];
  notes: NoteWithDetails[];
  searchQuery: string;
  onSelectFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folder: FolderType) => void;
  onSwitchToAllNotes: () => void;
}

export function UnifiedFolderList({
  folders,
  notes,
  searchQuery,
  onSelectFolder,
  onRenameFolder,
  onDeleteFolder,
  onSwitchToAllNotes,
}: UnifiedFolderListProps) {
  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => {
      const aNew = a.is_new ?? false;
      const bNew = b.is_new ?? false;
      if (aNew !== bNew) return aNew ? -1 : 1;
      return a.name.localeCompare(b.name);
    }),
    [folders]
  );

  const unfiledCount = useMemo(() => notes.filter((n) => !n.folder_id).length, [notes]);

  const q = searchQuery.trim().toLowerCase();
  const hasQuery = q.length > 0;
  const foldersFiltered = hasQuery
    ? sortedFolders.filter((f) => f.name.toLowerCase().includes(q))
    : sortedFolders;
  const showUnfiled = !hasQuery || 'no folder'.includes(q);

  if (hasQuery && foldersFiltered.length === 0 && !showUnfiled) {
    return (
      <div className="p-3">
        <div className="py-12 text-center px-4">
          <Search className="w-8 h-8 text-slate-700 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No folders match "{searchQuery}"</p>
          <button
            onClick={onSwitchToAllNotes}
            className="mt-3 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Search all notes instead →
          </button>
        </div>
      </div>
    );
  }

  const matchCount = foldersFiltered.length + (showUnfiled ? 1 : 0);

  return (
    <div className="p-3">
      {hasQuery && (
        <p className="text-xs text-slate-500 px-1 mb-2">
          {matchCount} folder{matchCount !== 1 ? 's' : ''} match
        </p>
      )}
      <div className="space-y-2.5">
        {showUnfiled && (
          <div className="group/card relative flex items-stretch rounded-xl cursor-pointer hover:bg-slate-700/40 active:bg-slate-700/60 transition-colors duration-150 overflow-hidden">
            <button
              onClick={() => onSelectFolder(NO_FOLDER_ID)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl py-3.5 sm:py-3 pl-4 pr-2"
            >
              <div className="flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-slate-700/30 flex-shrink-0">
                <Inbox className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="folder-name block text-left text-base sm:text-sm font-semibold italic text-slate-300 truncate">No Folder</span>
                <span className="block text-left text-sm sm:text-xs text-slate-500 mt-0.5">
                  {unfiledCount === 0 ? 'No notes' : `${unfiledCount} note${unfiledCount !== 1 ? 's' : ''}`}
                </span>
              </div>
            </button>
            <span aria-hidden className="flex-shrink-0 w-11 h-11 sm:w-10 sm:h-10" />
          </div>
        )}

        {foldersFiltered.map((folder) => (
          <FolderRowFlat
            key={folder.id}
            folder={folder}
            notes={notes}
            onSelect={() => onSelectFolder(folder.id)}
            onRename={(name) => onRenameFolder(folder.id, name)}
            onDelete={() => onDeleteFolder(folder)}
          />
        ))}
      </div>
    </div>
  );
}
