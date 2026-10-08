interface NoteHeaderBlockProps {
  title: string;
}

/**
 * The note header block: it opens the left line and carries the note title.
 * Visually distinct from headers and paragraphs — raised panel, muted eyebrow
 * and a muted diamond as the starting node on the line. Read-only.
 *
 * It is pinned to the top of the scrollable body: an opaque backdrop div sits
 * behind the panel so the blocks scroll cleanly underneath it while the panel
 * itself keeps its usual translucent design.
 */
export function NoteHeaderBlock({ title }: NoteHeaderBlockProps) {
  return (
    <article
      aria-label="Note header"
      className="sticky top-0 z-20 relative pt-1 pr-2 sm:pr-3"
    >
      {/* Opaque backing so scrolling content never shows through the panel. */}
      <div aria-hidden="true" className="absolute inset-0 bg-background" />
      <div className="relative rounded-xl border border-border/70 bg-surface/40 px-4 py-3">
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
