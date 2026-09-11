# Scout home hero — visual review of the master frame

Review pass. No composition changes made beyond the three corrections listed in §7 — the frame is exactly as built, so the sheets below show what is actually running.

Captured from the live dev build with headless Chrome at 1:1 (no downscaling), light theme, hydrated. Every shot is the real page; a dev-only `?park=<slug>` pins the hero to one record so the same frame can be compared across widths and records.

**Sheets attached**

| File | What it shows |
| --- | --- |
| `SHEET-desktop-four-parks.png` | All four published parks, desktop 1453 × 941 |
| `SHEET-mobile-four-parks.png` | All four, iPhone portrait 390 × 844 |
| `SHEET-frame-range.png` | Longest title across wide / standard / short desktop, tablet portrait + landscape, iPhone landscape |
| `SHEET-asset-limitation.png` | Top 250px of each hero — what the photograph gives vs what the reference's matte gives |

---

## 1. Proportions

Per the updated direction, no alternate taller desktop build was made. 16:9 stands as the desktop baseline. What follows is the verification you asked for, and it finds two real problems at the ends of the range.

Height rule today: `min-height: max(420px, viewport-width × 9/16)`, then content grows it. **Nothing uses `vh`, `dvh` or `svh`** — the frame cannot move when Safari's controls appear or disappear.

| Viewport | Hero | Open above the group | Logo → group | Badge → title | Foot | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1920 × 1080 | 1072 | **59%** | 520 | 454 | 11% | Loose — group drifts low, badge stranded |
| 1453 × 941 | 809 | 46% | 290 | 250 | 14% | **Reference-like balance** |
| 1440 × 620 short desktop | 802 | 46% | 255 | — | 115 | **Title cut 36px below the fold** |
| 1024 × 768 tablet landscape | 568 | 39% | 119 | 86 | 14% | Comfortable |
| 768 × 1024 tablet portrait | 457 | **28%** | **37** | **8** | 13% | **Crushed** — badge all but touching the title |
| 844 × 390 iPhone landscape | 478 | **27%** | **33** | **6** | 68 | **CTA 21px below the fold** |
| 390 × 844 iPhone portrait | 420 | 41% | 82 | 60 | 10% | Comfortable |

**Why it breaks at both ends.** The frame's height is driven entirely by *width*, while the content block's height is near-constant. So the frame outgrows its content on a wide screen (59% air at 1920) and the content outgrows the frame on a narrow or short one (8px between badge and title at 768). Both failures are the single 16:9 rule being applied where it stops fitting — which is exactly the "do not force one ratio across every screen" case.

**Recommendation, not yet applied — one line, two clauses:**

```css
/* desktop baseline unchanged; capped so the frame can never outgrow the window */
min-height: max(420px, min(calc(var(--vw, 100vw) * 9 / 16), 100svh, 900px));

@media (max-width: 900px) {           /* tablet and phone want a taller frame */
  min-height: max(460px, min(calc(var(--vw, 100vw) * 3 / 4), 100svh));
}
```

`svh` is the *small* viewport height — the value with browser chrome shown. It is the one viewport-height unit that does **not** change as Safari's bars hide and show, which is why it can serve as a cap here without tying the composition to a moving target; `vh` and `dvh` would not be safe. The `900px` term stops the 1920 case running to 59% air. Cropping stays `object-fit: cover` throughout — the image is never stretched, and focal position remains a per-image concern (§3).

Say the word and I will apply it and re-shoot the same seven viewports.

## 2. Four records, desktop and mobile

`SHEET-desktop-four-parks.png`, `SHEET-mobile-four-parks.png`.

The four records include both edge cases you asked for:

- **Longest title** — CRYSTAL PALACE wraps to two lines on desktop and mobile. The group grows upward, the frame grows with it, the foot stays at 14%, and the mark stays above / the chip below throughout.
- **Missing scan dates** — CRYSTAL PALACE stores the literal `"NA"` and STOCKWELL stores an empty string. Both chips print the location alone (`LEDRINGTON ROAD`, `BRIXTON`) with **no trailing separator** — the line is assembled with `.filter(Boolean).join(" · ")`, so an absent value removes its own delimiter.

Reading the desktop sheet as a set: the composition holds identically across all four, and the differences you see are the photographs, not the layout. The two soft spots are compositional rather than structural: the gap between the title's arrow and the CTA varies a lot with name length (§4), and where a photograph is busy behind the title — Crystal Palace, right half — white type on the image is hard to read. That legibility gap is pre-existing and documented in the hero as an accepted trade; it is more visible now only because the title sits lower in the frame.

## 3. Frame vs asset

`SHEET-asset-limitation.png`.

**What the reference does:** the park is a **matte** — cut out, hard silhouette edge, sitting on flat page ground with no horizon. That is what makes its upper third genuinely open, and it is an asset property, not a layout one.

**What our assets do:** all four heroes are whole photographs with their own sky, horizon and background. Their tops happen to be bright — overcast or blown-out — so the frame reads as reasonably open, but that is the weather, and it varies:

- **Bloblands** — pale overcast close to the page's own beige; the closest thing to the reference, by luck.
- **The Grove** — blown white sky, but ramps reach the top edge at both sides; the badge lands on graffiti.
- **Crystal Palace** — white sky, with a green bank and a purple ramp cutting into the upper left.
- **Stockwell** — white along the top, wall and bowls immediately beneath; least open at badge height.

