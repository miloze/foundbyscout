# Scout — Homepage hero: master frame

Audit and implementation pass against the supplied reference. Composition only: no new copy, fonts, components or interaction patterns. Verified live at 1453, 1280, 900, 820 and 390 px, in both themes, against all four published parks.

---

## 1. Audit — what was already there

**Files that build the hero**

| Piece | Source |
| --- | --- |
| Section box, image, postcode badge, crosshair layer | `app/page.tsx` (hero `<section className="full-bleed">`) |
| Catalogue mark, title, location chip, CTA | `components/ParkHeroMeta.tsx` (homepage-only — no other caller) |
| Logo, nav links, theme toggle | `components/Nav.tsx` |
| CTA appearance | `.fbs-cta` in `app/globals.css`, shared with VIEW ALL PARKS |
| First-visit entrance | `components/HeroEntrance.tsx`, scoped to `[data-hero-entrance]` |
| Column tokens | `--content-max-width: 1400px`, `--content-padding: clamp(16px, 4vw, 56px)` |

**Park data.** The featured park is chosen at random per request from every published row with a `hero_image`. Everything the hero prints already came from that row — no hardcoded values were found. Four published parks: Bloblands (001, SE27), The Grove (003, SE22), Crystal Palace (005, SE19), Stockwell (006, SW9).

**What could stay unchanged:** the italic display face and its `clamp(3.5rem, 11vw, 9rem)` size, the chip box metrics (11px DM Mono, 3×8 padding, 3px radius — the park page copies these to the pixel), the `.fbs-cta` component and its destination, the full-bleed image at `object-fit: cover`, the nav-transparency mechanism, the entrance sequence, and the accent.

**Layout rules that blocked the reference arrangement**

1. **Two competing left edges.** Nav and the floating logo sat on `clamp(16px, 4vw, 56px)`; the title group sat on `.contained`'s inner edge. Those agree below ~1415px of usable width and diverge by 19px above it, because `.contained` is a *centred* max-width column. The brief's "common left inset" was therefore impossible without reconciling them.
2. **Chip order.** The catalogue mark and location chip were stacked *below* the title as one `idstack`; the reference brackets the title with one above and one below.
3. **No arrow.** A standalone ↘ had been removed in an earlier pass for duplicating the CTA's destination.
4. **CTA anchored to the block's bottom.** `.fbs-hp-meta` was `align-items: flex-end`, putting the CTA on the metadata's baseline rather than beside the title.
5. **`aspect-ratio` is a fixed height.** With the title free to wrap, content overflowed the ratio box and `overflow: hidden` clipped it — measured at 820px on CRYSTAL PALACE, 10px of the catalogue mark was cut off the top.
6. **Bottom padding of 3rem** left 48px of image below the metadata (5.9% of the hero); the reference leaves ~15%.

---

## 2. Changes, mapped to the reference

