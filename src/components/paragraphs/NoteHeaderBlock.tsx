interface NoteHeaderBlockProps {
  title: string;
}

/**
 * The note header block: it opens the left line and carries the note title.
 * Visually distinct from headers and paragraphs — raised panel, accent eyebrow
 * and an accent diamond as the starting node on the line.
 */
export function NoteHeaderBlock({ title }: NoteHeaderBlockProps) {
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
