# Parks map — "park as found object" trial

Status: **local trial, not committed, not deployed.** Working tree only.

The selected-park preview is now a shallow information bar with the park's
transparent cutout standing on it — foot near the bar's floor, the rest rising
over the map. Replaces the previous full-width strip that centred a small
cutout in a tall dark band.

---

## What changed

| | Previous strip | This trial |
|---|---|---|
| Bar height @1440 | 176px (26.4% of map) | **99px (14.9%)** |
| Bloblands silhouette | ~200 × 84 | **360 × 143** |
| Artwork position | centred, isolated | beside its own label |
| Artwork/map relationship | inside the bar | straddles the bar's top edge |
| Map drag near the bar | n/a | passes through the artwork |

The bar got shorter *and* the park got bigger, because the artwork is no longer
paying for its height out of the bar's height.

---

## Files

- `lib/parkMapArt.ts` — the cutout register: per-slug asset + measured ink.
- `lib/devParkFixtures.ts` — **new**, dev-only long-list fixtures.
- `components/ParkCard.tsx` — `ParkCutout` (new) alongside the photographic
  `ParkCardThumbnail`; the two treatments are now separate.
- `components/ParksMap.tsx` — the bar, the sheet, clearance maths, list scrolling.

`components/ParksDirectoryAccordion.tsx` was **not** changed.

---

## The three cutouts

All three exports are 1920×1080 with a real alpha channel, and all three are
centred (cx/cy = 0.50 to three decimals). What differs is how much of the
canvas the park actually occupies — measured off the alpha channel, not by eye:

| Park | Ink width | Ink height | Silhouette aspect |
|---|---|---|---|
| Bloblands | 89.1% | 63.1% | 2.512 |
| Crystal Palace | 92.8% | 80.4% | 2.053 |
| The Grove | 77.7% | 64.1% | 2.156 |

**This is why apparent size is computed rather than assumed.** Sizing the
*image* to a slot made Bloblands render visibly smaller than Crystal Palace for
a reason no reader could see — 26% more empty alpha, not a smaller park. The
layout now states a wanted **silhouette height** and works back to the image box
through these fractions, so all three land at one visual scale.

Two assets appeared while I was working — `crystal-palace/map-thumb.webp` and
`the-grove/map-thumb.webp`. Both are wired up. Only Stockwell now falls back to
a photograph, and its `directory_image_url` 404s, so it exercises the
missing-image path live.

Originals are untouched; no trimmed copies were derived.

---

## Measured trial dimensions

Foot sits 14px (desktop) / 12px (mobile) above the bar's floor throughout.
"Overhang" is how far the silhouette stands proud of the bar's top edge.

### Desktop — 1440 × 900
Bar **99px**, 14.9% of the map. Gap from identity to silhouette 26px.

| Park | Silhouette | Overhang |
|---|---|---|
| Bloblands | 360 × 143 | +58px |
| The Grove | 319 × 148 | +63px |
| Crystal Palace | 304 × 148 | +63px |

Heights land within 5px of each other despite the very different canvases —
widths vary because the silhouettes genuinely differ in shape.

### iPad landscape — 1024 × 768
Bar **90px**, 16.4% of the map. Bloblands 266 × 106, overhang +30px.
Attributes drop below 1050px; name and geography never do.

### iPad portrait — 768 × 1024
Sheet **101px**, 12.3% of the map. Bloblands 292 × 116, overhang **+27px**.
Name and location each stay on one line.

### Mobile — 390 × 844
Sheet **97px**, 15% of the map. Bloblands 148 × 59, overhang **−26px**.

**The object sits in the bar on a phone rather than straddling it**, and that is
a deliberate call rather than a shortfall. The bar cannot go below ~85px without
dropping the postcode/location line. A 2.5:1 park tall enough to clear 85px
needs a 234px slot, which on a 390px screen leaves 84px for the park's own name.
I chose readable text. The straddle arrives at tablet width, where 292px of slot
puts Bloblands 33px proud. How early it arrives is also a property of the
silhouette — a compact park clears the bar at a width a long thin one cannot.

### Short landscape phone — 844 × 390
Artwork dropped entirely; the map canvas is only 184px tall.
Sheet 99px. Note this is **54% of that map** — but the header is eating 184px of
the 390px viewport, and the sheet is the same height it was before this trial.
Header spacing is the lever there, and I have not touched it.

### Long names
Forced a 78-character name at 1440: wraps to 3 lines, bar grows to 149px
(22.3%), identity capped at 46% of the bar, no collision with artwork or CTA,
no horizontal overflow. The bar grows for text, as intended.

---

## Verified

