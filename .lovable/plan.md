# Header blocks get a special "T"-shaped menu button after the text

## What changes

Header blocks (bold title rows) currently use the same circular three-dots button as paragraphs, pinned to the vertical line at the top of the block. That changes for headers only:

1. **New trigger design** — the circle with three dots is replaced by a **T-shaped button**: a horizontal bar on top with a short stem going down (like the end/cap of the vertical line folding into the header). Small custom SVG, roughly the same footprint as the paragraph button (≈24px hit area), muted color, same hover treatment.
2. **New placement** — for headers the button is **not** on the vertical line anymore. It sits **inline, right after the header text** (small gap, vertically centered with the text line).
3. **Same options** — tapping it opens the same menu: Edit, Move (disabled), Delete. Same edit/delete behavior, no logic changes.
4. **Paragraphs unchanged** — paragraph blocks keep the existing circle-with-dots on the line at the top of the block. The continuous vertical line stays exactly as it is; headers simply no longer put a circle on it.

## Files touched

- `src/components/paragraphs/ParagraphBlock.tsx` — only place that renders the block menu. Branch by `paragraph.kind === 'header'`:
  - header: render the T-trigger inline in the header row (flex row: `h3` text, then the menu button) instead of the absolutely-positioned circle.
  - paragraph: keep the current `absolute right-5 top-2` circle.

## Verification

- Typecheck (`bunx tsgo --noEmit`) and build log clean.
- Playwright check on a live note with headers: headers show the T-shaped button right after the text; paragraphs still show the circle on the line; opening the menu on a header shows Edit / Move / Delete and Edit opens the header popup.
