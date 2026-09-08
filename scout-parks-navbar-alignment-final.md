# Scout — Parks Nav Bar: Final Alignment Fix

Supersedes the padding section of `scout-parks-navbar-followup.md` (the card/zoom-crop section there still applies — this doc adds the precise fix and a visual reference for it). Confirmed against the live `localhost:3000/parks` build at both desktop (1280px) and a narrow (~474px) width, and against Nav's own source.

**Visual reference (exact, to match pixel-for-pixel):** https://claude.ai/code/artifact/8c3f2601-9ec8-4909-830c-ebf44e3f766b — "Main" artboard is the corrected desktop layout with dashed guide lines showing the shared alignment edge; "ShortViewport" artboard shows the card/zoom-control fix on a short window.

## The gutter value — use Nav's own token, not a hardcoded number
**File:** `components/Nav.tsx`, line ~171: `paddingLeft/Right: "clamp(16px, 4vw, 56px)"` — this is the real inset the logo, PARKS/ABOUT links, and dark/light toggle already sit on.

**File:** `components/ParksDirectoryAccordion.tsx`, line ~146: `--pda-gutter: 24px` — this is what's wrong. It's a flat value, so it drifts from Nav's fluid one at every width except by coincidence. Measured live: at 1280px Nav's inset is 51.2px vs the bar's 24px (or 0, where the negative-margin cancellations from the previous handover are still in place); at ~474px Nav's inset is ~19px vs the bar's 24px — close enough to look "nearly right" and far enough to visibly misalign, which is exactly what showed up in the screenshots (logo vs "Parks · N places", and the Explore/Grid pill vs the dark/light toggle).

**Fix:** set `--pda-gutter: clamp(16px, 4vw, 56px)` — the identical expression Nav uses — instead of `24px`, and remove the negative-margin cancellations on `.pda-bar-head-wide`, `.pda-desktop-bar-row`, `.pda-search-field-wide`, and the Explore wrapper around `<ParksMap>` (per the previous handover). With both changes, the count line, the search field, the toggle, and the list column will track Nav's inset exactly at every viewport width, not just the one it was eyeballed against.

## Map overlay controls — share the toggle's right edge too
The satellite/locate button pair and the zoom +/− control are overlay UI floating on top of the map, not part of the map's own imagery — they should share the same right edge as the Explore/Grid toggle and the dark/light toggle above them (`right: var(--pda-gutter)` off the map canvas's true right edge, which is the same edge since the map itself stays full-bleed), not their own smaller fixed inset. Updated in the canvas reference above.

## Card + zoom control — must never run past the visible area
Confirmed again live: the floating detail card's "View park" CTA and the map's +/− zoom control are both being cut off at the bottom, at multiple window sizes. Same root cause as before (a fixed `bottom: 12px` offset with no guarantee of clearance) — see `scout-parks-navbar-followup.md` for the transform/animation lead. The "ShortViewport" artboard in the canvas above shows the intended fix: on a short window the card drops its thumbnail and condenses to a single row (name + CTA) so it always clears the bottom edge with room to spare, rather than assuming its full-height layout always fits.

## Scope check
Same as before — this is the gutter/crop fix only, nothing else in the nav bar or list/map behaviour changes.
