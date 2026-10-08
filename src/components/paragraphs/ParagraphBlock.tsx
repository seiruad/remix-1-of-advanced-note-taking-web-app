import { ArrowUpDown, Pencil, Trash2 } from 'lucide-react';
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
}

export function ParagraphBlock({ paragraph, files, canEdit, onEdit, onDelete, onOpenFile, onAttach }: ParagraphBlockProps) {
  const items: UnifiedMenuItem[] = [
    { id: 'edit', label: 'Edit', icon: Pencil, onSelect: onEdit },
    { id: 'move', label: 'Move', icon: ArrowUpDown, disabled: true, onSelect: () => {} },
    { id: 'delete', label: 'Delete', icon: Trash2, danger: true, onSelect: onDelete },
  ];
  return <article aria-label="Paragraph" className="relative min-h-[72px] pl-2 sm:pl-3 pr-12 py-2">
    <div className="space-y-2 min-w-0 break-words">
      {paragraph.heading && <h3 className="text-base sm:text-lg font-bold leading-7 text-foreground">{paragraph.heading}</h3>}
      {!isDocEmpty(paragraph.content) && <div className="paragraph-reading [&_.ProseMirror]:leading-7">
        <RichTextEditor content={paragraph.content} onChange={() => {}} editable={false} placeholder="" minHeightClassName="min-h-0" />
      </div>}
      {files.length > 0 && <ParagraphAttachments files={files} onOpenFile={onOpenFile} onAdd={canEdit ? onAttach : undefined} />}
    </div>
    <div aria-hidden="true" className="absolute right-5 top-2 bottom-2 w-px bg-border/60" />
    {canEdit && <div className="absolute right-5 top-[33.333%] translate-x-1/2 -translate-y-1/2">
      <UnifiedMenu items={items} ariaLabel="Paragraph options" triggerClassName="!rounded-full w-7 h-7 border border-border/70 bg-background text-muted-foreground hover:border-primary/70 hover:text-primary-foreground" iconClassName="w-3.5 h-3.5" openTriggerClassName="!bg-surface !text-primary-foreground" />
    </div>}
  </article>;
}
