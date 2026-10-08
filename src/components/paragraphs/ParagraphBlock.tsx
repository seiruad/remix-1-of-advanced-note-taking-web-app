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
  className?: string;
}

export function ParagraphBlock({ paragraph, files, canEdit, onEdit, onDelete, onOpenFile, onAttach, className }: ParagraphBlockProps) {
  const items: UnifiedMenuItem[] = [
    { id: 'edit', label: 'Edit', icon: Pencil, onSelect: onEdit },
    { id: 'move', label: 'Move', icon: ArrowUpDown, disabled: true, onSelect: () => {} },
    { id: 'delete', label: 'Delete', icon: Trash2, danger: true, onSelect: onDelete },
  ];
  const isHeader = paragraph.kind === 'header';
  return <article aria-label={isHeader ? 'Header' : 'Paragraph'} className={`relative ${isHeader ? 'min-h-[48px] flex items-center' : 'min-h-[72px]'} pl-2 sm:pl-3 pr-12 py-2 ${className ?? ''}`}>
    {isHeader ? <div className="flex items-center gap-2 min-w-0">
      <h3 className="min-w-0 break-words text-base sm:text-lg font-bold leading-7 text-foreground">{paragraph.heading}</h3>
      {canEdit && <span className="shrink-0"><UnifiedMenu items={items} ariaLabel="Header options" triggerClassName="!rounded-md w-6 h-6 border border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/60 hover:bg-muted/50 hover:text-primary-foreground" openTriggerClassName="!bg-surface !text-primary-foreground" triggerContent={<ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />} /></span>}
    </div> :
    <div className="space-y-2 min-w-0 break-words">
      {!isDocEmpty(paragraph.content) && <div className="paragraph-reading [&_.ProseMirror]:leading-7">
        <RichTextEditor content={paragraph.content} onChange={() => {}} editable={false} placeholder="" minHeightClassName="min-h-0" />
      </div>}
      {files.length > 0 && <ParagraphAttachments files={files} onOpenFile={onOpenFile} onAdd={canEdit ? onAttach : undefined} />}
    </div>}
    {canEdit && <div className="absolute right-5 top-2 translate-x-1/2">
      <UnifiedMenu items={items} ariaLabel="Paragraph options" triggerClassName="!rounded-full w-6 h-6 border border-border/70 bg-background text-muted-foreground hover:border-primary/70 hover:text-primary-foreground" iconClassName="w-3 h-3" openTriggerClassName="!bg-surface !text-primary-foreground" />
    </div>}
  </article>;
}
