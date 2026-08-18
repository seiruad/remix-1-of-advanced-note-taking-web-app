# Mobile-first empty paragraph hint

## Goal
Make the empty-paragraph prompt in the note editor easier to use on mobile while keeping the inline hint style the user prefers.

## Current state
`src/components/paragraphs/ParagraphBlock.tsx` renders the hint as a sentence with a small inline text link:

```
Write text or [attach a file]
```

The "attach a file" text link has a small tap target and no icon, which is hard to hit on mobile.

## Changes

1. **Prominent inline attach action**
   - Replace the "attach a file" text link with a compact but tappable icon-button (paperclip icon) inside the hint line.
   - Keep the text "Write text or" next to the icon, so the prompt stays a single inline sentence.

2. **Larger touch targets**
   - Make the icon button at least 44×44 px on mobile (`min-w-11 min-h-11` or equivalent).
   - Add clear spacing between the text and the button so the hit area does not overlap the editor focus area.

3. **Responsive sizing**
   - On desktop: keep the current compact inline look.
   - On mobile: slightly enlarge the hint text and icon so the prompt is readable and tappable without zooming.

4. **Visual consistency**
   - Use the same slate/emerald palette already used in `UnifiedSidebar` and `StoragePage`.
   - Icon color matches the existing file-chip icon color (`text-slate-400` / `text-emerald-400` on hover/focus).
   - Add a subtle focus-visible ring so keyboard users can see the attach button.

5. **Accessibility**
   - Add `aria-label="Attach file to paragraph"` to the icon-only button.
   - Preserve the existing paragraph menu and editor focus behavior.

## Files to edit
- `src/components/paragraphs/ParagraphBlock.tsx`

## Out of scope
- No changes to paragraph data model or `useNoteParagraphs`.
- No changes to the attach file dialog itself (`AttachFileDialog.tsx`).
- No changes to non-empty paragraphs or file chips.
