import { useMemo, useRef, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { UnifiedFileLinkerWindow } from '../UnifiedFileLinkerWindow';
import { UnifiedWarningWindow } from '../UnifiedWarningWindow';
import { ParagraphBlock } from './ParagraphBlock';
import { NoteHeaderBlock } from './NoteHeaderBlock';
import { AddBlockWindow } from './AddBlockWindow';
import { ParagraphEditWindow } from './ParagraphEditWindow';
import { createPortal } from 'react-dom';
import { useNoteParagraphs, isDocEmpty } from './useNoteParagraphs';
import type { FileItem } from '../../types/database';

const NEW_PARAGRAPH = '__new__';




interface ParagraphListProps {
  noteId: string;
  noteTitle: string;
  userId: string | null;
  canEdit: boolean;
  initialContent: Record<string, unknown> | null;
  files: FileItem[];
  onOpenFile: (file: FileItem) => void;
  onActiveEditorChange: (editor: Editor | null) => void;
  onFileLinked: (file: FileItem) => void;
  onTitleChange: (title: string) => void;
}

export function ParagraphList({
  noteId,
  noteTitle,
  userId,
  canEdit,
  initialContent,
  files,
  onOpenFile,
  onActiveEditorChange,
  onFileLinked,
  onTitleChange,
}: ParagraphListProps) {
  const {
    paragraphs,
    loading,
    error,
    setError,
    fileParagraph,
    setContent,
    setHeading,
    insertAt,
    removeParagraph,
    attachFileToParagraph,
  } = useNoteParagraphs({ noteId, userId, initialContent, canEdit });

  const [attachTarget, setAttachTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  /** Paragraph block currently edited in place (paragraphs only; headers use the overlay). */
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  /** Which view the paragraph editor shows once the attach window closes. */
  const [attachmentsView, setAttachmentsView] = useState(false);
  const newAttachParagraphId = useRef<string | null>(null);



  const filesByParagraph = useMemo(() => {
    const map: Record<string, FileItem[]> = {};
    files.forEach((file) => {
      const pid = fileParagraph[file.id];
      if (!pid) return;
      (map[pid] ||= []).push(file);
    });
    return map;
  }, [files, fileParagraph]);

  const [, setPending] = useState(false);

  const last = paragraphs[paragraphs.length - 1];
  const lastIsEmpty =
    !last || (last.kind !== 'header' && isDocEmpty(last.content) && (filesByParagraph[last.id] ?? []).length === 0);
  const createTrailing = async (then?: (id: string) => void): Promise<string | null> => {
    // Reuse a trailing empty paragraph instead of stacking another empty one.
    if (last && lastIsEmpty) {
      then?.(last.id);
      return last.id;
    }
    setPending(true);
    const id = await insertAt(paragraphs.length);
    setPending(false);
    if (!id) return null;
    then?.(id);
    return id;
  };

  const editingParagraph = paragraphs.find(p => p.id === editTarget);


  const isBlockEmpty = (p: typeof paragraphs[number]) => p.kind === 'header'
    ? !p.heading?.trim()
    : isDocEmpty(p.content) && !(filesByParagraph[p.id]?.length);
  const createHeader = async () => {
    setPending(true);
    const index = last && lastIsEmpty ? paragraphs.length - 1 : paragraphs.length;
    const id = await insertAt(index, 'header');
    setPending(false);
    if (id) openEditor(id);
  };
  const openEditor = (id: string) => {
    setAttachmentsView(false);
    setEditTarget(id);
  };
  const closeEditor = () => {

    if (editingParagraph && isBlockEmpty(editingParagraph)) {
      void removeParagraph(editingParagraph.id);
    }
    setEditTarget(null);
    onActiveEditorChange(null);
  };




  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 text-note-muted animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
          <span className="flex-1 min-w-0 break-words">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-[var(--note-block-max-width)]">
        <NoteHeaderBlock title={noteTitle} canEdit={canEdit} onTitleChange={onTitleChange} />
          <div className="relative pt-6">
            {paragraphs.filter(paragraph => !isBlockEmpty(paragraph)).map((paragraph, index, visible) => (
              <ParagraphBlock
                key={paragraph.id}
                className={index === 0 ? '' : visible[index - 1].kind === 'header' ? '-mt-2' : 'mt-4'}
                paragraph={paragraph}
                files={filesByParagraph[paragraph.id] ?? []}
                canEdit={canEdit}
                onEdit={() => paragraph.kind === 'header' ? openEditor(paragraph.id) : setInlineEditId(paragraph.id)}
                onDelete={() => setDeleteTarget(paragraph.id)}
                onOpenFile={onOpenFile}
                onAttach={() => setAttachTarget(paragraph.id)}
                editing={inlineEditId === paragraph.id}
                onContentChange={(content) => setContent(paragraph.id, content)}
                onEditingEnd={() => setInlineEditId(null)}
              />
            ))}
          </div>
          {canEdit && (
            <div className="relative pl-12 pr-2 sm:pr-3 pt-2.5 pb-1">
              {/* The emerald diamond marks the end of the note. */}
              <div
                aria-hidden="true"
                className="absolute left-5 top-[35px] -translate-x-1/2 -translate-y-1/2"
              >
                <span className="block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-primary ring-4 ring-note-background" />
              </div>
              <button
                type="button"
                aria-label="Add block at the end of the note"
                onClick={() => setAddOpen(true)}
                className="group flex w-full items-center gap-3 rounded-xl border border-primary/70 bg-primary/90 px-4 py-3 text-left text-primary-foreground shadow-[0_12px_30px_-14px_hsl(var(--primary)/0.55)] transition-all hover:border-primary hover:bg-primary hover:shadow-[0_16px_36px_-12px_hsl(var(--primary)/0.7)] active:translate-y-px"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary-foreground/30 bg-primary-foreground/15 transition-colors group-hover:bg-primary-foreground/25">
                  <Plus className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-semibold tracking-wide">Add block</span>
              </button>
            </div>
          )}

      </div>

      <AddBlockWindow
        open={addOpen}
        noteTitle={noteTitle}
        onClose={() => setAddOpen(false)}
        onAddHeader={() => { setAddOpen(false); void createHeader(); }}
        onAddParagraph={() => { setAddOpen(false); void createTrailing(id => openEditor(id)); }}
      />




      <UnifiedWarningWindow
        open={deleteTarget !== null}
        title={paragraphs.find(p => p.id === deleteTarget)?.kind === 'header' ? "Delete Header" : "Delete Paragraph"}
        description="This paragraph and its text will be removed. Attached files stay in the note and in your storage."
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) removeParagraph(deleteTarget);
          setDeleteTarget(null);
        }}
      />

      {editingParagraph && canEdit && <ParagraphEditWindow
        key={editingParagraph.id}
        paragraph={editingParagraph}
        files={filesByParagraph[editingParagraph.id] ?? []}
        suspended={attachTarget !== null}
        onClose={closeEditor}
        attachmentsOpen={attachmentsView}
        onAttachmentsOpenChange={setAttachmentsView}

        onChange={content => setContent(editingParagraph.id, content)}
        onHeadingChange={(heading, immediate) => setHeading(editingParagraph.id, heading, immediate)}
        onFocusEditor={editor => onActiveEditorChange(editor as Editor | null)}
        onAttach={() => setAttachTarget(editingParagraph.id)}
        onDetach={id => attachFileToParagraph(id, null)}
        onOpenFile={file => { closeEditor(); onOpenFile(file); }}
      />}

      {attachTarget !== null && createPortal(<div className="relative z-[9995]"><UnifiedFileLinkerWindow
        open={attachTarget !== null}
        onClose={() => {
          setAttachTarget(null);
          newAttachParagraphId.current = null;
        }}
        onEditParagraph={() => {
          setAttachTarget(null);
          setAttachmentsView(false);
          if (attachTarget && attachTarget !== NEW_PARAGRAPH) setEditTarget(attachTarget);
        }}
        onEditAttachments={() => {
          setAttachTarget(null);
          setAttachmentsView(true);
          if (attachTarget && attachTarget !== NEW_PARAGRAPH) setEditTarget(attachTarget);
        }}

        noteId={noteId}
        noteTitle={noteTitle}




        paragraphId={attachTarget === NEW_PARAGRAPH ? null : attachTarget}
        paragraphFileIds={(attachTarget && attachTarget !== NEW_PARAGRAPH
          ? filesByParagraph[attachTarget] ?? []
          : []
        ).map((f) => f.id)}
        onFileLinked={async (file) => {
          onFileLinked(file);
          let target: string | null = attachTarget;
          if (target === NEW_PARAGRAPH) {
            // Only now, after a file was actually picked, materialize the paragraph.
            target = newAttachParagraphId.current ?? (await createTrailing());
            newAttachParagraphId.current = target;
          }
          if (target) await attachFileToParagraph(file.id, target);
        }}
        existingFileIds={files.map((f) => f.id)}
      /></div>, document.body)}

    </div>
  );
}
