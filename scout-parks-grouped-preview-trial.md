# Parks map — grouped preview trial (artwork / title / action)

Status: **local trial, not committed, not deployed.** Working tree only.
Supersedes the composition in `scout-parks-found-object-trial.md`; the asset
handling and long-list work from that pass carry forward unchanged.

Composition now follows the reference: **reserved artwork area at the left,
one prominent title beside it with the orange catalogue mark above and
location/attributes below, View park at the right.** The cutout mostly sits in
the shallow bar with a modest crossing over its top edge.

---

## The headline: nothing moves between parks

This was the condition the direction was accepted on, so it is the thing that
got measured hardest. Every anchor, captured while stepping through all four
parks at each width:

**Desktop 1440 x 900 — identical across all four parks**

| Anchor | Value |
|---|---|
| Bar top / height | 774.3 / **157.2** |
| Artwork area left / width | 399.5 / **402.9** |
| Title left / top | **828.3** / 805.8 |
| Catalogue mark top | 786.3 |
| Location top / attributes top | 887.0 / 905.4 |
| View park left / top | 1264.6 / 838.1 |

Mobile 390 x 844 and landscape phone 844 x 390 were checked the same way and
also came back with **zero** unstable anchors.

That holds through the cases that normally break it:

- **Broken image.** Stockwell's `directory_image_url` 404s. Same anchors.
- **Delayed image load.** Blanking and restoring the artwork's `src` moved
  nothing — before, during and after are byte-identical.
- **Name length.** "Hollow" (6 chars) through "Bellenden Road Community Skate
  Plaza" (36) all give bar 157.2, title left 828.3, action top 838.1.
- **Missing optional fields.** Deleting the attributes line, then the location
  line as well, left the bar at 157.2 and the title where it was.

### How it is held

Three reservations, all `min-height` rather than `height`, so unusual content
grows the bar instead of being clipped:

1. **The artwork area is a breakpoint constant, not a park property.** Its
   width is `silhouette height x 2.55` (`CUTOUT_SLOT_ASPECT`), wide enough for
   the widest silhouette drawn at that height. Every park is centred in the
   same box. The previous pass sized the area to each park's own silhouette,
   which moved the title's left edge by up to 56px between Bloblands and
   Crystal Palace.
2. **The title reserves two lines**, at one size per breakpoint. Names are
   never shrunk to fit.
3. **The identity block reserves its whole stack**, so a park with no
   attributes does not pull the title down as the bar re-centres it.

Two things had to be corrected to make this actually true, and both were only
found by measuring:

- The identity reservation was **5px short** of the real content, so the
  min-height never bound and an attribute-less park came out 5px shorter. The
  constant is now measured (mark 16.5 + gaps + location 15.4 + attributes 14 =
  56.9, set to 58).
- The title was **centred** in its two reserved lines, which looked better for
  a one-line name but moved the name itself: "Bloblands" on one line sat 11px
  lower than "Crystal Palace" on two. Top-aligned now. The gap under a short
  name is the price of the reservation, and it is the right way round.

**Entrance and slide animations are gone.** The sheet used to translate on
first appearance and slide horizontally on every carousel step — both moved the
text on selection. Replaced with an opacity-only cross-fade; reduced motion
turns it off entirely.

---

## Trial dimensions

Silhouette foot sits 23px (desktop) / 12px (sheet) above the bar's floor.

### Desktop 1440 x 900
Bar **157px**, 22.5% of the map. Title 33px MSCHN. Artwork area 403px.
Identity column 410px. All three cutouts draw at **158px silhouette height**:

| Park | Silhouette | Crossing above bar |
|---|---|---|
| Bloblands | 397 x 158 | +24px |
| The Grove | 341 x 158 | +24px |
| Crystal Palace | 324 x 158 | +24px |

Widths differ because the silhouettes genuinely differ; heights and crossings
are identical, which is what "one scale" means here.

