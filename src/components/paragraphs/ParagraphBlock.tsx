import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { ArrowUpDown, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { RichTextEditor } from '../RichTextEditor';
import { UnifiedMenu, type UnifiedMenuItem } from '../UnifiedMenu';
import { ParagraphAttachments } from './ParagraphAttachments';
import type { FileItem } from '../../types/database';
import { isDocEmpty, type NoteParagraph } from './useNoteParagraphs';

interface ParagraphBlockProps {
  paragraph: NoteParagraph;
  files: FileItem[];
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenFile: (file: FileItem) => void;
  onAttach: () => void;
  /** In-place editing mode (paragraph blocks only). */
  editing?: boolean;
  onContentChange?: (content: Record<string, unknown>) => void;
  onEditingEnd?: () => void;
  className?: string;
}

export function ParagraphBlock({ paragraph, files, canEdit, onEdit, onDelete, onOpenFile, onAttach, editing = false, onContentChange, onEditingEnd, className }: ParagraphBlockProps) {
  const items: UnifiedMenuItem[] = [
    { id: 'edit', label: 'Edit', icon: Pencil, onSelect: onEdit },
    { id: 'move', label: 'Move', icon: ArrowUpDown, disabled: true, onSelect: () => {} },
    { id: 'delete', label: 'Delete', icon: Trash2, danger: true, onSelect: onDelete },
  ];
  const isHeader = paragraph.kind === 'header';
  const editorRef = useRef<Editor | null>(null);
  // Focus the text whenever in-place editing switches on (the editor instance
  // is already mounted, so onEditorReady alone would never refire).
  useEffect(() => {
    if (editing) editorRef.current?.commands.focus('end');
  }, [editing]);
  return <article aria-label={isHeader ? 'Header' : 'Paragraph'} className={`relative ${isHeader ? 'min-h-[48px] flex items-center' : 'min-h-[72px]'} pl-12 pr-2 sm:pr-3 py-2 ${editing ? 'rounded-xl bg-note-surface/45 ring-1 ring-primary/60 shadow-[0_10px_28px_-16px_hsl(var(--primary)/0.5)]' : ''} ${className ?? ''}`}>
    {isHeader ? <div className="flex items-center gap-2 min-w-0">
      <h3 className="min-w-0 break-words text-base sm:text-lg font-bold leading-7 text-foreground">{paragraph.heading}</h3>
      {canEdit && <span className="shrink-0"><UnifiedMenu items={items} ariaLabel="Header options" triggerClassName="!rounded-md w-6 h-6 border border-note-border/60 bg-note-surface/55 text-note-muted hover:border-primary/60 hover:bg-note-surface hover:text-foreground" openTriggerClassName="!bg-note-surface !text-foreground" triggerContent={<ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />} /></span>}
    </div> :
    <div className="flex items-start gap-2 min-w-0">
      <div className="min-w-0 max-w-full space-y-2 break-words">
        {(!isDocEmpty(paragraph.content) || editing) && <div className={`paragraph-reading [&_.ProseMirror]:leading-7 ${editing ? '[&_.ProseMirror]:outline-none' : ''}`}>
          <RichTextEditor
            content={paragraph.content}
            onChange={editing ? (onContentChange ?? (() => {})) : () => {}}
            editable={editing}
            placeholder={editing ? 'Write text…' : ''}
            minHeightClassName="min-h-0"
            onEditorReady={(editor) => { editorRef.current = editor ?? null; if (editing) editor?.commands.focus('end'); }}
            onBlur={editing ? onEditingEnd : undefined}
          />
        </div>}
        {files.length > 0 && <ParagraphAttachments files={files} onOpenFile={onOpenFile} onAdd={canEdit ? onAttach : undefined} />}
      </div>
    </div>}
    {canEdit && !isHeader && !editing && <div className="absolute left-5 top-2 -translate-x-1/2">
      <UnifiedMenu items={items} ariaLabel="Paragraph options" triggerClassName="!rounded-full w-6 h-6 border border-note-border/80 bg-note-surface text-note-muted shadow-sm hover:border-primary/70 hover:text-foreground" iconClassName="w-3 h-3" openTriggerClassName="!bg-note-surface !text-foreground" />
    </div>}
  </article>;
}
