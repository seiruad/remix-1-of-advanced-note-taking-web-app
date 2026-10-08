# Paragraph blocks: add a three-dots circle at the upper-right corner

## What changes

Every paragraph block (the blocks with text and/or attached files — not headers) gets a second three-dots circle, placed at the upper-right corner of the block, right where its content begins.

The circle already sitting on the vertical line at the right stays exactly where it is. Nothing else about the note changes: text, file chips, headers, spacing, and the right line all stay as they are now.

```text
                        ┌──────────────────────────────────────────┐
  Paragraph text line   ─────────────────────────────────  [⋯] │ ● │
  continues here ...                                           ─────────
  attached file chips  [file.pdf] [+]                                │
                                                     (new circle) (line circle)
```

- The new circle looks identical to the one on the line: same size, same round shape, same three dots, same hover behaviour.
- It opens the same menu: Edit, Move (still disabled), Delete.
- It appears only in paragraph blocks, and only when the note can be edited. Header blocks keep their small button after the title and nothing on the line.

## How it is built

- `src/components/paragraphs/ParagraphBlock.tsx` — in the paragraph branch, the content (text + file chips) goes into a row: the content column takes the remaining width, and the new circle sits at its top-right (`flex items-start`, circle `shrink-0`, aligned to the first line). Because the circle is part of the layout instead of floating over the text, a long first line of text simply wraps and never runs under it.
- The existing right-line circle and its position (`right-5 top-2`) are untouched, as is the continuous vertical line and all block spacing.
- The circle reuses the shared `UnifiedMenu` with the same three actions, so both circles on a block behave identically.
- Empty blocks and the "Header / Write text / Attach file" hint row at the bottom are unaffected — the circle appears only on real, non-empty paragraph blocks.
- The paragraph-presentation memory entry is updated so this rule (circle at the block's upper-right corner, plus the line circle) is kept in future changes.

## Verification

- Code check and build must stay clean.
- Live check in the app: open the test note, confirm each paragraph block shows two circles (one at its upper-right corner, one on the line), each opening the same menu, and header blocks still show only their button after the title.
