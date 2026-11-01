import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Paperclip, Unlink, X } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { Button } from '../Button';
import { RichTextEditor } from '../RichTextEditor';
import type { FileItem } from '../../types/database';
import type { NoteParagraph } from './useNoteParagraphs';

interface Props {
  paragraph: NoteParagraph;
  files: FileItem[];
  suspended: boolean;
  /** Small context previews of the surrounding blocks (plain text, may be null). */
  prevLabel?: string | null;
  nextLabel?: string | null;
  onClose: () => void;
  /** Whether the attachments list (rather than the text) is the visible view. */
  attachmentsOpen: boolean;
  onAttachmentsOpenChange: (open: boolean) => void;

  onChange: (content: Record<string, unknown>) => void;
  onHeadingChange: (heading: string | null, immediate?: boolean) => void;
  onFocusEditor: (editor: unknown) => void;
  onAttach: () => void;
  onDetach: (id: string) => void;
  onOpenFile: (file: FileItem) => void;
}

export function ParagraphEditWindow({ paragraph, files, suspended, prevLabel, nextLabel, onClose, attachmentsOpen, onAttachmentsOpenChange, onChange, onHeadingChange, onFocusEditor, onAttach, onDetach, onOpenFile }: Props) {
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

  const ctxCard = (dir: 'prev' | 'next', label: string) => (
    <div aria-hidden="true" className="flex shrink-0 select-none items-center gap-2.5 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2 opacity-60">
      {dir === 'prev' ? <ArrowUp className="h-3.5 w-3.5 shrink-0 text-slate-500" /> : <ArrowDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{dir === 'prev' ? 'Previous' : 'Next'}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-slate-400 blur-[0.5px]">{label}</span>
    </div>
  );
  const navBtn = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40';

  return createPortal(<div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center bg-overlay/60 backdrop-blur-sm p-0 sm:p-4" onPointerDown={e => { if (e.target === e.currentTarget && !suspended) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={isHeader ? 'Edit header' : 'Edit paragraph'} className="flex flex-col w-full sm:max-w-3xl h-[85dvh] sm:h-[80vh] bg-slate-800 border border-slate-700/60 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
      <header className="flex items-center justify-between px-4 sm:px-5 py-3 shrink-0 border-b border-slate-700/60">
        <div className="flex items-center gap-2 min-w-0">
          {attachmentsOpen && <button type="button" className={`${navBtn} w-9 border-slate-600/60 bg-slate-700/60 text-slate-200 hover:text-emerald-300`} aria-label="Back to text" onClick={() => onAttachmentsOpenChange(false)}><ArrowLeft className="h-4 w-4" /></button>}
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{isHeader ? 'Edit header' : attachmentsOpen ? 'Attachments' : 'Edit paragraph'}</div>
            <div className="truncate text-sm font-semibold text-slate-100">{isHeader ? 'Header' : attachmentsOpen ? `${files.length} files` : 'Paragraph'}</div>
          </div>
        </div>
        <button type="button" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/60" aria-label="Close editor" onClick={onClose}><X className="h-4 w-4" /></button>
      </header>
      {!isHeader && !attachmentsOpen && <div className="shrink-0 px-4 sm:px-5 pt-4">
        <button type="button" onClick={onAttach} aria-label={`View attachments (${files.length})`} className={`${navBtn} w-full justify-between px-3.5 border-emerald-500/25 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 hover:border-emerald-500/45`}>
          <span className="flex items-center gap-2"><Paperclip className="h-4 w-4" />Attachments · {files.length}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>}
      <div className="flex-1 min-h-0 flex flex-col gap-3 p-4 sm:p-5">
        {isHeader ? <div className="space-y-2">
          <label htmlFor={`heading-${paragraph.id}`} className="text-xs font-medium text-slate-400">Header</label>
          <input id={`heading-${paragraph.id}`} autoFocus value={paragraph.heading ?? ''} placeholder="Header" onChange={e => onHeadingChange(e.target.value)} onBlur={e => onHeadingChange(e.target.value.trim() ? e.target.value : null, true)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onClose(); } }} className="w-full rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2.5 text-base font-semibold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60" />
        </div> : <>
        {!attachmentsOpen && (prevLabel ? ctxCard('prev', prevLabel) : <div className="h-[34px] shrink-0" />)}
        <div className={attachmentsOpen ? 'hidden' : 'flex-1 min-h-0 flex flex-col justify-center'}>
          <div className="paragraph-edit-body max-h-full overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-900/50 px-4 py-3 focus-within:border-emerald-500/50">
            <RichTextEditor content={paragraph.content} onChange={onChange} placeholder="" minHeightClassName="min-h-0" onEditorReady={editor => {
              onFocusEditor(editor);
              requestAnimationFrame(() => { const ready = editor as Editor | null; if (ready && !ready.isDestroyed) ready.commands.focus('end'); });
            }} />
          </div>
        </div>
        {!attachmentsOpen && (nextLabel ? ctxCard('next', nextLabel) : <div className="h-[34px] shrink-0" />)}
        {attachmentsOpen && <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          <div className="flex justify-end">
            <Button variant="primary" className="h-8 px-2.5 text-xs" onClick={onAttach}><Paperclip className="h-3.5 w-3.5" />Attach file</Button>
          </div>
          {files.length === 0 ? <p className="py-3 text-sm text-slate-400">No attachments</p> : <ul className="divide-y divide-slate-700/50">
            {files.map(file => <li key={file.id} className="flex items-center gap-2 py-1">
              <Button className="min-w-0 flex-1 justify-start px-3 py-3 text-left" onClick={() => onOpenFile(file)}>
                <Paperclip className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 break-words text-foreground">{file.filename}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Button>
              <Button className="h-8 w-8 shrink-0 hover:text-destructive" aria-label={`Unlink ${file.filename}`} title="Unlink from paragraph" onClick={() => onDetach(file.id)}><Unlink className="h-3.5 w-3.5" /></Button>
            </li>)}
          </ul>}
        </div>}
        </>}
      </div>
      <footer className="flex justify-end px-4 sm:px-5 py-3 shrink-0 border-t border-slate-700/60">
        <button type="button" onClick={onClose} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-4 text-[13px] font-semibold text-emerald-100 hover:bg-emerald-500/30"><Check className="h-4 w-4" />Done</button>
      </footer>
    </div>
  </div>, document.body);
}
