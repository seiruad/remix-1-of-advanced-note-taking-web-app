// ============= Full file contents =============

interface NoteHeaderBlockProps {
  title: string;
}

/**
 * The note header block: it opens the left line and carries the note title.
 * Visually distinct from headers and paragraphs — raised panel, muted eyebrow
 * and a muted diamond as the starting node on the line. Read-only.
 */
export function NoteHeaderBlock({ title }: NoteHeaderBlockProps) {
  return (
    <article
      aria-label="Note header"
      className="pt-1 pr-2 sm:pr-3"
    >
      <div className="rounded-xl border border-border/70 bg-surface/40 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.18em] font-medium leading-none text-muted-foreground/80">
          Note
        </p>
        <h2 className="mt-2 text-2xl font-bold leading-tight break-words text-foreground">
          {title.trim() || 'Untitled'}
        </h2>
      </div>
    </article>
  );
}