| # | Reference item | What changed | Where |
| --- | --- | --- | --- |
| 1 | Header: smaller logo, translucent theme switch | Logo `clamp(41px, 5.5vw, 66px)` → `clamp(34px, 4.58vw, 55px)` (−17%, same three-term scaling so the mark still stops growing at 1200px). Toggle fill/ink moved out of the inline style into `.fbs-nav-toggle`, with an `--on-photo` variant: translucent `rgba(243,239,236,0.42)` plate, 6px backdrop blur (the ghost CTA's existing treatment), ink pinned to `#14120f` — the same value `.fbs-nav-link--on-photo` already uses over hero photography. Box, icon, stroke and 44px target untouched. | `Nav.tsx`, `globals.css` |
| 2 | Catalogue chip above the title's left edge | Moved above the title inside one `.fbs-hp-group` column, 8px gap. | `ParkHeroMeta.tsx` |
| 3 | Title anchored low, image space beneath | Type treatment unchanged. Hero foot `3rem` → `clamp(2.5rem, 8vw, 7.5rem)`; at 1453 that leaves 116px of open image below the group (14.3% — the reference's is 14.7%). | `page.tsx`, `ParkHeroMeta.tsx` |
| 4 | Location + scan date tightened under the title | Same 8px gap below the title, same dark chip. | `ParkHeroMeta.tsx` |
| 5 | Large white arrow after the title | Inline `<svg>` at `0.72em`, `aria-hidden`, not a link or button. | `ParkHeroMeta.tsx` |
| 6 | CTA right of the title group, "Explore park" | Frame is now `display:flex; align-items:center` — the CTA is centred on the *whole* group (mark + name + chip), which is what puts it on the name's line. Label changed, `href={/parks/${slug}}` unchanged. | `ParkHeroMeta.tsx` |
| 7 | Charcoal postcode badge, upper right | `--accent` → `rgba(20,18,15,0.82)`, the chips' exact ink, so the frame's dark objects are one family. Diameter `clamp(56px, 6.2vw, 90px)`; top measured from `--nav-height`; right edge inset half a grid step from the column. | `page.tsx` |
| 8 | Fine crosshair texture | New `.fbs-hero-grid` layer at `z-index: 1`, `pointer-events: none`, `aria-hidden`. | `page.tsx` |

### The crosshair grid, and how it relates to Found Object

The Found Object graticule draws the reading column's two edges and its quarters — the PARKS grid's four columns. The hero **halves that step and marks every crossing**, so the two are one grid at two densities rather than two inventions. Pitch is written from the same two tokens `.contained` is built from, so nothing is measured:

```css
--hg: calc((min(var(--content-max-width), var(--vw, 100vw)) - 2 * var(--content-padding)) / 8);
```

Nine spans, one per vertical; each carries its whole run of marks as a repeating background (two tiles — a 1px-wide strip whose ink is its top 11px, and an 11px-wide strip whose ink is its top 1px), so the row count follows the hero's height without being knowable in markup. Half-pixel offsets centre each arm on the crossing, the same correction `.fbs-fo-mark` makes. The layer is masked to fade in over the hero's upper negative space, and takes the image's own wipe on a first visit so it doesn't sit fully drawn over the page background while the picture opens behind it.

At ≤700px it drops to the column's quarters — the same threshold and the same reasoning Found Object uses when the catalogue grid becomes two columns.

### The shared frame inset — **flagged: this reaches beyond the hero**

The brief's anchors ("a common left inset for the header logo and lower title group", "a corresponding right inset for navigation and CTA") cannot hold while the nav and the body column disagree above 1400px. A new root token expresses the column's inner edge as a length, so a fixed-position element can sit on it:

```css
--frame-inset: max(
  var(--content-padding),
  calc((var(--vw, 100vw) - var(--content-max-width)) / 2 + var(--content-padding))
);
```

`Nav.tsx` (bar padding and logo `left`) now uses it. **`--pda-gutter` on `/parks` was pointed at the same token** — without that, aligning the nav would have pushed `/parks` out of step with its own sticky bar, which `scout-parks-navbar-alignment-final.md` deliberately locked to Nav's inset.

Effect: **below ~1415px of usable width, nothing changes at all** — the expression collapses to `--content-padding`. Above it, the nav bar, logo, `/parks` gutter and map overlay controls move ~19px inward to sit on the body column. Verified on `/parks` at 1453: logo, "Parks · 4 places" and the search field all at x=83; theme toggle and the Map/Grid toggle both right-aligned at 1371.

One caveat: `--vw` is published by Nav after hydration, so the very first paint above 1400px uses the `100vw` fallback, which counts the scrollbar (~7px out for one frame). `.full-bleed` already makes exactly this trade.

### Hero height

`aspect-ratio: 16 / 9` became `min-height: max(420px, calc(var(--vw, 100vw) * 9 / 16))`. The frame is still 16:9 — hero-01.webp's native ratio — for every park whose name fits on one line, so the uncropped-image reason for the original ratio is intact. But `aspect-ratio` derives the height from the width and lets content overflow, which is what clipped the catalogue mark at 820px. As a *minimum* the ratio shapes the frame and the section grows instead, trading a little crop for content that is never cut.

### Long names

The arrow is inline so a wrapping name carries it onto the last line. On its own that produced a stray glyph alone on line 2 for "Crystal Palace" (the name fits; the name-plus-arrow does not). The last word and the arrow are now bound in one `nowrap` span, so the break falls between words: **CRYSTAL / PALACE ↘**. No breakpoint hides the arrow — measured at 390px, the longest published name still clears the column with it attached.

---

## 3. Verification

**Desktop, 1453×941 (reference aspect for the frame's contents).** Measured, all four parks:

- Logo, title group, catalogue chip, location chip, intro paragraph: all left at x=75.
- Theme toggle, CTA, crosshair layer: all right at 1363. Postcode badge right at 1283 — half a grid step (80px) inside, "below and inward from navigation".
- Title group 502→693; hero foot 809. 116px of open image below (reference: 14.7% of frame height; this is 14.3%).
- **"Wandle Park" rendered into the frame lands within ~12px of the reference**: title + arrow ends at 1132 (reference ~1120), CTA begins at 1230 (reference ~1225).

**Dynamic content.** Bloblands / The Grove / Stockwell → one line. Crystal Palace and a 21-character stress name → two lines, group grows upward, hero grows with it, foot spacing unchanged at 116px, no overlap with the arrow, badge or CTA in any case.

**Responsive.** 1280 (all anchors align: x=51 / right 1214) · 900 (CTA still beside the title) · 820, just below the fold (CTA below the location chip; nothing clipped; hero grows to 471) · 390 (frame holds, arrow lands after PALACE, badge 30px clear of the toggle and 60px clear of the title, CTA below the group at a full 44px-comfortable size). The fold is at 860px — chosen where the title and CTA stop fitting side by side, not at a device width.

**Both themes.** The hero is unchanged between them (it sits on a photograph). The on-photo toggle stays a light translucent plate with dark ink in dark mode, which is correct — the surface under it is concrete, not the page.

**Interactions.** CTA destination unchanged; focus rings intact on the nav link, the toggle and the CTA; the crosshair layer and badge are `aria-hidden` and `pointer-events: none`. First-visit entrance runs in full — the grid wipes with the image and releases cleanly. `tsc --noEmit` clean; ESLint reports only three pre-existing issues (`Math.random` in render, unused `featureTags`, unused `postcode`/`opened` props) — none introduced here.

---

## 4. Flags — please read before sign-off

**a) The reference's imagery is a cut-out; ours is not.** In the reference the park sits as a silhouette against flat page-background beige across the top ~28% of the frame, with a crisp masked edge along the ramp. That is what produces its "generous upper negative space". Scout's hero assets are whole photographs with their own sky and background — no alpha, no matte. The upper space here is therefore held *compositionally* (nothing but the badge above the title group, the crosshairs fading out across it) rather than by opening the frame to the page. **No composition was changed to compensate.** Producing the reference's look would need cut-out or matted hero assets per park; worth deciding before any further hero work.

**b) The reference's postcode is wrong for its park, as anticipated.** There is no Wandle Park in the archive. SE22 is **The Grove**'s postcode (Dulwich); Wandle Park is in Croydon, i.e. CR0. Nothing was copied — the badge prints the outward code from the active row (`SE27` / `SE22` / `SE19` / `SW9`, confirmed against the database).

**c) "Location" is derived from `address[1]`, and one park's address is shaped differently.** The chip takes the second address line, which reads correctly for three parks (WEST NORWOOD, DULWICH, BRIXTON). Crystal Palace's address is `["Crystal Palace Park", "Ledrington Road", "London"]`, so its chip prints **LEDRINGTON ROAD** — a street where the reference shows a borough. The `location` column exists but holds "South London" for all four, which is a region rather than an area. This is a data-shape issue, not a layout one, so it was left alone. Two ways out: fix Crystal Palace's row to `["Ledrington Road", "Crystal Palace", "London"]`, or give the area its own column. **Not done in this pass.**

