import { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';

interface NoteHeaderBlockProps {
  title: string;
  canEdit?: boolean;
  onTitleChange?: (title: string) => void;
}

/**
 * The note header block: it opens the left line and carries the note title.
 * Visually distinct from headers and paragraphs — raised panel, muted eyebrow
 * and a muted diamond as the starting node on the line.
 * When editable, a small pencil button swaps the title to an inline input.
 */
export function NoteHeaderBlock({ title, canEdit, onTitleChange }: NoteHeaderBlockProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setValue(title);
  }, [title, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = value.trim();
    if (next && next !== title.trim()) onTitleChange?.(next);
    else setValue(title);
  };

  return (
    <article
      aria-label="Note header"
      className="relative pl-12 pr-2 sm:pr-3 pt-1 pb-4"
    >
      {/* Starting node: the line begins here, so the diamond masks the rail behind it. */}
      <div
        aria-hidden="true"
        className="absolute left-5 top-[22px] -translate-x-1/2 -translate-y-1/2"
      >
          <span className="block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-border ring-4 ring-background" />
        </div>

        <div className="rounded-xl border border-border/70 bg-surface/40 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.18em] font-medium leading-none text-muted-foreground/80">
              Note
            </p>
            {canEdit && onTitleChange && !editing && (
              <button
                type="button"
                aria-label="Edit note title"
                title="Edit title"
                onClick={() => { setValue(title); setEditing(true); }}
                className="w-7 h-7 -mr-1 -mt-1 flex items-center justify-center rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-border/40 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setValue(title); setEditing(false); }
            }}
            onBlur={commit}
            className="mt-2 w-full bg-transparent border-b border-border/80 focus:border-primary outline-none text-2xl font-bold leading-tight break-words text-foreground pb-0.5"
          />
        ) : (
          <h2 className="mt-2 text-2xl font-bold leading-tight break-words text-foreground">
            {title.trim() || 'Untitled'}
          </h2>
        )}
      </div>
    </article>
  );
}
