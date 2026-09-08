# Scout — Parks Nav Bar Follow-up (padding + card-crop bug)

Follow-up to `scout-parks-navbar-handover.md`, after reviewing the implemented result live. Most of that handover landed well — the count, the search-dropdown replacing List, the relabeled toggle, and the icon swap are all in and working. Two things need fixing.

## 1. Search field / toggle / list column are flush to the true edge — should be inset
**File:** `components/ParksDirectoryAccordion.tsx`

Confirmed by reading the current source: `.pda-bar-head-wide`, `.pda-desktop-bar-row`, and `.pda-search-field-wide` all apply `margin-left`/`margin-right: calc(var(--pda-gutter) * -1)`, and the Explore wrapper around `<ParksMap>` gets `margin: 0 calc(var(--pda-gutter) * -1)` too — deliberately, per the code comments, to align the search field, the toggle, and the list column flush with the map's full-bleed edge.

That's not what was wanted. The site's own established rule (already locked elsewhere) is **full-bleed imagery, contained UI chrome** — the map's tile imagery can run edge-to-edge, but the search field, the toggle, and the list column are UI/text chrome and should keep the outer gutter, not cancel it. The previous handover's "use padding/gutter instead of boxed cards" note apparently got read as license to zero out the gutter entirely (to match the map) rather than to soften the box styling while keeping an outer margin — that ambiguity is on the brief, not a misread.

**Fix:** remove the negative-margin cancellation on `.pda-bar-head-wide`, `.pda-desktop-bar-row`, and `.pda-search-field-wide`, and on the Explore wrapper's `margin: 0 calc(var(--pda-gutter) * -1)` around `<ParksMap>` — let the header row and the list column sit inset by `--pda-gutter` from the viewport edge, same as the rest of the page's contained UI chrome. The map canvas itself (the Leaflet container, not the list column beside it) can stay full-bleed within its own box — that part was correct.

## 2. Floating park detail card's bottom edge is cropped
**File:** `components/ParksMap.tsx` — `splitCard` (desktop, ~line 422–445) and likely `floatingCard` (mobile, ~line 376–418) share the same structure.

Confirmed live on `localhost:3000/parks` via DOM inspection, not a build/cache issue:
- The card's containing box (the flex row wrapping the list column + map, `overflow: hidden`) had its bottom edge at `y = 765`.
- The card itself, positioned `bottom: 12px` inside it, measured `bottom: 785.6` — **~20px past the clipping container's edge**, so the bottom of the card (where the "View park" CTA sits) is being cut off by the container's `overflow: hidden`.
- Oddity worth checking: even ~1.2s after mount (well past the 0.32s `fbs-split-in` entrance animation), the card's computed `transform` was still `translateY(32.6px)`, not the `translateY(0)` the animation's `to` keyframe should have settled on. That residual offset is what's pushing the card past the edge. Worth checking whether the inline `animation: fbs-split-in ... both` on the card is retriggering on re-render — `ParksMap`'s `<style>` block and the card's inline `style` object are both recreated every render (React re-evaluates the JSX object literal each time), which in some cases causes a CSS animation assigned inline to restart rather than hold its finished state. If that's the cause, pulling the keyframe assignment out to a stable class (only toggled via `slideDir`/a key, not re-declared inline every render) should stop the drift.

**Fix:** two independent things to address — (a) make sure the card's own height can never exceed the space actually available in its container regardless of any transform (e.g. `max-height: calc(100% - 24px)` with internal scroll on the card, so worst case it scrolls rather than clips), and (b) find and fix why the transform isn't settling at 0 after the entrance animation, so the card sits where `bottom: 12px` actually says it should.

## Scope check
Nothing else from the original handover needs touching — this is specifically the gutter fix and the card-crop bug.
