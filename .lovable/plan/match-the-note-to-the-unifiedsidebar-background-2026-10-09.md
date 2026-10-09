# Match the note to the UnifiedSidebar background

## Goal
Give the note reading area the same solid slate surface used by the UnifiedSidebar, then rebalance the note’s internal colors so its hierarchy and controls remain clear on that lighter background.

## Changes
- Change the note canvas and its empty state from the current translucent dark surface to the sidebar’s solid background color.
- Add semantic note-surface roles to the existing color system rather than scattering new hardcoded colors through the note components.
- Update the sticky title block’s opaque backing, panel surface, border, eyebrow, title, title field, and edit/save button for the new canvas while preserving its current size, position, and sticky behavior.
- Rebalance the reading blocks: paragraph text, header text, left timeline, paragraph menu circles, header menu button, and the diamond around the Add block control.
- Rebalance inline attachment pills and their icons/actions so they remain visibly separate from the note canvas.
- Keep the solid emerald Add block tile and all existing layout, spacing, behavior, editing windows, and attachment flows unchanged.

## Verification
- Check the open note at desktop and phone widths for readable contrast and clear separation between canvas, title panel, blocks, attachments, and controls.
- Confirm the sticky title remains fully opaque while content scrolls underneath, and no line or control positions move.
- Confirm the preview builds without errors.

## Technical details
The UnifiedSidebar currently uses a solid `slate-800` background, while the note canvas uses translucent `slate-900/60`. The note will receive a matching semantic background token, with related semantic surface/border/muted roles applied only within the note presentation so other screens are not recolored.
