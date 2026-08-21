import { useMemo, useState } from 'react';
import { Loader2, Plus, X, Type, Paperclip } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { AttachFileDialog } from '../AttachFileDialog';
import { UnifiedWarningWindow } from '../UnifiedWarningWindow';
import { ParagraphBlock } from './ParagraphBlock';
import { useNoteParagraphs, isDocEmpty } from './useNoteParagraphs';
import type { FileItem } from '../../types/database';


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
    insertAt,
    removeParagraph,
    mergeInto,
    attachFileToParagraph,
  } = useNoteParagraphs({ noteId, userId, initialContent, canEdit });

  const [attachTarget, setAttachTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [autoFocusId, setAutoFocusId] = useState<string | null>(null);

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
  // The hint row is pure UI: it exists only while there is no trailing empty paragraph.
  const showHintRow = canEdit && !lastIsEmpty && !pending;

  const createTrailing = async (then?: (id: string) => void) => {
    setPending(true);
    const id = await insertAt(paragraphs.length);
    setPending(false);
    if (!id) return;
    setAutoFocusId(id);
    then?.(id);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
          <span className="flex-1 min-w-0 break-words">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {paragraphs.map((paragraph, index) => (
        <ParagraphBlock
          key={paragraph.id}
          paragraph={paragraph}
          index={index}
          total={paragraphs.length}
          files={filesByParagraph[paragraph.id] ?? []}
          canEdit={canEdit}
          autoFocus={autoFocusId === paragraph.id}
          onChange={(content) => setContent(paragraph.id, content)}
          onFocusEditor={(editor) => {
            if (editor) onActiveEditorChange(editor as Editor);
          }}
          onMergeUp={() => mergeInto(paragraph.id, paragraphs[index - 1].id, 'below')}
          onMergeDown={() => mergeInto(paragraph.id, paragraphs[index + 1].id, 'above')}
          onDelete={() => setDeleteTarget(paragraph.id)}
          onAutoDelete={() => removeParagraph(paragraph.id)}
          onAttach={() => setAttachTarget(paragraph.id)}
          onDetach={(fileId) => attachFileToParagraph(fileId, null)}
          onOpenFile={onOpenFile}
        />
      ))}

      {showHintRow && (
        <div className="rounded-xl border border-transparent bg-transparent">
          <div className="flex items-center gap-2 px-2 sm:px-3 py-2 min-h-11 text-xs text-slate-500">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => createTrailing()}
              aria-label="Write text in new paragraph"
              className="inline-flex items-center gap-1 h-7 px-1.5 rounded-lg bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 transition-colors"
            >
              <Type className="w-4 h-4" />
              <span className="text-xs font-medium">Write text</span>
            </button>
            <span className="text-slate-500">or</span>
            <button
              type="button"
              onClick={() => createTrailing((id) => setAttachTarget(id))}
              aria-label="Attach file to new paragraph"
              className="inline-flex items-center gap-1 h-7 px-1.5 rounded-lg bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
              <span className="text-xs font-medium">Attach file</span>
            </button>
          </div>
        </div>
      )}

      {pending && (
        <div className="rounded-xl border border-transparent bg-transparent" aria-hidden>
          <div className="flex items-start gap-1.5 px-2 sm:px-3 py-2 min-h-11">
            <div className="flex-1 min-w-0 min-h-[1.75rem]" />
            <div className="w-7 h-7" />
          </div>
        </div>
      )}



      {canEdit && (
        <button
          type="button"
          onClick={() => createTrailing()}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-slate-700/70 text-[13px] font-semibold text-slate-400 hover:text-slate-100 hover:border-emerald-500/40 hover:bg-slate-700/20 active:bg-slate-700/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Paragraph
        </button>
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

      <AttachFileDialog
        open={attachTarget !== null}
        onClose={() => setAttachTarget(null)}
        noteId={noteId}
        paragraphId={attachTarget}
        paragraphFileIds={(attachTarget ? filesByParagraph[attachTarget] ?? [] : []).map((f) => f.id)}
        onFileLinked={(file) => {
          onFileLinked(file);
          if (attachTarget) attachFileToParagraph(file.id, attachTarget);
        }}
        existingFileIds={files.map((f) => f.id)}
      />
    </div>
  );
}
