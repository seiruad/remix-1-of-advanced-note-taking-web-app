# Header blocks get a second three-dots circle right after the header text

## What changes

Header blocks currently have only the circular three-dots button on the vertical line at the top-right of the block. For headers only, a **second** circle-with-three-dots button is added **inline, right after the header text** (small gap to the right of the text, vertically centered with the text line).

1. **New inline button** — a circle with three dots, same look and size as the existing one (24px circle, 12px icon, muted color, same hover treatment). Tapping it opens the same menu: Edit, Move (disabled), Delete.
2. **Right-line circle stays** — the existing circle on the vertical line remains exactly as it is, for headers and paragraphs alike. Headers temporarily have both buttons; nothing is removed.
3. **Nothing else changes** — paragraphs, spacing, the continuous vertical line, and all existing behavior stay untouched.

## Files touched

- `src/components/paragraphs/ParagraphBlock.tsx` — for `paragraph.kind === 'header'`, wrap the `h3` and the new inline menu in a flex row (`h3` text, then the circle button); keep the existing absolute right-line menu untouched for all block kinds.

## Verification

- Typecheck (`bunx tsgo --noEmit`) and build log clean.
- Playwright check on a live note with headers: each header shows a small circle with three dots right after its text; the right-line circle is still present on every block; the inline menu opens with Edit / Move / Delete.
