# UnifiedSidebar top-bar animation unification

## Goal
Make the top navigation bar animation in `UnifiedSidebar` feel identical when entering a folder and when leaving it (back to All Notes or back to Folders list).

## Current state (verified in `src/components/UnifiedSidebar.tsx`)
- The two segment buttons ("All Notes" / "Folders") animate via `transition-[flex-basis,flex-grow,background-color,color] duration-200 ease-out`.
- The folder badge is rendered conditionally (`insideFolder && crumbInfo`) and uses `animate-fade-in` (≈300 ms keyframe).
- Entering a folder: buttons shrink over 200 ms + badge fades in over ~300 ms.
- Leaving a folder: badge unmounts instantly, buttons grow over 200 ms.
- Result: the animation is asymmetric and feels slow on enter, fast on exit.

## Proposed solution
Adopt a single, subtle state-transition animation instead of a layout-morphing one.

1. **Keep three slots always in the DOM** in `SidebarNavBar`:
   - Slot 1: All Notes button
   - Slot 2: Folders / back button
   - Slot 3: folder badge
2. **Folder badge visibility**: replace conditional unmount with always-rendered markup controlled by `opacity`, `max-width`, and `pointer-events`. Apply `transition-[opacity,max-width] duration-150 ease-out`. This makes enter/exit symmetric.
3. **Segment buttons**: remove the `flex-basis`/`flex-grow` morphing. Use fixed widths (e.g. `flex-1` outside a folder, `w-10` inside a folder) and transition only `background-color`, `color`, and `opacity` over `duration-150`. No width/scale transition on the icons themselves.
4. **Unify duration**: set every transition in the top bar to `150ms`.
5. **Remove `animate-fade-in`** from the badge; rely on the symmetric CSS transition instead.
6. **Add `will-change-transform`** to the badge and buttons to avoid composite flicker.
7. **Keep focus styles** (`focus-visible:ring-...`) but avoid any `active:scale`, `transition-all`, or icon-level transforms that caused earlier flicker.

## Files to change
- `src/components/UnifiedSidebar.tsx` — refactor `SidebarNavBar` slot rendering and transitions.
- `src/index.css` — only if a tiny helper class is needed for the badge max-width transition.

## Validation
- Run `tsgo` for type safety.
- Run dev preview and manually test: enter a folder, then go back to All Notes, then enter a folder again and go back to Folders list. The top bar should animate with the same speed and easing in all four transitions.
