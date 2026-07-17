# Refactor: UnifiedSidebar middle section (v2)

Scope: only the block between the Workspace header and the Storage footer in `src/components/UnifiedSidebar.tsx` (component `SidebarNavBar`, ~lines 603–985). No business logic changes.

## What's wrong today

1. **Uneven vertical rhythm** — nav-row is `h-11` with `px-2`, desktop search sits in a separate block with `px-3 pb-2.5 pt-0.5`, mobile adds a random `h-2` spacer. Gutters and heights don't line up with the workspace header above or list rows below.
2. **Two visual languages in one strip** — segmented toggle uses `bg-slate-900/50` pill with inner `rounded-[9px]`; the breadcrumb variant is flat text with a dot; the `+` button is a solid emerald square. Three different shapes, three different weights, all on the same 44px row.
3. **Mobile awkwardness** — mobile search opens as an absolute overlay covering the toggle, which feels like a modal, not a control. Icon-only search button (`w-10`) sits next to a `w-10` emerald button with only `gap-1.5` — cramped.
4. **Breadcrumb overloaded** — inside a folder the single row carries: back button + "Folders" label + `/` + dot + name + New badge + `· count` + `⋯` + (right side) search icon + `+`. Nine elements on a 44px mobile row. Truncation hits the folder name first — the most important item.
5. **Desktop-only search** wastes a full row (~42px) even when unused; no visual separation from the nav row makes it read as a second, competing input area.

## New structure

Two clean rows on mobile, one row on desktop. Consistent `px-3`, consistent `h-11`, consistent `rounded-xl`, one accent color (emerald) reserved for the primary action only.

```text
MOBILE (< sm)                              DESKTOP (>= sm)
┌───────────────────────────────────────┐  ┌───────────────────────────────────────┐
│ [All Notes | Folders]        🔍  [+] │  │ [All Notes | Folders]  [ search… ] [+]│
├───────────────────────────────────────┤  └───────────────────────────────────────┘
│ [ search…                          ✕ ]│     (single row, search inline)
└───────────────────────────────────────┘
```

Inside a folder, the toggle slot is replaced by a compact breadcrumb of the **same height and shape** as the toggle — so the row's silhouette never jumps:

```text
┌───────────────────────────────────────┐
│ [‹  ● Folder name · 4     ⋯]   [+]   │
└───────────────────────────────────────┘
```

### Row 1 — Nav row (always visible, `h-11`, `px-3`, `gap-2`)

- **Left slot** (flex-1, `h-9`, `rounded-xl`, `bg-slate-900/40`):
  - Default: segmented `All Notes | Folders`, each half `rounded-lg`, active = `bg-slate-700 text-emerald-400`.
  - Inside folder: breadcrumb pill using the *same* container — `‹` back (36×36 tap area), colored dot, folder name (truncate), `· count` tabular-nums, `⋯` menu. "New" badge only if folder was just created. Removes the `/` separator and the redundant "Folders" label (back arrow already means "up").
- **Right slot**:
  - Mobile: `🔍` toggle (36×36) + `+` primary (36×36 emerald `rounded-xl`).
  - Desktop: inline search input (flex-basis ~180px, `h-9`, `rounded-xl`) + `+` primary (36×36).
- Gap between left and right = `gap-2`. Both buttons align on the same optical baseline as the toggle/breadcrumb (all `h-9`).

### Row 2 — Mobile search (conditional, `h-11`, `px-3`, `pb-2`)

- Renders in flow (not absolute overlay) when `searchOpen || searchQuery` is true.
- Full-width `h-9 rounded-xl` input with leading search icon and trailing `✕`.
- Smooth height transition (CSS, no libs) so opening feels like the row grows rather than a modal appearing.

### Divider

- Single `border-b border-slate-700/50` under whichever row is last visible. Remove the `sm:hidden h-2` spacer.

## Visual tokens (unchanged palette, tightened usage)

- Surfaces: `bg-slate-800` (strip), `bg-slate-900/40` (inset controls).
- Text: `text-slate-100` active, `text-slate-400` idle, `text-slate-500` meta/count.
- Accent: emerald reserved for (a) active toggle text, (b) the `+` button, (c) focus ring. Folder dot colors (emerald / amber / slate) stay as the only other hue and shrink to `w-2 h-2`.
- Radii: `rounded-xl` for containers and primary button, `rounded-lg` for inner segments — consistent scale.
- All interactive elements: min 36×36 tap target on mobile, 32×32 on desktop where space is tight, always with `active:` state.

## Behavior (unchanged)

- Mode persistence, `+` popover in folders-list mode, breadcrumb `⋯` Rename/Delete, "No Folder" italic + slate dot, "New" amber badge — all preserved as-is. This is a presentation-only pass.

## Technical notes

- Edit only `SidebarNavBar` in `src/components/UnifiedSidebar.tsx` (lines ~603–985).
- Replace the current three-region JSX (nav-row / desktop-search / mobile-overlay) with the two-row structure above.
- Remove the mobile absolute-overlay branch and the `h-2` spacer.
- Keep all props, refs, popovers, portals, and handlers identical.
- No changes to `UnifiedSidebar` root, folder rows, note rows, workspace header, or storage footer.
