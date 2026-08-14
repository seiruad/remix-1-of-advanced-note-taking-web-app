import { useState, useRef, useEffect } from 'react';
import { Folder, ChevronRight, ChevronDown, Plus, MoreVertical } from 'lucide-react';
import { Folder as FolderType } from '../types/database';
import { StorageUsage } from './StorageUsage';

interface FolderSidebarProps {
  folders: FolderType[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  totalStorageBytes: number;
  onOpenStorage: () => void;
  onOpenAccount?: () => void;
}

interface FolderTreeItemProps {
  folder: FolderType;
  allFolders: FolderType[];
  level: number;
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
}

function FolderTreeItem({
  folder,
  allFolders,
  level,
  currentFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
}: FolderTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isCreatingChild, setIsCreatingChild] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const children = allFolders.filter((f) => f.parent_id === folder.id);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleCreateChild = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), folder.id);
      setNewFolderName('');
      setIsCreatingChild(false);
      setIsExpanded(true);
    }
  };

  const handleRename = () => {
    if (renameValue.trim() && renameValue !== folder.name) {
      onRenameFolder(folder.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div>
      <div
        className="group relative flex items-center gap-1 rounded-md hover:bg-slate-700/50 transition-colors"
        style={{ paddingLeft: `${level * 12 + 4}px` }}
      >
        {children.length > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 text-slate-500 hover:text-slate-300"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <button
          onClick={() => onSelectFolder(folder.id)}
          className="flex-1 flex items-center gap-2 py-1.5 px-2 text-left"
        >
          <Folder
            className={`w-4 h-4 ${
              currentFolderId === folder.id ? 'text-emerald-400' : 'text-slate-400'
            }`}
          />
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setRenameValue(folder.name);
                  setIsRenaming(false);
                }
              }}
              className="flex-1 bg-slate-600 text-white text-sm rounded px-1 py-0.5 outline-none border border-emerald-500"
              autoFocus
            />
          ) : (
            <span
              className={`text-sm truncate ${
                currentFolderId === folder.id
                  ? 'text-emerald-400 font-medium'
                  : 'text-slate-300'
              }`}
            >
              {folder.name}
            </span>
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {showMenu && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 min-w-[140px]"
          >
            <button
              onClick={() => {
                setIsCreatingChild(true);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
            >
              New Subfolder
            </button>
            <button
              onClick={() => {
                setIsRenaming(true);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
            >
              Rename
            </button>
            <button
              onClick={() => {
                onDeleteFolder(folder.id);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-slate-700"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isCreatingChild && (
        <div className="flex items-center gap-1" style={{ paddingLeft: `${(level + 1) * 12 + 4}px` }}>
          <span className="w-5" />
          <Folder className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => {
              handleCreateChild();
              setIsCreatingChild(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateChild();
                setIsCreatingChild(false);
              }
              if (e.key === 'Escape') {
                setIsCreatingChild(false);
                setNewFolderName('');
              }
            }}
            placeholder="New folder..."
            className="flex-1 bg-slate-600 text-white text-sm rounded px-1 py-0.5 outline-none border border-emerald-500 my-1"
            autoFocus
          />
        </div>
      )}

      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              allFolders={allFolders}
              level={level + 1}
              currentFolderId={currentFolderId}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderTree({
  folders,
  parentFolder,
  level,
  currentFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
}: {
  folders: FolderType[];
  parentFolder: FolderType | null;
  level: number;
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
}) {
  const rootFolders = folders.filter((f) => f.parent_id === (parentFolder?.id || null));

  return (
    <>
      {rootFolders.map((folder) => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          allFolders={folders}
          level={level}
          currentFolderId={currentFolderId}
          onSelectFolder={onSelectFolder}
          onCreateFolder={onCreateFolder}
          onDeleteFolder={onDeleteFolder}
          onRenameFolder={onRenameFolder}
        />
      ))}
    </>
  );
}

export function FolderSidebar({
  folders,
  currentFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  totalStorageBytes,
  onOpenStorage,
}: FolderSidebarProps) {
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateRoot = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), null);
      setNewFolderName('');
      setIsCreatingRoot(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-300">Folders</h2>
          <button
            onClick={() => setIsCreatingRoot(true)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="New folder"
          >
            <Plus className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <button
          onClick={() => onSelectFolder(null)}
          className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
            currentFolderId === null
              ? 'bg-emerald-600/20 text-emerald-400 font-medium'
              : 'text-slate-400 hover:bg-slate-700/50'
          }`}
        >
          All Notes
        </button>
      </div>

      {isCreatingRoot && (
        <div className="px-4 py-2 flex items-center gap-2">
          <Folder className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => {
              handleCreateRoot();
              setIsCreatingRoot(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateRoot();
                setIsCreatingRoot(false);
              }
              if (e.key === 'Escape') {
                setIsCreatingRoot(false);
                setNewFolderName('');
              }
            }}
            placeholder="New folder..."
            className="flex-1 bg-slate-600 text-white text-sm rounded px-2 py-1 outline-none border border-emerald-500"
            autoFocus
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        <FolderTree
          folders={folders}
          parentFolder={null}
          level={0}
          currentFolderId={currentFolderId}
          onSelectFolder={onSelectFolder}
          onCreateFolder={onCreateFolder}
          onDeleteFolder={onDeleteFolder}
          onRenameFolder={onRenameFolder}
        />
      </div>

      <StorageUsage totalBytes={totalStorageBytes} onOpen={onOpenStorage} onOpenSettings={onOpenStorage} />
    </div>
  );
}
