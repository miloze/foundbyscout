# Parks map — mobile preview CTA refinement

Status: **local trial, not committed, not deployed.** Working tree only.
Desktop composition and its labelled View park button are **unchanged** —
verified by measurement, not by inspection.

---

## Result

| Layout | Before | After | Saved |
|---|---|---|---|
| Mobile 390 x 844 | 163.2px (25.3% of map) | **117.7px (18.3%)** | 45.5px, −28% |
| iPad portrait 768 x 1024 | 179.0px (21.8%) | **133.8px (16.2%)** | 45.2px, −25% |
| Landscape phone 844 x 390 | 78.5px (41.3%) | 78.5px (41.3%) | height already compact; ~68px of row width freed |
| Desktop 1440 x 900 | 157.2px | **157.2px** | unchanged, as required |

Two changes, both requested, and both paid:

- the labelled CTA row became an arrow in the identity row: **−33.8px**
- the expand chevron came out: **−11.7px** (its 44px stacked under the arrow
  had been making the action column taller than the identity beside it)

No empty row, gap, invisible focus target or orphaned label is left behind:
the sheet now contains exactly one focusable element, `View <park name>`, and
`.pms-peek-expand` and `aria-expanded` no longer appear anywhere.

---

## The glyph

**MSCHN carries ↖ ↗ ↘ ↙.** I read the font's `cmap` rather than assuming —
`public/fonts/MSCHNVF.ttf` maps 579 codepoints including all four diagonals and
the guillemets. So the arrow is set in the site's own display face, at 23px,
beside the park name in the same face.

↗ rather than →, and that is the point of it. The sheet is swiped left and
right to change park, so a horizontal arrow at the right-hand edge of that same
row is exactly the shape "next park" would take. A diagonal leaves that axis.
It is also already the site's mark for this: `.fbs-coord-tag::after` appends ↗
to the link that opens a park's coordinates.

Worth knowing: `CTAButton` records that a ↘ was tried *inside* the labelled
button and dropped for reading "too small and sat wrong against the word". That
was a glyph next to text at 9px; this is a standalone 23px mark with 44px of
target around it, which is a different problem.

Distinct from browsing: the carousel dots sit top-centre (x≈195), the arrow
bottom-right (x≈362), and the arrow is accent orange where the browse
affordances are not.

---

## Clarity compromise — the one to weigh

**The arrow carries no label.** The brief allowed keeping a compact one "rather
than sacrificing clarity to save a few pixels", so here is the actual cost:

The action slot is 44px. A label beside the arrow needs roughly 70px, and the
text column at 390px is already only 165px — it would drop to ~139px, which is
below the 142px that `"SE27 / SOUTH LONDON"` needs, so **the location would go
back to two lines** and give back most of the height this pass recovered. The
only other way to fund it is shrinking the artwork again.

So it is not a few pixels; it is the location line. I went with arrow-only,
mitigated by the diagonal, the accent colour and the distance from the dots.
If you want the label, the artwork is where the width has to come from.

---

## Spacing

- Title-to-location gap **6px → 3px** (`--pcard-mark-gap` and
  `--pcard-place-gap` on the sheet only; the desktop bar keeps its own).
- The **two reserved title lines stay.** That is the "generous space" between
  title and location, and it is what stops the metadata moving when you switch
  from a one-line name to a two-line one. It is only visible as a gap when the
  current name happens to be short.
- The mobile artwork lost ~9% of its width (`--pms-ink-h` 16vw → 15vw, area
  163 → 149px). Not cosmetic: the 44px action column took 6px more than the
  bare chevron it replaced, which pushed `"SE27 / SOUTH LONDON"` (142px) past a
  137px column onto a second line — while `"SW9 / SOUTH LONDON"` (137px) still
  fitted. The sheet was 12px taller for three parks than for the fourth. The
  artwork gave the width back rather than the location losing a line. Nothing
  was enlarged into the recovered height.

---

## Removing the expanded state

The expanded sheet's **only unique content was the attributes line** — "BOWL /
FREE". That is tier-3 metadata, and it is still on the park's own page (which
the arrow opens) and in the desktop bar, which has room for it. Nothing else
was lost.

Removed with it, because they served only that state:

- the chevron and its `aria-expanded` / rotate treatment
- tap-anywhere-on-the-sheet to expand
- swipe-up to expand
- the `"expanded"` member of `CardState`, and the effect that reset the sheet
  to collapsed on park change

Kept, because they are independent:

- **swipe down still dismisses** the preview
- horizontal swipe still changes park
- the carousel dots

Also removed: `cursor: pointer` on the sheet body. It was advertising the
tap-to-expand that no longer exists, and a hand cursor promising a click that
does nothing is worse than no affordance.

---

## Bugs found and fixed on the way

1. **A swipe starting on the arrow opened the park.** Browsers only suppress
   the trailing click for gestures they handled themselves; these are handled
   in JS, so the swipe ended in a click on the link and navigated away from the
   park you were swiping toward. The link now cancels its own default when a
   drag was recorded.
2. **The title overflowed into the arrow at 200% text zoom.** Reserving the
   action's width does not help when the text runs over it: the title is a flex
   container and a flex item will not shrink below its longest word. Fixed with
   `min-width:0` plus `overflow-wrap:break-word`, on both bars. Re-tested at 2x
   with a 36-character name: no collision, no clipping.
3. The two 44px targets met **edge to edge** with no gap while both existed —
   moot now the chevron is gone, but it is why the arrow sits where it does.

---

## Verified

- **Stability across park selection**: every anchor — sheet height, title left
  and top, catalogue mark, location baseline, arrow position — is identical
  across all four parks at 390x844, 768x1024 and 844x390. Including Stockwell,
  whose image 404s and whose artwork area is reserved but empty.
- **Semantics**: `<a href="/parks/<slug>">`, `aria-label="View Crystal Palace"`,
  arrow `aria-hidden`. Middle-clickable and keyboard-reachable like any link.
- **Touch target** 44 x 44 at every width, larger than the glyph.
- **Focus** — accent ring, inset so it is not clipped by the sheet edge.
- **Both themes**, and the arrow's accent reads against both grounds.
- **Arrow aligns with the title's first line** to the pixel (centre 947.4 vs
  947.4 at 768; 765.5 vs 765.5 at 390) — it points at the name, not at the
  catalogue mark above it.
- **Map controls, marker and attribution** all still clear the shallower sheet.
- Safe-area inset padding retained on the sheet body.
- **Production build passes** (exit 0). Lint/types: no new findings — the two
  `react-hooks/exhaustive-deps` warnings are pre-existing.

## Remaining

- A genuinely long name (36 chars) still grows the mobile sheet to ~136px,
  since three lines exceed the two reserved. Adapt-not-clip, as before.
- Landscape phone is still 41% of a 190px map. The cause is the page header
  taking 190px of a 390px viewport, not the preview.
