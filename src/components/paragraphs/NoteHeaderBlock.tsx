import { useState } from 'react';
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
 *
 * It is pinned to the top of the scrollable body: an opaque backdrop div sits
 * behind the panel so the blocks scroll cleanly underneath it while the panel
 * itself keeps its usual translucent design.
 *
 * The small slate edit button is absolutely positioned inside the panel, so it
 * never changes the panel's size; clicking it swaps the title for an inline
 * field with identical typography.
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
      <div className="relative rounded-xl border border-border/70 bg-surface/40 pl-10 pr-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.18em] font-medium leading-none text-muted-foreground/80">
          Note
        </p>
        {editing ? (
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
            className="mt-2 w-full border-0 border-b border-transparent bg-transparent p-0 text-2xl font-bold leading-tight text-foreground outline-none focus:border-border/70"
          />
        ) : (
          <h2 className="mt-2 text-2xl font-bold leading-tight break-words text-foreground">
            {title.trim() || 'Untitled'}
          </h2>
        )}
        {canEdit && !editing && (
          <button
            type="button"
            onClick={startEditing}
            aria-label="Edit note title"
            title="Edit title"
            className="absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md border border-border/70 bg-surface/60 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
    </article>
  );
}