- **Map drags pass through the artwork.** The cutout's box is far wider than its
  silhouette and hangs over the map; `pointer-events:none` means every sample
  point across it hit-tests to the Leaflet container, not the image. Without
  this the transparent rectangle would have killed dragging over a ~400px strip.
- **Attribution is never covered.** It was *already* buried under the old strip:
  Leaflet's control corners carry a high z-index but live inside the map
  container, which is `z-index:0` against the bar's 25, so the whole corner lost
  regardless. The bottom row now lifts by the measured overlay height. On mobile
  the credit also moves to the bottom-left corner, because bottom-right is where
  the sheet's artwork slot is.
- **Zoom control** likewise clears the bar.
- **Overlay height is measured, not assumed.** Pan offset and the locate button
  read a ResizeObserver value; they previously read `cardRef.current.offsetHeight`
  during render, which reported the *previous* park's height and never re-ran.
- **Missing/broken images.** Stockwell's 404 collapses the slot to zero width
  with no empty frame, and the desktop bar holds its height via `min-height`, so
  moving between parks does not make the bar jump.
- **Both themes.** Alpha shows the map above the bar's edge and the bar's own
  ground below it, in light and dark.
- **No horizontal overflow** at any width tested.
- **Production build passes** (`npm run build`, exit 0).
- Lint/types: **no new findings.** Two `react-hooks/exhaustive-deps` warnings in
  `ParksMap.tsx` are pre-existing — confirmed identical against `HEAD`.

---

## Long-list foundations

Tested with `?fixtures=80` (dev-only; see below).

- **Scrollbar restored on the index.** A blanket `::-webkit-scrollbar{display:none}`
  was hiding it. With a full catalogue that bar is the only thing on screen
  saying there are more parks below the fold. Now a subtle inset thumb, with a
  `scrollbar-width`/`scrollbar-color` equivalent for Firefox. Everything else on
  the map keeps its hidden scrollbars.
- **Row reveal is list-local.** `scrollIntoView({block:"nearest"})` walks every
  scrollable ancestor, so on a short window it scrolled the *page*. It now
  measures against the list's own box and scrolls only the list, only when the
  row is actually out of sight, and only far enough to bring it just inside the
  edge it is past. Verified: selecting a row 3,600px down scrolls to exactly
  that delta; re-selecting a visible row moves nothing; the page never moves.
- **Scroll position survives Map ↔ Grid.** Verified exact (2000 → 2000) — the
  map is hidden rather than unmounted, so this holds for free; I confirmed it
  rather than assuming it.
- **Keyboard.** Rows are real buttons, tabbable, with a visible accent focus
  ring. Focusing a row previews without moving the list or the page.
- **Reduced motion** is honoured by hand for the scroll, since a scripted
  `scrollBy` is neither a transition nor an animation and the media query would
  not reach it.

I also replaced a single ref shared across rows (`ref={isSelected ? ref : undefined}`)
with a post-commit DOM query. To be straight about this: **no failure was traced
to that ref** — I suspected it, and was wrong; the symptom was the test
environment. It is removing a dependency on React's detach/attach ordering, not
fixing an observed bug, and the comment in the code says so.

### Dev fixtures
`/parks?fixtures=80` appends synthetic parks **in memory, in the browser**,
guarded on `NODE_ENV === "development"` so the branch is dead-code-eliminated
from production. Nothing is written to Supabase. Fixtures carry no images, so
they exercise the empty case, and include names past what the column can hold.
The header still reads "4 PLACES" under fixtures — the accordion counts its own
fetch, which fixtures do not touch. Dev-only cosmetic.

---

## Verification caveat worth knowing

The browser pane does not composite unless a screenshot forces it, so **CSS
animations, smooth scrolling and lazy image loads all freeze**. Early
measurements caught the sheet mid-`translateY(100%)` entry animation and read as
"the park has fallen out of the bar", and the row-reveal looked broken when it
was correct. Every number above was taken after forcing paint. Anything measured
in this project without doing that should be distrusted.

---

## Open / not done

- **Phone straddle.** As above — geometry, not an oversight. If you want the
  object proud of the bar on a 390px phone, something has to give: the location
  line, or the name's width. Worth a decision rather than a tweak.
- **Short landscape phone** spends 54% of a 184px map on the sheet. The fix is
  header height, not the sheet.
- **Empty canvas is still costing you.** The Grove wastes 22% of its width and
  36% of its height to alpha; Bloblands 11%/37%. The layout compensates, so
  nothing looks wrong — but tighter exports would mean more pixels of park per
  byte and less upscaling. Crystal Palace is the best-framed of the three.
- Per-park nudges beyond scale (position/rotation) are supported by the data
  shape but none are applied; all three sit centred.
- `variant="map"` on `ParkCardThumbnail` is now unused. Left alone.