### iPad landscape 1024 x 768
Bar **136px**, 24.9% of map. Artwork area 306px, silhouette 301 x 120,
crossing +7px. Identity 166px — the tightest column in the trial; the title
wraps to its second reserved line for longer names, which is what the
reservation is for. Attributes drop below 1050px (a breakpoint change, not a
per-park one, so the bar's height is unaffected).

### iPad portrait 768 x 1024
Sheet **179px**, 21.8% of map. Artwork area 372px, silhouette 300 x 146,
crossing **+19px**. Identity 282px.

### Mobile 390 x 844
Sheet **163px**, 25.3% of map. Artwork area 163px, silhouette 161 x 64.
Identity 143px, location on one line. View park sits directly under the text
column (both at x=191.2), not under the artwork.

The object sits **inside** the bar here (−47px), not crossing it. On a 390px
screen a park tall enough to clear the bar would need most of the width, and
the name would get about 84px. Text won. The crossing appears from 600px up.

### Landscape phone 844 x 390
Sheet **78.5px**, 41.3% of a 190px map. Different arrangement rather than a
squeezed one: no artwork, and the mark, title, location and button laid out
along a single row on a fixed two-column grid. The title still reserves its
lines, and the anchors are stable.

This was **93% of the map** before that rework. It is still 41%, and the real
cause is above the map: the page header takes 190px of a 390px viewport.
Header spacing is the lever, and I have not touched it.

---

## Also verified

- **Map dragging passes through the artwork** — `pointer-events:none`; every
  sample point across the transparent box hit-tests to the Leaflet container.
- **Attribution and zoom clear the bar** at every width. Leaflet's control
  corner is lifted by the measured overlay height; on the sheet layout the
  credit also moves to the bottom-left, away from the artwork.
- **Text zoom**: doubling the title size grows the bar 157 → 233 with no
  clipping, no overflow past the map's top edge, no horizontal overflow.
- **Whole silhouette visible** and inside its reserved area for all three
  parks, at every width.
- **Both themes** — alpha shows the map above the bar's edge and the bar's own
  ground below it.
- **Long list** (80 fixtures, 84 rows): list scrolls independently with a
  visible 11px scrollbar; marker selection reveals its row by scrolling the
  list only, never the page; hover/focus moves nothing; scroll position
  survives Map ↔ Grid exactly.
- **No horizontal overflow** at any width tested.
- Lint/types: **no new findings** — the two `react-hooks/exhaustive-deps`
  warnings in `ParksMap.tsx` are pre-existing, confirmed against `HEAD`.

---

## Compromises, stated plainly

1. **The bar is 157px at 1440 (22.5% of the map).** It was 99px in the previous
   pass. The mockup's composition costs that: a 33px title with two lines
   reserved is 76px before any metadata. The reservation is what stops the text
   moving, so the two cannot both be had.
2. **A one-line name leaves a gap** between title and metadata — the spare
   reserved line. Unavoidable once the block is fixed and the title is
   top-aligned.
3. **No crossing on phones** (390px). Geometry, explained above.
4. **A genuinely extreme name** (78 characters) wraps to five lines and grows
   the bar to 270px. That is the "adapt rather than clip" behaviour the brief
   asked for; realistic names up to ~36 characters all hold at 157px.
5. **iPad landscape identity column is 166px** — the narrowest in the trial.
   Workable, but it is the width most likely to want another look.
6. **Empty alpha still costs resolution.** The Grove wastes 22% of its width
   and 36% of its height to transparency, Bloblands 11%/37%. The layout
   compensates so nothing looks wrong, but tighter exports would mean more real
   pixels per park. Crystal Palace is the best-framed of the three.

---

## Files

- `lib/parkMapArt.ts` — cutout register, measured ink per park, `CUTOUT_SLOT_ASPECT`.
- `lib/devParkFixtures.ts` — dev-only long-list fixtures (`?fixtures=80`).
- `components/ParkCard.tsx` — `ParkCutout`, title line reservation.
- `components/ParksMap.tsx` — both bars, reservations, clearance, list scrolling.

`components/ParksDirectoryAccordion.tsx` was **not** changed.

### Verification caveat
The browser pane does not composite unless a screenshot forces it, so CSS
transitions, animations and lazy image loads freeze. Several "failures" during
this pass were that, not the code — control-clearance checks in particular read
false until paint was forced. Every number above was taken after forcing paint.