**Nothing in the composition was changed to compensate.** Reproducing the reference's open upper background needs prepared imagery — a matted/cut-out hero per park, or a shot framed with sky deliberately left at the top. Both are asset work. A per-image focal position (`object-position`) would let each photograph put its most open area under the badge, and that stays confined to the image as required — but it cannot manufacture a matte.

## 4. The arrow does not lead to the CTA — in either arrangement

Measured from the arrow's head to the CTA, at 1453:

| Park | Arrow head | CTA | Gap | Bearing to CTA | Arrow points |
| --- | --- | --- | --- | --- | --- |
| Stockwell | 972, 648 | 1230, 597 | 257px | −11° | +45° |
| The Grove | 921, 648 | 1230, 597 | 309px | −9° | +45° |
| Bloblands | 954, 648 | 1230, 597 | 276px | −10° | +45° |
| Crystal Palace | 693, 648 | 1230, 533 | **537px**, different line | −12° | +45° |

The arrow points **45° down-right**; the CTA lies at **−9° to −12°** — slightly *up* and to the right. That is a **~55° error** in every case, so the arrow aims at the ground below the button rather than at it. On mobile it is worse: the CTA sits below and to the left, at **163°**, so the arrow points almost exactly away from it — a **~118° error**.

For reference, the supplied comp has the same 45° glyph and a similar bearing, but only a **105px** gap — close enough that it reads as a hand-off. Ours is 257–537px because the arrow is anchored to the end of the *text* while the CTA is anchored to the *frame's right edge*, so the distance is a function of name length.

Binding the arrow to the last word fixed the orphan, as you say, and did not establish the relationship. Two ways to fix it, both composition-only:

1. **Move the arrow to the group's right edge** — take it out of the text flow and right-align it in the title row, so its distance to the CTA is constant for every park. Short names then show a gap between word and arrow.
2. **Point it where the CTA actually is** — keep it glued to the text, shallow the diagonal to ~20°, and drop it on mobile where the CTA is below rather than beside. This departs from the reference's 45° glyph.

My recommendation is (1) with the arrow kept at 45°: it preserves the reference's mark and makes the relationship stable across records, which is the acceptance criterion. **Not applied — awaiting your call.**

## 5. Parks page after the alignment change

`p-before-1453.png` / `p-after-1453.png` (attached separately on request; summarised here).

Measured at 1453: logo, "PARKS", "4 PLACES" and the search field all sit at x = 83; the theme toggle, the Map/Grid toggle and VIEW PARK all end at 1371. Before the change those were x = 56 / right 1397.

Everything else is byte-identical: list column width, map bounds, detail card, zoom and recentre controls, type, spacing, ordering. The whole page moved inward 27px on each side to sit on the body column — nothing was recomposed. `--pda-gutter` now points at the same `--frame-inset` token the nav uses, which is what keeps the sticky bar in step with the header, as `scout-parks-navbar-alignment-final.md` requires. **Below ~1415px of usable width the token collapses to `--content-padding` and nothing on any page moves at all.**

## 6. Accessibility

The postcode badge is no longer `aria-hidden`. It reads as "SE22" and is the only place the featured park's postcode appears on the page — the thumbnail strip prints one per card, but for those parks, not this one. Verified in the DOM: postcode exposed, arrow hidden, crosshair layer hidden, and nothing else in the hero hidden. `pointer-events: none` stays on the badge: it is readable, not clickable.

## 7. Corrections applied in this pass

Three, all outside the composition:

1. **Postcode exposed to assistive technology** (§6).
2. **Stale comment removed** — `ParkFacts.tsx` referred to "ParkHeroMeta's CHIP_VARIANT", a constant that no longer exists. The note now stands on its own.
3. **Dev-only `?park=<slug>`** on the homepage — pins the hero to one record so a frame can be compared against itself. Same gate as `?fixtures=<n>` on /parks: `NODE_ENV` is inlined at build time, so in production the branch is a literal `false` and the hero stays random for every visitor. Unknown slugs fall through to the random pick.

## 8. Data correction — flagged, not made

No address fields were reordered. The location chip still reads `address[1]`, which is why Crystal Palace prints **LEDRINGTON ROAD**, a street.

The suitable existing field is **`borough`**, and it is populated for all four rows:

| Park | `borough` | `address[1]` (current source) | `location` |
| --- | --- | --- | --- |
| Bloblands | Lambeth | West Norwood | South London |
| The Grove | Southwark | Dulwich | South London |
| Crystal Palace | **Bromley** | **Ledrington Road** | South London |
| Stockwell | Lambeth | Brixton | South London |

`borough` is the field that matches what the reference shows (CROYDON is a borough) and it is correct for every row, including the one that is currently wrong. The trade is that it would change three parks from neighbourhood to borough — WEST NORWOOD → LAMBETH, DULWICH → SOUTHWARK, BRIXTON → LAMBETH — and at hero scale the neighbourhood arguably reads better, which is why the current derivation was chosen.

Three options, in the order I would rank them:

1. Switch the chip to `borough`. One line, correct for all four, consistent with the reference. Loses the neighbourhood.
2. Fix Crystal Palace's row to `["Ledrington Road", "Crystal Palace", "London"]` so `address[1]` is an area for all four. Keeps the neighbourhood; leaves the derivation depending on address shape, which will break again on the next row entered differently.
3. Add a dedicated `area` column, falling back to `borough`. Most robust, most work.

`location` is not a candidate: it holds "South London" for every row, which is a region.
