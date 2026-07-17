import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Clock, Trash2, Share2, FolderOpen, ChevronDown, AlertTriangle, X, Check } from 'lucide-react';
import { NoteWithDetails, Folder } from '../types/database';

interface NotesListProps {
  notes: NoteWithDetails[];
  folders: Folder[];
  currentNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  onShareNote: (noteId: string) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
}

interface DropdownPos {
  top: number;
  left: number;
  width: number;
  openUp: boolean;
}

function FolderDropdown({
  noteId,
  folderId,
  folders,
  triggerRef,
  onSelect,
  onClose,
}: {
  noteId: string;
  folderId: string | null;
  folders: Folder[];
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (noteId: string, folderId: string | null) => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = window.innerWidth < 640;

  useEffect(() => {
    if (!isMobile && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuH = Math.min(240, (folders.length + 1) * 36 + 8);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuH + 8 && rect.top > menuH + 8;
      const left = Math.min(rect.left, window.innerWidth - 192 - 8);
      setPos({ top: openUp ? rect.top - menuH - 4 : rect.bottom + 4, left, width: 192, openUp });
    }

    const handleDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('touchstart', handleDown);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('touchstart', handleDown);
    };
  }, []);

  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div
          ref={menuRef}
          className="relative bg-slate-800 border-t border-slate-700 rounded-t-2xl shadow-2xl pb-safe"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <span className="text-base font-semibold text-white">Move to Folder</span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-72">
            <button
              onClick={() => { onSelect(noteId, null); onClose(); }}
              className={`w-full flex items-center justify-between px-5 py-4 text-sm transition-colors active:bg-slate-700 ${
                !folderId ? 'text-emerald-400' : 'text-slate-300 hover:bg-slate-700/60'
              }`}
            >
              <span>No folder</span>
              {!folderId && <Check className="w-4 h-4 text-emerald-400" />}
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => { onSelect(noteId, folder.id); onClose(); }}
                className={`w-full flex items-center justify-between px-5 py-4 text-sm transition-colors active:bg-slate-700 ${
                  folderId === folder.id
                    ? 'text-emerald-400'
                    : folder.parent_id
                    ? 'text-slate-400 pl-8 hover:bg-slate-700/60'
                    : 'text-slate-300 hover:bg-slate-700/60'
                }`}
              >
                <span>{folder.name}</span>
                {folderId === folder.id && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            ))}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (!pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
    >
      <div className="max-h-56 overflow-y-auto">
        <button
          onClick={() => { onSelect(noteId, null); onClose(); }}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
            !folderId ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <span>No folder</span>
          {!folderId && <Check className="w-3.5 h-3.5" />}
        </button>
        {folders.length > 0 && (
          <div className="border-t border-slate-700">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => { onSelect(noteId, folder.id); onClose(); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                  folderId === folder.id
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : folder.parent_id
                    ? 'text-slate-400 pl-5 hover:bg-slate-700'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{folder.name}</span>
                {folderId === folder.id && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function NotesList({
  notes,
  folders,
  currentNoteId,
  onSelectNote,
  onCreateNote: _onCreateNote,
  onDeleteNote,
  onShareNote,
  onMoveNote,
}: NotesListProps) {
  const [activeFolderMenu, setActiveFolderMenu] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<NoteWithDetails | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const formatDate = (date: string) => {
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
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days}d ago`;
    }
    return then.toLocaleDateString();
  };

  const getFolderName = (folderId: string | null): string => {
    if (!folderId) return 'No folder';
    const folder = folders.find((f) => f.id === folderId);
    return folder ? folder.name : 'No folder';
  };

  const handleFolderChange = useCallback((noteId: string, folderId: string | null) => {
    onMoveNote(noteId, folderId);
  }, [onMoveNote]);

  return (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden notes-list-scroll">
        {notes.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            No notes yet. Create your first note!
          </div>
        ) : (
          <div className="p-2 sm:p-2 space-y-1.5 sm:space-y-1">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`group relative rounded-lg cursor-pointer transition-colors ${
                  currentNoteId === note.id
                    ? 'bg-emerald-600/20 border border-emerald-500/30'
                    : 'hover:bg-slate-700/50 border border-transparent'
                }`}
                onClick={() => onSelectNote(note.id)}
              >
                <div className="p-4 sm:p-3">
                  <h3 className="font-semibold text-base sm:text-sm text-white truncate pr-16">{note.title}</h3>
                  <div className="flex items-center gap-3 mt-2 sm:mt-1.5 text-sm sm:text-xs text-slate-500">
                    <div onClick={(e) => e.stopPropagation()}>
                      <button
                        ref={(el) => { triggerRefs.current[note.id] = el; }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFolderMenu(activeFolderMenu === note.id ? null : note.id);
                        }}
                        className="flex items-center gap-1 hover:text-slate-300 transition-colors"
                      >
                        <FolderOpen className="w-4 h-4 sm:w-3 sm:h-3" />
                        <span className={note.folder_id ? 'text-emerald-400' : ''}>
                          {getFolderName(note.folder_id)}
                        </span>
                        <ChevronDown className="w-3 h-3 sm:w-2.5 sm:h-2.5" />
                      </button>

                      {activeFolderMenu === note.id && (
                        <FolderDropdown
                          noteId={note.id}
                          folderId={note.folder_id}
                          folders={folders}
                          triggerRef={{ current: triggerRefs.current[note.id] }}
                          onSelect={handleFolderChange}
                          onClose={() => setActiveFolderMenu(null)}
                        />
                      )}
                    </div>

                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 sm:w-3 sm:h-3" />
                      {formatDate(note.updated_at)}
                    </span>
                    {note.files && note.files.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4 sm:w-3 sm:h-3" />
                        {note.files.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareNote(note.id);
                    }}
                    className="p-2 sm:p-1.5 hover:bg-slate-600 rounded transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setNoteToDelete(note);
                    }}
                    className="p-2 sm:p-1.5 hover:bg-red-600/20 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-fadeIn">
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
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors"
                >
                  Don't Delete
                </button>
                <button
                  onClick={() => {
                    onDeleteNote(noteToDelete.id);
                    setNoteToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
