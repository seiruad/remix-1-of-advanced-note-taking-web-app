import { useState, useRef, useEffect } from 'react';
import { ParagraphList } from './paragraphs/ParagraphList';
import { buildFileUrl } from './FilePreviewPage';
import { useNavigate, useLocation } from 'react-router-dom';
import { Note, FileItem, Folder, Workspace } from '../types/database';
import { supabase } from '../lib/supabase';
import {
  Download,
  Trash2,
  X,
  FileText,
  Pencil,
  Check,
  MoreHorizontal,
  ArrowLeft,
  FolderOpen,
  Inbox,
  Notebook,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NoteEditorProps {
  note: Note | null;
  onUpdateNote: (updates: { title?: string; content?: Record<string, unknown> }) => void;
  onFileLinked: (file: FileItem) => void;
  onFileUnlinked: (fileId: string) => void;
  files: FileItem[];
  canEdit: boolean;
  onBack?: () => void;
  folders?: Folder[];
  workspaces?: Workspace[];
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




export function NoteEditor({
  note,
  onUpdateNote,
  onFileLinked,
  onFileUnlinked,
  files,
  canEdit,
  onBack,
  folders = [],
  workspaces = [],
}: NoteEditorProps) {
  const [localTitle, setLocalTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [attachmentsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamedNames, setRenamedNames] = useState<Record<string, string>>({});

  const { user } = useAuth();
  const menuRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const isTypingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (note && !isTypingRef.current) {
      setLocalTitle(note.title);
    }
  }, [note?.id, note?.title]);

  useEffect(() => {
    // reset local typing state when switching notes
    isTypingRef.current = false;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, [note?.id]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

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

  const onUpdateNoteRef = useRef(onUpdateNote);
  useEffect(() => {
    onUpdateNoteRef.current = onUpdateNote;
  }, [onUpdateNote]);



  const handleTitleChange = (title: string) => {
    setLocalTitle(title);
    onUpdateNote({ title });
  };

  const contentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
    };
  }, []);






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

  const startRename = (file: FileItem) => {
    setRenamingId(file.id);
    setRenameValue(renamedNames[file.id] ?? file.filename);
  };

  const submitRename = async () => {
    const id = renamingId;
    const name = renameValue.trim();
    if (!id) return;
    setRenamingId(null);
    const current = files.find((f) => f.id === id);
    const currentName = current ? renamedNames[id] ?? current.filename : '';
    if (!name || !current || name === currentName) return;

    setRenamedNames((prev) => ({ ...prev, [id]: name }));
    const { error: updateError } = await supabase
      .from('files')
      .update({ filename: name })
      .eq('id', id);
    if (updateError) {
      setError('Failed to rename file');
      setRenamedNames((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };


  const handleUnlinkFile = async (fileId: string) => {
    if (!note) return;
    setError(null);
    try {
      const { error: unlinkError } = await supabase
        .from('note_files')
        .delete()
        .eq('note_id', note.id)
        .eq('file_id', fileId);

      if (unlinkError) throw unlinkError;

      onFileUnlinked(fileId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unlink file';
      setError(message);
    }
    setConfirmDelete(null);
  };


  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900/60">
        <div className="text-center">
          <div className="flex items-center justify-center w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-700/30">
            <FileText className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-300">Select a note to view</p>
          <p className="text-xs text-slate-500 mt-1.5">Or create a new note to get started</p>
        </div>
      </div>
  );
}

  const isNewNote = note.is_new ?? false;

  return (
    <div className="flex flex-col h-full bg-slate-900/60 overflow-hidden relative">

      {/* ===== FIXED SUPERBLOCK: context + title + toolbar ===== */}
      <div className="flex-shrink-0 bg-slate-800/95 backdrop-blur-md border-b border-slate-700/50 z-30">
        {/* Context bar — mirrors the sidebar workspace header (56px).
            Shown on mobile/tablet (editor full-width); hidden on desktop
            where the UnifiedSidebar already displays the same context. */}
        <div className="h-14 px-3 sm:px-6 flex items-center gap-2 border-b border-slate-700/50 lg:hidden">
          {onBack && (
            <button
              onClick={onBack}
              className="lg:hidden flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 active:bg-slate-700/80 transition-colors"
              title="Back to notes"
              aria-label="Back to notes"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isNewNote ? 'bg-amber-500/10' : 'bg-slate-700/30'}`}>
            <FileText className={`w-5 h-5 ${isNewNote ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>

          <div className="min-w-0 flex-1">
            <p className={`text-[10px] uppercase tracking-wider font-medium leading-tight ${isNewNote ? 'text-amber-400/80' : 'text-slate-500'}`}>
              {isNewNote ? 'New Note' : 'Note'}
            </p>
            {(() => {
              const workspace = workspaces.find((w) => w.id === note.workspace_id);
              const folder = folders.find((f) => f.id === note.folder_id);
              const FolderIconToUse = folder ? FolderOpen : Inbox;
              return (
                <div className="flex items-center gap-1.5 min-w-0">
                  {workspace && (
                    <>
                      <Notebook className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                      <span className="truncate max-w-[45%] text-[13px] text-slate-300">{workspace.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-slate-600" />
                    </>
                  )}
                  <FolderIconToUse className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                  <span className={`truncate max-w-[45%] text-[13px] ${folder ? 'text-slate-300' : 'text-slate-500 italic'}`}>
                    {folder ? folder.name : 'No Folder'}
                  </span>
                </div>
              );
            })()}



          </div>
        </div>


      </div>


      {/* ===== SCROLLABLE BODY ===== */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-32 sm:pb-28">
        <ParagraphList
          noteId={note.id}
          noteTitle={localTitle}
          userId={user?.id ?? null}
          canEdit={canEdit}
          initialContent={note.content}
          files={files}
          onTitleChange={handleTitleChange}

          onOpenFile={(file) =>
            navigate(buildFileUrl(file.id, { kind: 'note', noteId: note.id }), {
              state: { background: location },
            })
          }

          onActiveEditorChange={() => {}}
          onFileLinked={onFileLinked}
        />


        {error && (
          <div className="mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
            <span className="flex-1 min-w-0 break-words">{error}</span>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-red-600/20 rounded flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ===== BOTTOM BAR: Attach + collapsible attachments ===== */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-slate-800/95 backdrop-blur-md border-t border-slate-700/50">
        {files.length > 0 && attachmentsExpanded && (
          <div className="px-3 sm:px-5 pt-3 pb-2 max-h-[40vh] overflow-y-auto border-b border-slate-700/50 animate-fadeIn">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium px-1 mb-1.5">
              Attachments
            </p>
            <div className="space-y-1">
              {files.map((file) =>
                renamingId === file.id ? (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-slate-700/40 border border-emerald-500/40"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0 text-base">
                      {getFileIcon(file.file_type)}
                    </div>
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onBlur={submitRename}
                      className="flex-1 min-w-0 bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                    />
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={submitRename}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 transition-colors flex-shrink-0"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setRenamingId(null)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-700/60 transition-colors flex-shrink-0"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                <div
                  key={file.id}
                  className="group/file flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-700/40"
                >
                  <button
                    type="button"
                    onClick={() => note && navigate(buildFileUrl(file.id, { kind: 'note', noteId: note.id }), { state: { background: location } })}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    title="Preview"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0 text-base">
                      {getFileIcon(file.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate leading-snug">
                        {renamedNames[file.id] ?? file.filename}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatFileSize(file.file_size)}</p>
                    </div>
                  </button>


                  <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleDownload(file)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors sm:opacity-0 sm:group-hover/file:opacity-100"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => startRename(file)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors sm:opacity-0 sm:group-hover/file:opacity-100"
                        title="Rename"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canEdit && (

                      <button
                        onClick={() => setConfirmDelete(file.id)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors sm:opacity-0 sm:group-hover/file:opacity-100"
                        title="Unlink from note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="sm:hidden relative flex-shrink-0">
                    <button
                      ref={(el) => {
                        menuRefs.current[file.id] = el;
                      }}
                      onClick={() =>
                        setOpenMenuId(openMenuId === file.id ? null : file.id)
                      }
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                        openMenuId === file.id
                          ? 'bg-slate-600/60 text-slate-200'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60'
                      }`}
                      title="File options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {openMenuId === file.id && (
                      <div className="absolute right-0 bottom-full mb-1.5 w-[196px] bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-50 py-1.5 overflow-hidden">
                        <button
                          onClick={() => {
                            handleDownload(file);
                            setOpenMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700/70 active:bg-slate-700 transition-colors text-left"
                        >
                          <Download className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          Download
                        </button>
                        {canEdit && (
                          <>
                            <div className="mx-3 border-t border-slate-700/60" />
                            <button
                              onClick={() => {
                                startRename(file);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700/70 active:bg-slate-700 transition-colors text-left"
                            >
                              <Pencil className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              Rename
                            </button>
                            <div className="mx-3 border-t border-slate-700/60" />
                            <button

                              onClick={() => {
                                setConfirmDelete(file.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors text-left"
                            >
                              <Trash2 className="w-4 h-4 flex-shrink-0" />
                              Unlink
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>


      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700/60 shadow-[0_12px_40px_rgba(0,0,0,0.6)] w-full max-w-sm overflow-hidden">
            <div className="px-5 sm:px-6 py-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-100">Remove Attachment</h3>
              </div>
              <p className="text-sm text-slate-400 mb-5">
                This will remove the file from this note. The file will remain in your storage
                and can be linked again later.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 h-11 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-semibold transition-colors"
                >
                  Don't Remove
                </button>
                <button
                  onClick={() => handleUnlinkFile(confirmDelete)}
                  className="flex-1 h-11 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
