# Scout — Parks Page Nav Bar & Layout Handover

Companion to `scout-icon-swap-handover.md` (same toggle component, icon work) — read that one too, the "map" glyph swap it describes is part of the same toggle this doc reworks.

## Context
Working from a reference mockup for the Parks list/map/grid page. Scope is deliberately subtle — margin/gutter and functionality tweaks, not a rebuild. The reference mockup's logo and "PARK GUIDE · LONDON" tag are not Scout branding; ignore them, it's a structural reference only.

## 1. Nav bar: park count + relabeled toggle
**File:** `components/ParksDirectoryAccordion.tsx`, header bar ~line 317–364, `ToggleButton` ~line 429–455.

- Add a count next to "Parks" — e.g. "Parks · 24 places" — sourced from whichever park array is authoritative at that point (`displayedParks`/`filteredParks`, check which is in scope at the header).
- `ToggleButton` currently renders icon-only with `aria-label`/`title` for a11y, no visible text (see the comment above it: "the glyphs are the only thing on screen"). Add a visible label next to the glyph, matching the reference's pill-with-icon-and-word style, for both mobile and desktop toggle rows.

## 2. Mobile: drop the List tab, fold it into search
Confirmed direction: mobile currently offers a three-way **List | Grid | Map** (~line 334–341, `glyph="list"/"grid"/"map"`). Cut this to a two-way **Map | Grid**, matching what desktop already effectively has (`Explore`/`Grid`, ~line 356–361) — so mobile and desktop converge on the same two-mode shape, just Map replacing Explore as the label/icon.

List's actual job — jump straight to a named park via text — moves into the search field itself: typing into search should show a dropdown/autocomplete of matching results (text rows, park name + area) that let you jump directly to a park, rather than requiring a separate persistent tab.

**This interaction isn't fully spec'd yet** — needs a decision before building: does selecting a dropdown result open the park directly on the Map (centered + selected, same as tapping a pin), or take the user straight to the park page? Does the dropdown overlay the current Map/Grid content or replace it while open? Get that nailed down (in conversation or a quick follow-up mockup) before this part goes into code.

**Investigate before removing anything:** trace `showMap` and the accordion `Row`-based list branch (`{showMap ? <ParksMap .../> : <div>{displayedParks.map(park => <Row .../>)}</div>}`, ~line 390–417) — that Row/accordion branch looks like it's specifically the mobile "List" mode's rendering path, separate from `ParksMap.tsx`'s own internal desktop split-list column (`.pms-index-list`). If so, once List is dropped this whole branch may become dead code worth removing — but confirm `showMap`'s actual definition and whether desktop ever hits the `Row` branch too before deleting anything.

## 3. Search field — visual integration only
Purely a layout/spacing tweak, not a functional change (confirmed): the search field currently reads as slammed up against the logo/site edge. Give it breathing room / positioning so it feels integrated with the content below rather than floating loose against the header edge — no behavioural change to search itself (aside from the dropdown work in #2).

## 4. Drop the fixed "Nearby Parks" section title
The reference mockup shows a "Nearby parks" heading over the list column. Don't carry that over — not every state of that list (full directory, search results, etc.) fits a "nearby" framing. The list column currently has no fixed heading in the code as it stands; keep it that way, or if a heading is added it needs to be state-aware rather than a hardcoded string.

## 5. Layout: padding/gutter, not bordered boxes
The reference uses bordered white rounded-corner boxes for both the list and map areas. Don't carry that treatment over — it's not how the rest of the site works. Precedent already in the codebase: `components/ParksMap.tsx`'s desktop split view uses a single hairline (`.pms-index-list { border-right: 1px solid var(--pda-line) }`) between list and map, and hairline dividers between rows (`.pms-index-row { border-bottom: 1px solid var(--pda-line) }`), not boxed cards — and the map itself runs full-bleed elsewhere on the site. Use padding and a consistent gutter value to define the list/map split instead of stroke + border-radius, in keeping with that existing language.

## Deferred — logged, not part of this pass
**Style filter row:** a segmented pill filter (All / Transition / Street / Mixed) in the list column, matching the Map/Grid toggle's visual language, filtering by park type. Maps directly onto the existing `type` field already present on the `Park` record (see `components/ParksMap.tsx`'s `Park` type and the `type` column already selected from Supabase) — no new data needed. Hold this until the nav-bar/layout work above has landed.

## Scope check
- Don't touch: Grid mode's own density/hover behaviour, the desktop split-map internals beyond the toggle/header work above, or anything covered separately in `scout-icon-swap-handover.md`.
- This is a margin/layout/functionality pass, not a visual redesign — keep existing type, colour, and spacing tokens unless a specific change is called out above.
