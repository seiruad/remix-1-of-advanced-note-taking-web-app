import { useState } from 'react';
import { Check, Pencil } from 'lucide-react';

interface NoteHeaderBlockProps {
  title: string;
  canEdit?: boolean;
  onTitleChange?: (title: string) => void;
}

/**
 * The note header block: it opens the left line and carries the note title.
 * Visually distinct from headers and paragraphs — raised panel, muted eyebrow
 * and a muted diamond as the starting node on the line.
 *
 * It is pinned to the top of the scrollable body: an opaque backdrop div sits
 * behind the panel so the blocks scroll cleanly underneath it while the panel
 * itself keeps its usual translucent design.
 *
 * The small slate edit button is absolutely positioned in the panel's bottom
 * left corner, level with the title, so it never changes the panel's size;
 * clicking it overlays an inline field exactly on top of the title and the
 * button itself turns into a check (save) button of the same size.
 */
export function NoteHeaderBlock({
  title,
  canEdit = false,
  onTitleChange,
}: NoteHeaderBlockProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  const startEditing = () => {
    setDraft(title);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== title) onTitleChange?.(next);
  };

  return (
    <article
      aria-label="Note header"
      className="sticky top-0 z-20 pt-1 pr-2 sm:pr-3"
    >
      {/* Opaque backing so scrolling content never shows through the panel. */}
      <div aria-hidden="true" className="absolute -top-6 -left-6 -right-6 bottom-0 bg-background" />
      <div className="relative rounded-xl border border-border/70 bg-surface/40 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.18em] font-medium leading-none text-muted-foreground/80">
          Note
        </p>
        {/* The title stays in the layout even while editing, so the panel
            never changes size; the input is overlaid exactly on top of it.
            It is indented to make room for the edit button on its left. */}
        <h2
          className={`mt-2 pl-7 text-2xl font-bold leading-tight break-words text-foreground ${
            editing ? 'invisible' : ''
          }`}
        >
          {title.trim() || 'Untitled'}
        </h2>
        {editing && (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setEditing(false);
              }
            }}
            onBlur={commit}
            aria-label="Note title"
            placeholder="Untitled"
            className="absolute right-4 bottom-[7px] left-11 h-10 border-0 bg-transparent p-0 text-2xl font-bold leading-normal text-foreground outline-none"
          />
        )}
        {canEdit && (
          <button
            type="button"
            onMouseDown={(e) => {
              // While editing, keep focus on the field so the click commits
              // instead of the field's blur firing first.
              if (editing) e.preventDefault();
            }}
            onClick={editing ? commit : startEditing}
            aria-label={editing ? 'Save note title' : 'Edit note title'}
            title={editing ? 'Save title' : 'Edit title'}
            className="absolute left-2 bottom-[15px] flex h-6 w-6 items-center justify-center rounded-md border border-border/70 bg-surface/60 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            {editing ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
          </button>
        )}
      </div>
    </article>
  );
}
