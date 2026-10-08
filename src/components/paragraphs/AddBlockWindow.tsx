import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Heading, Type, X } from 'lucide-react';

interface AddBlockWindowProps {
  open: boolean;
  noteTitle: string;
  onAddHeader: () => void;
  onAddParagraph: () => void;
  onClose: () => void;
}

/**
 * End-of-line "+" dialog: names the note, states the action and lets the
 * user choose between a header block and a paragraph block.
 * Same shell as UnifiedWarningWindow: bottom sheet on mobile, centered card on desktop.
 */
export function AddBlockWindow({ open, noteTitle, onAddHeader, onAddParagraph, onClose }: AddBlockWindowProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const choices = [
    {
      id: 'header',
      icon: Heading,
      label: 'Header block',
      description: 'A section title, without body text',
      onSelect: onAddHeader,
    },
    {
      id: 'paragraph',
      icon: Type,
      label: 'Paragraph block',
      description: 'Text with optional attached files',
      onSelect: onAddParagraph,
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out_both]"
      onPointerDown={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add new block"
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm sm:mx-4 bg-slate-800/95 backdrop-blur-xl border-t border-slate-700/70 sm:border rounded-t-2xl sm:rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.65)] px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 animate-[slideUpSheet_0.22s_ease-out_both]"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-[17px] sm:text-lg font-semibold text-white">Add new block</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 px-3.5 py-2.5 mb-2">
          <p className="text-[10px] uppercase tracking-[0.18em] font-medium leading-none text-emerald-400/80">Note</p>
          <p className="mt-1.5 text-sm font-semibold text-white break-words leading-snug">{noteTitle.trim() || 'Untitled'}</p>
        </div>

        <p className="text-[13.5px] sm:text-sm leading-relaxed text-slate-400 mb-4">Add new block at the end of the note.</p>

        <div className="grid gap-2">
          {choices.map(({ id, icon: Icon, label, description, onSelect }) => (
            <button
              key={id}
              type="button"
              onClick={onSelect}
              className="flex items-center gap-3 w-full text-left rounded-xl border border-slate-700/60 bg-slate-700/30 px-3.5 py-3 hover:border-emerald-500/60 hover:bg-slate-700/50 active:bg-slate-700/60 transition-colors"
            >
              <span className="shrink-0 w-9 h-9 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25 flex items-center justify-center text-emerald-400">
                <Icon className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{label}</span>
                <span className="block text-xs text-slate-400 mt-0.5">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
