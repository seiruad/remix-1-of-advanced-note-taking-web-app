# Headers as their own blocks

Every block in a note becomes one of two types:
1. **Header**: a single line of heading text, with no body and no files.
2. **Paragraph**: body text and/or files, with no heading.

## What the user sees
- **Header block:** a bold line of heading text with the same right-side line and round menu (Edit / Move (disabled) / Delete). Edit opens a small popup that has only a heading field.
- **Paragraph block:** looks like it does now, minus the heading. The edit popup loses its Heading field and keeps Text and Attachments.
- **Adding a block:** the trailing row at the bottom of the note gets a third button, "Header", next to "Write text" and "Attach file". It creates a header block and opens its popup.
- **Empty blocks:** a header left empty is removed when its popup closes, the same way empty paragraphs are removed now.

## Existing notes
- Each paragraph that has a heading is split in two. The heading becomes a header block placed just above it, and the paragraph keeps its text and files. If nothing is left in the paragraph after the split, only the header stays.
- The order of blocks in the note is kept.

## Technical details
- Migration: add a `kind text not null default 'paragraph'` column with a check for 'header' or 'paragraph' to `note_paragraphs`. Rewrite positions so that every existing heading gets its own `kind='header'` row (heading → `heading`, empty content) inserted before its source row, then set `heading = null` on the source rows. Remove source rows that end up empty.
- `useNoteParagraphs`: add `kind` to `NoteParagraph`, add `createHeader(afterIndex)`, and keep `setHeading` for header rows only.
- `ParagraphBlock`: render a header layout when `kind==='header'`. File attaching is off for headers.
- `ParagraphEditWindow`: switch the layout by kind (heading-only for headers; text and attachments for paragraphs).
- `ParagraphList`: add the "Header" trailing button, apply kind-aware empty checks for the visibility filter and auto-delete, and keep the attach flow for paragraphs only.
- Record the rule in AGENTS.md: blocks are typed (header | paragraph) and never mix heading with body.
