import { useMemo, useRef, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { UnifiedFileLinkerWindow } from '../UnifiedFileLinkerWindow';
import { UnifiedWarningWindow } from '../UnifiedWarningWindow';
import { ParagraphBlock } from './ParagraphBlock';
import { NoteHeaderBlock } from './NoteHeaderBlock';
import { AddBlockWindow } from './AddBlockWindow';
import { ParagraphEditWindow } from './ParagraphEditWindow';
import type { BlockContext } from './ParagraphEditWindow';
import { createPortal } from 'react-dom';
import { useNoteParagraphs, isDocEmpty, docPlainText } from './useNoteParagraphs';
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
  const [addOpen, setAddOpen] = useState(false);
  /** Which view the paragraph editor shows once the attach window closes. */
  const [attachmentsView, setAttachmentsView] = useState(false);
  /** Whether the attach dialog should open on the attached-chips view. */
  const [attachChipsView, setAttachChipsView] = useState(false);
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

  const isBlockEmpty = (p: typeof paragraphs[number]) => p.kind === 'header'
    ? !p.heading?.trim()
    : isDocEmpty(p.content) && !(filesByParagraph[p.id]?.length);
  const editingParagraph = paragraphs.find(p => p.id === editTarget);
  const visibleBlocks = paragraphs.filter(p => !isBlockEmpty(p));
  const editIndex = visibleBlocks.findIndex(p => p.id === editTarget);
  /** Richer context shown about the blocks around the one being edited. */
  const blockContext = (p: typeof paragraphs[number], index: number): BlockContext => ({
    kind: p.kind === 'header' ? 'header' : 'paragraph',
    text: p.kind === 'header' ? (p.heading ?? '') : docPlainText(p.content),
    fileCount: (filesByParagraph[p.id] ?? []).length,
    position: index + 1,
    total: visibleBlocks.length,
  });
  const prevContext = editIndex > 0 ? blockContext(visibleBlocks[editIndex - 1], editIndex - 1) : null;
  const nextContext = editIndex >= 0 && editIndex < visibleBlocks.length - 1 ? blockContext(visibleBlocks[editIndex + 1], editIndex + 1) : null;
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
                onEdit={() => openEditor(paragraph.id)}
                onDelete={() => setDeleteTarget(paragraph.id)}
                onOpenFile={onOpenFile}
                onAttach={() => { setAttachChipsView(false); setAttachTarget(paragraph.id); }}
              />
            ))}
          </div>
          {canEdit && (
            <div className="relative pr-2 sm:pr-3 pt-2.5 pb-1">
              <button
                type="button"
                aria-label="Add block at the end of the note"
                onClick={() => setAddOpen(true)}
                className="group flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/15 px-4 py-3 text-left text-primary/90 transition-all hover:border-primary/60 hover:bg-primary/25 hover:text-primary active:translate-y-px"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary/90 transition-colors group-hover:border-primary/70 group-hover:bg-primary/20 group-hover:text-primary">
                  <Plus className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium tracking-wide">Add block</span>
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
        prevContext={prevContext}
        nextContext={nextContext}
        onClose={closeEditor}
        attachmentsOpen={false}
        onAttachmentsOpenChange={open => { setAttachChipsView(open); setAttachTarget(editingParagraph.id); }}

        onChange={content => setContent(editingParagraph.id, content)}
        onHeadingChange={(heading, immediate) => setHeading(editingParagraph.id, heading, immediate)}
        onFocusEditor={editor => onActiveEditorChange(editor as Editor | null)}
        onAttach={() => { setAttachChipsView(false); setAttachTarget(editingParagraph.id); }}
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
        initialShowAttached={attachChipsView}




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
