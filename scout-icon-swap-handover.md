# Scout — Icon Swap Handover (Map / Satellite / Recenter)

## Goal
Swap three hand-inlined SVG icons for their Lucide equivalents. Only the icon *shape* changes — every other property at each call site (size, stroke width, colour, active/hover state, button chrome) stays exactly as-is.

Reference icons — fetch the exact path data before implementing (e.g. from lucide.dev's icon page or `unpkg.com/lucide-static/icons/<name>.svg`); don't approximate from memory, the shapes need to be pixel-accurate:
- https://lucide.dev/icons/map
- https://lucide.dev/icons/map-plus
- https://lucide.dev/icons/locate

## Note on approach
Nothing on the site currently uses an icon library — every icon (search, chevron, grid, pin, etc.) is a hand-inlined raw `<svg>` at `viewBox="0 0 24 24"`, `stroke="currentColor"`. Two ways to go:

- **A — stay consistent:** copy the exact `<path>`/`<line>`/`<circle>` data from Lucide's SVG source and inline it in place of the current markup, keeping each spot's own `width`/`height`/`strokeWidth`/colour props untouched.
- **B — add `lucide-react`:** import `Map`, `MapPlus`, `Locate` as components. Cleaner long-term, but it's a new dependency for 3 icons on a codebase that hasn't used an icon library anywhere else.

Flagging this as a conscious choice rather than something that slips in as an inconsistency.

## 1. Map switch icon (the List / Grid / Map toggle)
**File:** `components/ParksDirectoryAccordion.tsx`
**Where:** inside the icon-only `ToggleButton` component's glyph switch, ~line 444–452.

Current:
```tsx
{glyph === "map" && (<><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.4" /></>)}
```
This is currently a location-pin/teardrop marker, not a folded-map shape. It's used only by the **mobile** "Map" toggle button (List | Grid | Map, ~line 339–340). Desktop uses a separate `"explore"` glyph (a split list/map panel icon) for its combined Explore button — that one is a different concept and is **not** part of this change, leave it alone.

Swap the inner shape for Lucide's "map" path data, inside the same shared `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">` wrapper that all four glyphs already share — don't change the wrapper.

## 2. Satellite toggle icon → "map-plus"
**File:** `components/ParksMap.tsx`
Two separate instances, currently identical shape, that both need updating together:
- Mobile version, ~line 535
- Desktop version, ~line 559

Current shape (mobile is `width="18" height="18"`, desktop's copy is `width="16" height="16"` — keep each spot's own size):
```tsx
<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
```
This is the button that toggles satellite imagery (`onClick={() => setSatellite(v => !v)}`, `title="Satellite"`).

## 3. Recenter icon → "locate"
**File:** `components/ParksMap.tsx`
Two separate instances:
- Mobile version, ~line 547
- Desktop version, ~line 568

Current shape (same in both, sizes 18 vs 16 as above):
```tsx
<circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
```
This is the `onClick={nearMe}` / `title="Recenter map"` button — both the always-visible button and its one-time onboarding tooltip (shown once ever, gated on `fbs-locate-tip-seen` in localStorage, copy reads "Recenter map"). Tooltip copy doesn't need to change, just the icon.

## Scope check
- Don't touch: the `"grid"` glyph, the `"list"` glyph, the `"explore"` glyph (desktop's combined toggle), the search icon, or any other icon on the site — only the 3 spots above.
- Keep each spot's existing `width`/`height`/`strokeWidth`/colour/hover-state logic exactly as-is; only the inner shape markup changes.
