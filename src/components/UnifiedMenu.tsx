import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export interface UnifiedMenuItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  danger?: boolean;
  onSelect: () => void;
}

interface UnifiedMenuProps {
  items: UnifiedMenuItem[];
  ariaLabel?: string;
  /** Classes for the ⋯ trigger button (size / hover / visibility). */
  triggerClassName?: string;
  /** Classes for the ⋯ icon. */
  iconClassName?: string;
  /** Extra classes applied to the trigger while the menu is open. */
  openTriggerClassName?: string;
  onOpenChange?: (open: boolean) => void;
}

const MARGIN = 8;
const GAP = 6;

/**
 * Unified dropdown menu used across the app (notes, folders, folder header).
 * Single style + single behaviour: portal-rendered, viewport-clamped, flips up
 * when there is no room below, closes on outside click / Escape / scroll / resize.
 */
export function UnifiedMenu({
  items,
  ariaLabel = 'Options',
  triggerClassName = '',
  iconClassName = 'w-5 h-5 sm:w-4 sm:h-4',
  openTriggerClassName = 'bg-slate-700/70 text-slate-100',
  onOpenChange,
}: UnifiedMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const close = () => setOpen(false);

  useEffect(() => {
    onOpenChange?.(open);
    if (!open) setPos(null);
  }, [open]);

  // Measure the real menu size, then clamp inside the viewport.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const t = trigger.getBoundingClientRect();
      const w = menu.offsetWidth;
      const h = menu.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const spaceBelow = vh - t.bottom;
      const openUp = spaceBelow < h + GAP + MARGIN && t.top > h + GAP + MARGIN;

      let top = openUp ? t.top - h - GAP : t.bottom + GAP;
      top = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, vh - h - MARGIN));

      let left = t.right - w;
      left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, vw - w - MARGIN));

      setPos({ top, left, openUp });
    };
    place();
    const raf = requestAnimationFrame(place);
    return () => cancelAnimationFrame(raf);
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
    };
    const onScroll = () => close();
    const onResize = () => close();
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        title={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className={`flex-shrink-0 flex items-center justify-center rounded-lg transition-colors ${triggerClassName} ${
          open ? openTriggerClassName : ''
        }`}
      >
        <MoreHorizontal className={iconClassName} strokeWidth={2.25} />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9998]"
          onPointerDown={(e) => { e.stopPropagation(); close(); }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => { e.preventDefault(); close(); }}
        >
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              visibility: pos ? 'visible' : 'hidden',
            }}
            className="w-[200px] sm:w-[180px] bg-slate-800/95 backdrop-blur-xl border border-slate-700/70 rounded-xl overflow-hidden shadow-[0_16px_44px_rgba(0,0,0,0.6)] py-1 animate-[dropdownIn_0.16s_cubic-bezier(0.34,1.4,0.64,1)_both]"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={item.id}>
                  {i > 0 && <div className="mx-2.5 my-1 h-px bg-slate-700/70" />}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      close();
                      item.onSelect();
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-sm sm:text-[13px] font-medium transition-colors ${
                      item.danger
                        ? 'text-red-400 hover:bg-red-500/10 active:bg-red-500/15'
                        : 'text-slate-100 hover:bg-slate-700/60 active:bg-slate-700/80'
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${
                        item.danger ? 'bg-red-500/15 text-red-400' : 'bg-slate-700/80 text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    {item.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
