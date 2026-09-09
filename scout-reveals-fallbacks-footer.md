# Scout — fallback paths, image weight, prominence, scroll reveals, footer

Nothing deployed, nothing committed.

---

## 1. Forced fallback paths

All four grid image states are now reachable from a URL rather than only from
data we don't have. `/parks?fixtures=8&view=grid` (dev builds only) cycles every
fixture through one of four treatments.

Added to `lib/devParkFixtures.ts`:

- `BROKEN_CUTOUT_SLUG = "fixture-art-broken"`, taken by fixture 0. `lib/parkMapArt.ts`
  gained a **dev-only** register entry pointing that slug at
  `/images/parks/__fixture__/does-not-exist.webp`, so the cutout's own error
  handling is exercised — not just the "no artwork registered" branch, which is a
  different code path.
- `fixtureArt(i)` cycles `broken-cutout → photo → broken-photo → none`, so any run
  of four covers all of them.
- Fixtures now carry `thumbnail` / `gallery_images` so one shape feeds both the map
  and the grid.

Verified live, reading what each tile actually rendered:

| Fixture | Treatment | Result |
|---|---|---|
| 0 | cutout registered, file 404s | cutout removed, **empty plate** — `onError` fired and fell through |
| 1 | real photograph | **photo** via `next/image` |
| 2 | photo path 404s | **empty plate** |
| 3 | no image at all | **empty plate** |

The broken-cutout case is the one that needed this: `ParkCutout` previously had no
failure handling at all, so a mis-registered slug would have left an invisible
element holding a reserved slot open. It now unmounts itself and reports upward so
the tile can fall through.

**These are local only** — appended in memory, in the browser, in a development
build, behind an explicit `?fixtures=` parameter. `process.env.NODE_ENV` is inlined
at build time, so the whole module is dead-code-eliminated from a production bundle.
Nothing is inserted anywhere.

---

## 2. Image transfer sizes and lazy loading

### Lazy loading — working

With 44 tiles on screen: **5 image requests, 0 of 32 off-screen tiles loaded**.
Loading attributes came out `{ eager: 5, lazy: 18, none: 0 }` — nothing is missing
an attribute, so nothing is loading by accident.

### Transfer sizes — the real finding

Measured with `cache: 'no-store'`, four parks, all four eager because all four are
in the first row:

| Park | Bytes |
|---|---|
| Bloblands | 113,836 |
| Stockwell | 150,370 |
| The Grove | 96,250 |
| Crystal Palace | 81,782 |
| **Total** | **442,238 (432 KB)** |

You were right not to accept dimensions as an answer. The problem isn't that the
files are large for what they are — it's that **the cutouts bypass the image
optimiser entirely**. They're raw `<img>` tags served straight from `/public` at
1920×1080 into a ~532px slot: 3.6× oversized per axis, ~13× the pixels needed, with
no `srcset`, so a phone downloads the desktop asset.

The contrast is visible in the same grid. The *photographic* fallback goes through
`next/image` and behaves correctly — `sizes` resolves properly and `currentSrc`
picked the `w=256` tier for a small box. So the machinery is there; the cutout path
just isn't using it.

432 KB above the fold on a phone is not fine, and it gets worse per park added.

**Recommendation, not done:** move `ParkCutout` to `next/image`. The reason I
stopped rather than doing it is that the cutout's sizing math reads the natural box
and normalises against measured ink, and `next/image` changes the layout box — that
wants its own pass with the map preview re-verified alongside the grid, not a
change smuggled into this one. Say the word and it's a contained job.

---

## 3. Prominence — my eye, and the numbers behind it

**One park does look noticeably weak: Crystal Palace.**

Equal 88% width does deliver consistency — all four hit exactly 88.0%. But width
isn't mass, and the tiles disagree once you look:

| Park | Ink *box* as % of tile | Actual *opaque pixels* as % of tile |
|---|---|---|
| Bloblands | 54.8% | **37.4%** |
| The Grove | 63.8% | 32.3% |
| Stockwell | 58.2% | 32.1% |
| Crystal Palace | 67.1% | **25.5%** |

Note the inversion: Crystal Palace has the *largest* bounding box and the *least*
ink. Measuring alpha coverage inside each box explains it — Bloblands fills 68% of
its box, Crystal Palace only 38%. It's a thin curved ribbon sweeping corner to
corner, so a box-based rule hands it the most room and it fills the least of it.
On screen it reads about a third lighter than Bloblands and leaves a large dead
corner in its tile.

