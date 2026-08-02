import { useState, useRef, useCallback, useEffect } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { AttachFileDialog } from './AttachFileDialog';
import { Note, FileItem, Folder, Workspace } from '../types/database';
import { supabase } from '../lib/supabase';
import {
  FolderOpen,
  Paperclip,
  Download,
  Trash2,
  Loader2,
  UploadCloud,
  X,
  ChevronUp,
  ChevronDown,
  File as FileIcon,
  FileText,
  MoreHorizontal,
  
  Bold,
  Italic,
  Strikethrough,
  Quote,
  Code,
  CodeSquare,
  Link as LinkIcon,
  Undo,
  Redo,
  RemoveFormatting,
  ArrowLeft,
  Folder as FolderIcon,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Editor } from '@tiptap/react';

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

interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="w-9 h-9 rounded-lg transition-colors flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 active:bg-emerald-500/15 active:text-emerald-300 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:cursor-not-allowed flex-shrink-0"
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-slate-700/60 mx-1.5 flex-shrink-0" />;
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
  const [isDragging, setIsDragging] = useState(false);
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreMenuOpen]);
  const menuRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (note) {
      setLocalTitle(note.title);
    }
  }, [note?.id, note?.title]);

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

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setLocalTitle(newTitle);
      onUpdateNote({ title: newTitle });
    },
    [onUpdateNote]
  );

  const uploadAndLink = async (file: File) => {
    if (!note || !user) return;
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

      const { error: linkError } = await supabase
        .from('note_files')
        .insert({
          note_id: note.id,
          file_id: fileRecord.id,
          user_id: user.id,
        });

      if (linkError) throw linkError;

      onFileLinked(fileRecord);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload file';
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadAndLink(file);
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (!canEdit) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      for (const file of droppedFiles) {
        await uploadAndLink(file);
      }
    },
    [canEdit, note, user]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canEdit) setIsDragging(true);
  }, [canEdit]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setIsDragging(false);
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

  const addLink = () => {
    if (!editorInstance) return;
    const url = window.prompt('Enter URL:');
    if (url) {
      editorInstance.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900/50">
        <div className="text-center text-slate-500">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a note to view</p>
          <p className="text-sm mt-2">Or create a new note to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-slate-900/50 overflow-hidden relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-emerald-900/20 backdrop-blur-sm border-2 border-dashed border-emerald-500 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <UploadCloud className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-400 font-medium">Drop files to attach</p>
          </div>
        </div>
      )}

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

          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium leading-tight">Note</p>
            {(() => {
              const workspace = workspaces.find((w) => w.id === note.workspace_id);
              const folder = folders.find((f) => f.id === note.folder_id);
              return (
                <div className="flex items-center gap-1.5 min-w-0">
                  {workspace && (
                    <>
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                      <span className="truncate max-w-[140px] text-[13px] text-slate-300">{workspace.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-slate-600" />
                    </>
                  )}
                  <FolderIcon className={`w-3.5 h-3.5 flex-shrink-0 ${folder ? 'text-slate-500' : 'text-slate-600'}`} />
                  <span className={`truncate max-w-[140px] text-[13px] ${folder ? 'text-slate-300' : 'text-slate-500'}`}>
                    {folder ? folder.name : 'No Folder'}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Title row */}
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3">
          <input
            type="text"
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            className="w-full min-w-0 text-xl sm:text-2xl font-bold bg-transparent border-none outline-none text-slate-100 placeholder-slate-600 focus:ring-0 cursor-text"
            disabled={!canEdit}
          />
        </div>


        {/* Toolbar */}
        {canEdit && (
          <div className="px-3 sm:px-6 pb-3 sm:pb-4">
            {/* Single fixed-height row, left-aligned */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* --- Undo / Redo (always visible) --- */}
              <ToolbarButton
                onClick={() => editorInstance?.chain().focus().undo().run()}
                disabled={!editorInstance?.can().undo()}
                title="Undo"
              >
                <Undo className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editorInstance?.chain().focus().redo().run()}
                disabled={!editorInstance?.can().redo()}
                title="Redo"
              >
                <Redo className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarDivider />

              {/* --- Text style (always visible) --- */}
              <ToolbarButton
                onClick={() => editorInstance?.chain().focus().toggleBold().run()}
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editorInstance?.chain().focus().toggleItalic().run()}
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </ToolbarButton>
              {/* Strikethrough: hidden on small mobile, shown sm+ */}
              <span className="hidden sm:contents">
                <ToolbarButton
                  onClick={() => editorInstance?.chain().focus().toggleStrike().run()}
                  title="Strikethrough"
                >
                  <Strikethrough className="w-4 h-4" />
                </ToolbarButton>
              </span>
              <ToolbarButton onClick={addLink} title="Link">
                <LinkIcon className="w-4 h-4" />
              </ToolbarButton>

              <ToolbarDivider />

              {/* --- Code / Quote (always visible) --- */}
              <ToolbarButton
                onClick={() => editorInstance?.chain().focus().toggleCode().run()}
                title="Inline Code"
              >
                <Code className="w-4 h-4" />
              </ToolbarButton>
              {/* Quote + CodeBlock: hidden on small mobile, shown sm+ */}
              <span className="hidden sm:contents">
                <ToolbarButton
                  onClick={() => editorInstance?.chain().focus().toggleBlockquote().run()}
                  title="Quote"
                >
                  <Quote className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editorInstance?.chain().focus().toggleCodeBlock().run()}
                  title="Code Block"
                >
                  <CodeSquare className="w-4 h-4" />
                </ToolbarButton>
              </span>

              <ToolbarDivider />

              {/* --- Clear: hidden on small mobile, shown sm+ --- */}
              <span className="hidden sm:contents">
                <ToolbarButton
                  onClick={() =>
                    editorInstance?.chain().focus().clearNodes().unsetAllMarks().run()
                  }
                  title="Clear Formatting"
                >
                  <RemoveFormatting className="w-4 h-4" />
                </ToolbarButton>
              </span>

              {/* --- Mobile overflow menu (sm: hidden) --- */}
              <div className="sm:hidden relative ml-auto" ref={moreMenuRef}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setMoreMenuOpen((o) => !o)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    moreMenuOpen
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 active:bg-slate-700/80'
                  }`}
                  title="More"
                >
                  <MoreHorizontal className="w-4 h-4" />

                </button>

                {moreMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-[196px] bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-50 py-1.5 animate-fadeIn overflow-hidden">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        editorInstance?.chain().focus().toggleStrike().run();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-slate-200 hover:bg-slate-700/70 active:bg-slate-700 transition-colors text-left"

                    >
                      <Strikethrough className="w-4 h-4 flex-shrink-0" />
                      Strikethrough
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        editorInstance?.chain().focus().toggleBlockquote().run();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-slate-200 hover:bg-slate-700/70 active:bg-slate-700 transition-colors text-left"

                    >
                      <Quote className="w-4 h-4 flex-shrink-0" />
                      Quote
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        editorInstance?.chain().focus().toggleCodeBlock().run();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-slate-200 hover:bg-slate-700/70 active:bg-slate-700 transition-colors text-left"
                    >
                      <CodeSquare className="w-4 h-4 flex-shrink-0" />
                      Code Block
                    </button>
                    <div className="mx-3 my-1 border-t border-slate-700/60" />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        editorInstance?.chain().focus().clearNodes().unsetAllMarks().run();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-slate-400 hover:bg-slate-700/70 hover:text-slate-200 transition-colors text-left"
                    >
                      <RemoveFormatting className="w-4 h-4 flex-shrink-0" />
                      Clear Format
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== SCROLLABLE BODY ===== */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-32 sm:pb-28">
        <RichTextEditor
          content={note.content}
          onChange={(content) => onUpdateNote({ content })}
          editable={canEdit}
          onEditorReady={setEditorInstance}
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
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group/file flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-700/40"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0 text-base">
                    {getFileIcon(file.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate leading-snug">{file.filename}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatFileSize(file.file_size)}</p>
                  </div>

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

        <div className="flex items-center gap-2 px-3 sm:px-5 py-2.5">
          {canEdit && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => setAttachDialogOpen(true)}
                disabled={uploading}
                className={`flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex-shrink-0 ${
                  files.length > 0 ? '' : 'flex-1'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Uploading…</span>
                    <span className="sm:hidden">…</span>
                  </>
                ) : (
                  <>
                    <Paperclip className="w-4 h-4" />
                    <span className="hidden sm:inline">Attach File</span>
                    <span className="sm:hidden">Attach</span>
                  </>
                )}
              </button>
            </>
          )}

          {files.length > 0 && (
            <button
              onClick={() => setAttachmentsExpanded(!attachmentsExpanded)}
              className={`flex items-center gap-2 h-11 px-3 rounded-xl text-sm font-medium transition-colors flex-1 min-w-0 justify-between ${
                attachmentsExpanded
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700/60'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <FileIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {files.length} attachment{files.length !== 1 ? 's' : ''}
                </span>
              </span>
              {attachmentsExpanded ? (
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronUp className="w-4 h-4 flex-shrink-0" />
              )}
            </button>
          )}
        </div>
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

      <AttachFileDialog
        open={attachDialogOpen}
        onClose={() => setAttachDialogOpen(false)}
        noteId={note.id}
        onFileLinked={onFileLinked}
        existingFileIds={files.map((f) => f.id)}
      />
    </div>
  );
}
