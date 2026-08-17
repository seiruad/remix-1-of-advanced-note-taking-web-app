# Redesign folder rows in UnifiedFolderList

## Goal
Update the folder list item in `UnifiedFolderList` so the note count moves under the folder name and the overall style better matches `UnifiedSidebar` / note cards, while keeping the icon and three-dots menu.

## Requirements (confirmed)
1. **Count placement**: show a compact subtitle under the folder name, e.g. "3 notes" / "No notes" / "1 note".
2. **Row height**: use a comfortable two-line row (similar to note cards) instead of a single compact line.
3. **Icon background**: remove or significantly lighten the solid square background behind the folder icon.
4. **Hover state**: align the hover background with note cards (`hover:bg-slate-700/40` style).
5. **Special folder colors**: refine "No Folder" and newly-created folders so their accents are subtler and consistent with the rest of the UI.
6. **Preserve**: folder icon, three-dots `UnifiedMenu` trigger, rename-on-create behavior, and all existing callbacks.
7. **Mobile-first**: maintain adequate touch targets (min 44px where possible) and verify on the 360px viewport.

## Implementation steps
1. Refactor `FolderRowFlat` in `src/components/UnifiedFolderList.tsx`:
   - Layout: icon on the left, text column (name + subtitle) in the middle, menu trigger on the right.
   - Remove the current right-side numeric badge.
   - Compute `countLabel` based on the number of notes in the folder.
   - Adjust icon container: remove heavy background, keep a subtle tint or transparent style.
   - Increase vertical padding to give the two-line layout room.
   - Unify hover/active backgrounds with note-card equivalents.
   - Keep the `UnifiedMenu` trigger sizing/alignment from `UnifiedNoteList`.
2. Update the "No Folder" row in the same file to match the new two-line style and remove its remaining gray background/left bar.
3. Add/adjust CSS only if needed (prefer Tailwind classes in the component; minimal additions to `src/index.css`).
4. Verify:
   - TypeScript compiles.
   - Mobile viewport (360px) shows readable two-line rows and tappable menu triggers.
   - Desktop viewport keeps visual consistency.
   - Rename-on-create still works and does not trigger folder selection.

## Out of scope
- No changes to folder creation, deletion, or rename logic.
- No changes to the folder header inside a folder (`SidebarNavBar`).
- No changes to note cards or `UnifiedNoteList`.