**My recommendation: leave the sizing rule alone.** Three reasons:

1. Enlarging Crystal Palace to match on ink area needs ~1.21×, which puts its box
   past the frame — it would crop, and cropping a whole silhouette is the thing
   this pass exists to prevent.
2. There's nothing to reclaim. Its ink already occupies 93% × 80% of the source
   image, so there's no transparent margin to crop away.
3. The thinness is true. Crystal Palace *is* a narrow ribbon, and a directory whose
   thumbnails all carry identical visual weight has stopped telling you the shape
   of the parks.

If parity matters more than that, it's an **asset** decision rather than a CSS one:
re-render Crystal Palace from a camera angle that gives the arc more apparent mass.
No code change would fix it honestly.

---

## 4. Scroll reveals

`components/Reveal.tsx` — one grouped fade per section, three on the park page
(editorial band, photos, Scout notes). Opacity plus 10px of rise to give the fade a
direction. No stagger, no scale, no per-child delay, and it fires once — scrolling
back up doesn't replay it.

Content is **visible by default** and hidden only once the script has decided to
animate it, so a failure of the observer, the script or hydration leaves the page
fully readable rather than blank.

Two bugs found and fixed while getting it working:

**The transition was on the wrong state.** `.is-armed` declared both `opacity: 0`
*and* the transition, so arming a section didn't hide it — it started a 550ms fade
*out* of content the reader could already see, then faded it back in. A transition
is selected from the *after-change* style, so the fix is to declare it only on the
destination `.is-in`: arming becomes an instant cut (no transition to interpolate),
the reveal still animates.

This also explains a diagnostic that had me going in circles: a running CSS
transition outranks even an inline style, so `el.style.opacity = '0'` computed to
`1`, which looks impossible until you find the transition.

**Sections already on screen were being revealed.** On a restored scroll position
or a deep link, coming back half way down a park hid what you were reading and
faded it in at you. `Reveal` now declines to arm anything already within the
viewport at mount — a section you can see isn't a section that arrives. The
threshold matches the observer's own `-10%` margin so the two can't disagree.

Verified by sampling the transition frame by frame: armed sections sit at exactly
`opacity: 0 / translateY(10px)` with no animation attached; on reveal they
interpolate 0 → 0.07 → 0.54 → 0.88 → 0.99 → 1 over 550ms with the rise unwinding in
step. On a restored scroll at y=981 the two visible sections stayed plain and
unarmed at full opacity while the one below the fold stayed armed.

Reduced motion declines to arm at all, with a stylesheet-level guard for a
preference changed after mount.

---

## 5. Footer

**Logo fade — no layout movement.** `FooterWordmark` drives `opacity` only, from
scroll progress across the last stretch of the page. The earlier `translateY` is
gone, so nothing reflows as it appears. Reduced motion skips straight to full
opacity.

**Parks link removed.** The header carries Parks on every page, permanently and in
the same place; a second copy at the foot was the footer repeating the nav rather
than doing anything of its own.

**About / contact — a decision for you, not a link I can add.** Neither route
exists (`app/` has no `about` or `contact`), so either link would 404 today. That's
a question about what pages Scout has, not about what the footer lists — build the
page and the link follows. The reasoning is left in a comment at the site so it
doesn't get re-litigated.

**Privacy** is the same shape of question and is deliberately still open: what a
privacy link has to *say* depends on what the site actually collects. Kept separate,
as you asked — not guessed at here.

The footer is now the copyright line and the one social account (the existing
Instagram link, unchanged), which is the whole of what it honestly knows.

---

## Open, in the order I'd take them

1. **`ParkCutout` → `next/image`** — the 432 KB finding above. Contained, needs the
   map preview re-verified alongside the grid.
2. **Privacy audit** — still yours to start; it determines the privacy link and any
   consent controls.
3. **Crystal Palace asset** — only if you want thumbnail parity enough to re-render it.

## A note on verification

The browser pane doesn't composite unless a screenshot forces it, so CSS
transitions, smooth scrolling, IntersectionObserver and lazy image loads all freeze
mid-flight. Several apparent failures in this pass were that and not the code.
Everything above was read out of the DOM and the network log rather than judged from
a screenshot — except the prominence call in §3, which is a screenshot judgement
because it has to be.
