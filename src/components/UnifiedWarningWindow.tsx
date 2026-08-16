import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export interface UnifiedWarningWindowProps {
  open: boolean;
  title: string;
  /** Body text / description. Can be a string or rich content. */
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' (default) = red confirm, 'primary' = emerald confirm. */
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Unified confirmation / warning dialog used across the app.
 * Mobile-first: bottom sheet on small screens, centered card on desktop.
 * Styling matches UnifiedSidebar / UnifiedMenu (slate glass + accent).
 */
export function UnifiedWarningWindow({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}: UnifiedWarningWindowProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onCancel]);

  if (!open) return null;

  const accent =
    tone === 'danger'
      ? {
          ring: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/25',
          confirm: 'bg-red-600 hover:bg-red-500 active:bg-red-600 text-white shadow-[0_6px_18px_rgba(220,38,38,0.35)]',
        }
      : {
          ring: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25',
          confirm:
            'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-600 text-white shadow-[0_6px_18px_rgba(5,150,105,0.35)]',
        };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out_both]"
      onPointerDown={onCancel}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm sm:mx-4 bg-slate-800/95 backdrop-blur-xl border-t border-slate-700/70 sm:border rounded-t-2xl sm:rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.65)] px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 animate-[dropdownIn_0.18s_cubic-bezier(0.34,1.4,0.64,1)_both]"
      >
        {/* Grab handle (mobile) */}
        <div className="sm:hidden mx-auto mb-4 h-1 w-10 rounded-full bg-slate-600/70" />

        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-3 sm:mb-4 ${accent.ring}`}>
            <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <h2 className="text-[17px] sm:text-lg font-semibold text-white mb-1.5">{title}</h2>
          {description && (
            <p className="text-[13.5px] sm:text-sm leading-relaxed text-slate-400 mb-5 sm:mb-6">{description}</p>
          )}

          <div className="flex gap-2.5 sm:gap-3 w-full">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-700/70 hover:bg-slate-600/80 active:bg-slate-600 text-slate-200 text-[15px] sm:text-sm font-semibold transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 px-4 py-3 rounded-xl text-[15px] sm:text-sm font-semibold transition-colors ${accent.confirm}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
