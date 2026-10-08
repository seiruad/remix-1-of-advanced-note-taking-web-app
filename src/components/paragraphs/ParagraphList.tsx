import { useMemo, useRef, useState } from 'react';
import { Loader2, X, Type, Paperclip } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { UnifiedFileLinkerWindow } from '../UnifiedFileLinkerWindow';
import { UnifiedWarningWindow } from '../UnifiedWarningWindow';
import { ParagraphBlock } from './ParagraphBlock';
import { ParagraphEditWindow } from './ParagraphEditWindow';
import { Button } from '../Button';
import { createPortal } from 'react-dom';
import { useNoteParagraphs, isDocEmpty } from './useNoteParagraphs';
import type { FileItem } from '../../types/database';

const NEW_PARAGRAPH = '__new__';




interface ParagraphListProps {
  noteId: string;
  userId: string | null;
  canEdit: boolean;
  initialContent: Record<string, unknown> | null;
  files: FileItem[];
  onOpenFile: (file: FileItem) => void;
  onActiveEditorChange: (editor: Editor | null) => void;
  onFileLinked: (file: FileItem) => void;
}

export function ParagraphList({
  noteId,
  userId,
  canEdit,
  initialContent,
  files,
  onOpenFile,
  onActiveEditorChange,
  onFileLinked,
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

  const [pending, setPending] = useState(false);

  const last = paragraphs[paragraphs.length - 1];
  const lastIsEmpty =
    !last || (isDocEmpty(last.content) && (filesByParagraph[last.id] ?? []).length === 0);
  // The hint row replaces the old "New Paragraph" button: it is pure UI, never stored.
  const showHintRow = canEdit && !pending;

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
  const closeEditor = () => {
    if (editingParagraph && isDocEmpty(editingParagraph.content) && !editingParagraph.heading?.trim() && !(filesByParagraph[editingParagraph.id]?.length)) {
      void removeParagraph(editingParagraph.id);
    }
    setEditTarget(null);
    onActiveEditorChange(null);
  };




  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
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

      {paragraphs.filter(paragraph => !isDocEmpty(paragraph.content) || paragraph.heading?.trim() || (filesByParagraph[paragraph.id]?.length ?? 0) > 0).map((paragraph) => (
        <ParagraphBlock
          key={paragraph.id}
          paragraph={paragraph}
          files={filesByParagraph[paragraph.id] ?? []}
          canEdit={canEdit}
          onEdit={() => setEditTarget(paragraph.id)}
          onDelete={() => setDeleteTarget(paragraph.id)}
          onOpenFile={onOpenFile}
        />
      ))}

      {(showHintRow || pending) && (
        <div className="rounded-xl border border-dashed border-transparent">
          <div className="flex items-center gap-2 px-2 sm:px-3 py-2 min-h-11 text-xs text-slate-500">
            {showHintRow && (
              <>
                <Button variant="primary"
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => createTrailing(id => setEditTarget(id))}
                  aria-label="Write text in new paragraph"
                  className="gap-1 h-7 px-1.5"
                >
                  <Type className="w-4 h-4" />
                  <span className="text-xs font-medium">Write text</span>
                </Button>
                <span className="text-slate-500">or</span>
                <Button variant="primary"
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setAttachTarget(NEW_PARAGRAPH)}
                  aria-label="Attach file to new paragraph"
                  className="gap-1 h-7 px-1.5"
                >
                  <Paperclip className="w-4 h-4" />
                  <span className="text-xs font-medium">Attach file</span>
                </Button>
              </>
            )}
          </div>
        </div>
      )}



      <UnifiedWarningWindow
        open={deleteTarget !== null}
        title="Delete Paragraph"
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
        onChange={content => setContent(editingParagraph.id, content)}
        onHeadingChange={(heading, immediate) => setHeading(editingParagraph.id, heading, immediate)}
        onFocusEditor={editor => onActiveEditorChange(editor as Editor | null)}
        onAttach={() => setAttachTarget(editingParagraph.id)}
        onDetach={id => attachFileToParagraph(id, null)}
        onOpenFile={onOpenFile}
      />}

      {attachTarget !== null && createPortal(<div className="relative z-[9995]"><UnifiedFileLinkerWindow
        open={attachTarget !== null}
        onClose={() => {
          setAttachTarget(null);
          newAttachParagraphId.current = null;
        }}
        noteId={noteId}
        paragraphId={attachTarget === NEW_PARAGRAPH ? null : attachTarget}
        paragraphFileIds={(attachTarget && attachTarget !== NEW_PARAGRAPH
          ? filesByParagraph[attachTarget] ?? []
          : []
        ).map((f) => f.id)}
        onFileLinked={async (file) => {
          onFileLinked(file);
          let target = attachTarget;
          if (target === NEW_PARAGRAPH) {
            // Only now, after a file was actually picked, materialize the paragraph.
            target = newAttachParagraphId.current ?? (await createTrailing());
            newAttachParagraphId.current = target;
          }
          if (target) attachFileToParagraph(file.id, target);
        }}
        existingFileIds={files.map((f) => f.id)}
      /></div>, document.body)}

    </div>
  );
}