**d) Crystal Palace has no scan date.** Its `scanned` column holds the literal `"NA"`, which `formatFieldDate` correctly refuses to print, so its chip has no "· SCANNED …". Stockwell's is empty. Correct behaviour; the archive is simply missing two values.

**e) The frame is 16:9; the reference is roughly 3:2.** The reference is a taller frame, which is part of why its upper space reads as more generous. 16:9 was kept because it is the hero images' native ratio and moving off it crops every photograph. If the taller frame is wanted, that is a deliberate decision to trade image crop for composition — say so and it is a one-line change.

**f) The inverted chip is gone.** The catalogue mark used to be a light chip against the dark location chip, selected by a `CHIP_VARIANT` constant. The reference has both dark, so the constant, its `as ChipVariant` cast and the `.fbs-hp-chip--inv` rule were removed rather than left unreferenced. The park page carries its own copies of the chip metrics and is unaffected. `ParkFacts.tsx` still has a comment referring to that cast — harmless, but it will read as stale.

---

## 5. Files changed

- `app/colors_and_type.css` — added `--frame-inset`
- `app/globals.css` — added `.fbs-nav-toggle` and its `--on-photo` variant
- `app/page.tsx` — hero foot, min-height, crosshair layer, postcode badge
- `components/Nav.tsx` — frame inset on bar and logo, logo scale, toggle variant
- `components/ParkHeroMeta.tsx` — group structure, arrow, chip order and fills, CTA placement and label
- `components/HeroEntrance.tsx` — `.fbs-he-grid` hook
- `components/ParksDirectoryAccordion.tsx`, `components/ParksGridView.tsx` — `--pda-gutter` → `var(--frame-inset)`

Further design suggestions are deliberately not included.
