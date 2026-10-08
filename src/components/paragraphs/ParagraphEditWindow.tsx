import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, Paperclip, X } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { Button } from '../Button';
import { RichTextEditor } from '../RichTextEditor';
import { ParagraphAttachments } from './ParagraphAttachments';
import type { FileItem } from '../../types/database';
import type { NoteParagraph } from './useNoteParagraphs';

interface Props {
  paragraph: NoteParagraph;
  files: FileItem[];
  suspended: boolean;
  onClose: () => void;
  onChange: (content: Record<string, unknown>) => void;
  onHeadingChange: (heading: string | null, immediate?: boolean) => void;
  onFocusEditor: (editor: unknown) => void;
  onAttach: () => void;
  onDetach: (id: string) => void;
  onOpenFile: (file: FileItem) => void;
}

export function ParagraphEditWindow({ paragraph, files, suspended, onClose, onChange, onHeadingChange, onFocusEditor, onAttach, onDetach, onOpenFile }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isHeader = paragraph.kind === 'header';
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (suspended) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const targets = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, textarea, [contenteditable="true"]') ?? []);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [suspended]);

  return createPortal(<div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center bg-overlay/60 backdrop-blur-sm p-0 sm:p-4" onPointerDown={e => { if (e.target === e.currentTarget && !suspended) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={isHeader ? 'Edit header' : 'Edit paragraph'} className={`flex flex-col w-full sm:max-w-2xl ${isHeader ? 'h-auto' : 'h-[85dvh] sm:h-[620px]'} max-h-[90dvh] bg-background border border-border/50 rounded-t-lg sm:rounded-lg overflow-hidden`}>
      <header className="flex items-center justify-between px-4 sm:px-5 h-14 shrink-0 border-b border-border/40">
        <h2 className="text-base font-semibold text-foreground">{isHeader ? 'Edit header' : 'Edit paragraph'}</h2>
        <Button className="h-9 w-9" aria-label="Close editor" onClick={onClose}><X className="h-4 w-4" /></Button>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-5">
        {isHeader ? <div className="space-y-2">
          <label htmlFor={`heading-${paragraph.id}`} className="text-xs font-medium text-muted-foreground">Header</label>
          <input id={`heading-${paragraph.id}`} autoFocus value={paragraph.heading ?? ''} placeholder="Header" onChange={e => onHeadingChange(e.target.value)} onBlur={e => onHeadingChange(e.target.value.trim() ? e.target.value : null, true)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onClose(); } }} className="w-full rounded-lg border border-border/40 bg-surface/40 px-3 py-2.5 text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60" />
        </div> : <>
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Text</div>
          <div className="paragraph-edit-body rounded-lg border border-border/40 bg-surface/40 px-3 py-2.5 focus-within:border-primary/60">
            <RichTextEditor content={paragraph.content} onChange={onChange} placeholder="" minHeightClassName="min-h-[180px]" onEditorReady={editor => {
              onFocusEditor(editor);
              requestAnimationFrame(() => { const ready = editor as Editor | null; if (ready && !ready.isDestroyed) ready.commands.focus('end'); });
            }} />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">Attachments · {files.length}</h3>
            <Button variant="primary" className="h-8 px-2.5 text-xs" onClick={onAttach}><Paperclip className="h-3.5 w-3.5" />Attach file</Button>
          </div>
          <ParagraphAttachments files={files} onOpenFile={onOpenFile} onDetach={onDetach} />
        </div>
        </>}
      </div>
      <footer className="flex justify-end px-4 sm:px-5 py-3 shrink-0 border-t border-border/40">
        <Button variant="primary" className="h-10 px-5" onClick={onClose}><Check className="h-4 w-4" />Done</Button>
      </footer>
    </div>
  </div>, document.body);
}