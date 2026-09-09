# Scout — thumbnail completeness, and Found Object browsing

Nothing deployed, nothing committed. Three briefs landed during this pass; this
covers all of them.

---

## 1. Complete images in every thumbnail (Map and Grid)

**Done and verified.** Nothing is cropped on either surface.

| Change | Where |
|---|---|
| Photographic thumbnails `cover` → `contain` | `.pcard-thumb img`, `.pgv-frame img` |
| Cutout box derived from the asset's own canvas ratio | `--src-aspect`, published by `cutoutVars` |
| Hover lift on photographs: scale → brightness | `.pgv-tile:hover .pgv-frame img` |
| `object-position` biases removed | peek and strip thumbnails |

Three things worth calling out:

**The hover scale had to go on photographs.** A contained photograph already
touches its frame on the binding axis, so *any* scale above 1 crops it — the
exact thing this pass exists to stop. Cutouts keep the 1.02 lift because they
are sized to 88% of the frame and have room to grow. Two hover responses in one
sheet is a real inconsistency and it is the honest one: only one of the two
kinds of tile has room to move.

**A latent conflict is now settled.** `.pcard-cutout img` and `.pgv-frame img`
both specified `object-fit` at identical specificity, so which won depended on
the order the two components happened to inject their stylesheets. They now
agree.

**The 16:9 assumption is gone.** The cutout's box was built from a hardcoded
`16 / 9`, true of every current export and silently wrong the first time it
isn't — the box would stop matching the file, `object-fit` would letterbox
inside it, and the ink fractions would no longer describe where the park is.
That is exactly what an image optimiser would introduce, so the canvas ratio is
now a property of the asset.

### Verified by measurement, not by eye

A probe walked every thumbnail on both surfaces, computed each image's *visible*
rect (ink box for cutouts, the contained rect for photographs) and checked it
against every ancestor that actually clips:

- **Grid:** 0 clipped of 6, cutouts at 88.0% width with no box/file mismatch.
- **Map:** 0 clipped, stepping through all four real parks plus fixtures with
  photographic fallbacks, at **375 / 820 / 1024 / 1366**.
- **Proof that `contain` bites:** a deliberately square source in a 16:9 frame
  renders at **56.2% × 100%** — whole, letterboxed. Under `cover` it would have
  had its top and bottom thirds cut off.

---

## 2. Found Object — what was configured

Two objects, and this gated everything else, so it is stated first:

| Object | Feature | Scan |
|---|---|---|
| Bloblands | Volcano | 5.08 MB, on the CDN |
| Stockwell | Ledge | 4.65 MB, on the CDN |

Both configured *and* present on R2, so the controls are functional rather than
decorative. **With two, one arrow is always disabled** — bounded browsing means
at the first object there is no previous and at the last no next. That is honest
with a set of two and will simply stop being noticeable at four. If it reads as
broken to you before then, wrapping is a one-line change, but it makes the
position count a lie, so I have not made it.

**Nothing was substituted.** These are the actual `feature.glb` scans; no
whole-park thumbnails stand in for them.

**No prefetch.** The scans carry no `Cache-Control` header, so a speculative
fetch of the neighbour risks paying for the same 5MB twice. The first step to an
object costs a real download — about 3 seconds on this connection — during which
the controls dim and refuse input rather than sitting live over an empty stage.
Spending 4.65MB on every visitor to save the few who press an arrow is the wrong
trade; if the assets get cache headers, prefetching becomes worth revisiting.

---

## 3. The motion

### What it does now

Next: the current object exits completely past the **left** edge while the next
enters from beyond the **right**. Previous reverses both. They move **together**
on one track, 350ms, flat ease-in-out. No spring, no overshoot, no bounce, no
rotation or scale change — each object holds its settled dimensions from the
first frame of the transition to the last.

Travel is **1.25 × the frame's own width in world units**, computed from the
camera and the current aspect, so an object is fully outside the visible area
before it stops rather than clipping at the edge with a corner still showing.

The oversized title does **not** travel. It crossfades where it stands.

### The structural change this required

The camera used to be solved per object — it moved until *that* object's
silhouette filled the frame. That is fine for one object and impossible for two:
a camera fitted to one frames the other wrongly, so the incoming object would
have arrived at the wrong size and snapped to the right one on landing. That is
precisely the scale change the brief rules out.

So the camera is now **fixed** and each object is fitted to it instead. The
fitting rule, its sampling loop and the `FRAMING` constant are unchanged — the
loop now solves for the object's scale rather than the camera's distance.
Scaling the world about the camera's target and scaling the camera's distance
are the same projection, so **what lands on screen for a single object is
exactly what landed before**. I checked this against the pre-change screenshots:
the framing is identical.

That decoupling is also what lets the word planes sit outside the moving track.
They are the ground the objects cross, not passengers on it — which is what
keeps a 92vw word from sweeping across the page on every step, while preserving
the occlusion (the scan is opaque and drawn first, so it genuinely interrupts
the type).

### No page overflow

`scrollWidth === clientWidth` throughout, at every width tested. It costs no
overflow rule: the canvas is the section's own width and WebGL draws only inside
it, so the clip is structural.

---

## 4. Side arrows

The site's own MSCHN `←` / `→` in accent orange — not a new icon language.

- **Hit areas flank the artwork**, `clamp(56px, 13%, 148px)` wide, full stage
  height. The ceiling is what keeps them clear of the object at large widths;
  nothing invisible sits on top of the thing the section is about. Measured:
  56px each at 375, 107px at 820.
- **Fixed positions on the grid.** Each arrow sits on the content column's outer
  vertical, rebuilt from the same two tokens the grid marks use — a line that is
  already drawn, not a position invented for it.
- **Opacity only.** With a pointer they are absent until their side is hovered or
  the button is focused. Nothing moves, so nothing can be chased.
- **Touch does not depend on hover.** Where `hover: none` matches they are simply
  always visible, smaller (26px) and quieter. Targets measure **44 × 44** at
  every width.
- **Real buttons**, labelled Previous object / Next object, with an accent focus
  ring.
- **`aria-disabled`, not `disabled`.** Disabling the element a keyboard reader is
  standing on moves focus to the body — arrowing to the last object threw you out
  of the control you were using, and the arrow back was then nowhere. Verified:
  focus stays on the button through a step.

The position indicator stayed, moving to the far end of the action row opposite
View park, on a fixed width so neither it nor View park moves when the number
changes.

---

## 5. Bugs found and fixed while building this

**Objects drifted out of frame after a there-and-back.** `useGLTF` caches by URL
and hands every caller the same `Object3D`. Survivable with one object on stage;
not once a step puts two there, because the arriving object is mounted in the
incoming slot and re-mounted in the current one when the step lands. For one
commit the same node was claimed by two parents, and where it ended up depended
on which of add/remove ran first — the ledge came back sitting above and left of
the frame. Each slot now takes `scene.clone(true)`, which copies the node graph
and shares geometry, materials and textures by reference. Confirmed fixed across
a full round trip.

**The centring was not idempotent.** The fit subtracted the centroid from the
object's current position, so revisiting an object re-centred an
already-centred scene and it walked out of frame a step at a time. It now
measures from the object at its own origin and scale.

**A drag starting on an arrow stepped twice** — once for the gesture, once for
the trailing click the browser delivers at the end of a pointer sequence. The
click is now swallowed in the capture phase. Measured directly: a plain tap
delivers **1** click to the button, a drag starting on it delivers **0**.

---

## 6. Verification

Run at **375, 820, 1024, 1280, 1366**.

| Check | Result |
|---|---|
| Exits/entries both directions | Confirmed; a captured frame shows the volcano entering from the left while STOCKWELL is still up |
| Horizontal page overflow | None — `scrollWidth === clientWidth` at every width |
| Complete silhouette when settled | Confirmed at every width, both objects, after round trips |
| Text/control positions stable | Fixed-width count, anchored rows; nothing moves on a step |
| Content coherence | Count, feature line, location, coordinates, View park href and the status line all update together |
| Bounds | First/last disable the unavailable direction; no wrap, no rubber band |
| **Rapid alternating input** | 10 presses inside one slide produced **exactly one** step, with content coherent afterwards |
| Trailing-click guard | Tap → 1 click; drag → 0 clicks |
| Keyboard | Tab to each button, Enter, and Arrow keys; focus retained through updates |
| Swipe / drag | Steps once at the threshold; no rubber band; a vertical gesture over the object or over an arrow does not step |
| Vertical page scrolling | Preserved — wheel over the stage scrolled 1539 → 1839 with no step |
| Reduced motion | Content replaced within 60ms, no travel, all transitions 0s |
| Single-object state | Controls omitted entirely when `items.length < 2` |
| `tsc --noEmit` / eslint | Clean on every file touched |

**Model interactions:** the found-object stage has no OrbitControls and never
did — the turntable is automatic and the canvas is `aria-hidden`. So the side
areas removed nothing. (The park-detail viewer, which *does* have controls, is
untouched.)

### What I could not verify here, and you should look at

**The feel.** You were right that screenshots cannot establish it. This browser
pane only paints while a screenshot is being taken, so a 350ms slide completes
between two captures; it also refuses real drags while it is hidden, so the
mouse-drag path was exercised through synthetic pointer sequences rather than a
genuine drag. I slowed the slide to 2.6s temporarily to catch frames — that is
how the entering-from-the-left capture exists — and restored 350ms afterwards.
**350ms with that ease is a starting point, not a judgement.** Please run it and
tell me if it wants to be faster or slower.

**The true iPad arrow branch.** At 820 the pane still reports `hover: hover`, so
it showed the hover-revealed arrows. The persistent touch arrows were verified at
the 375 preset, which does report `hover: none`. On a real iPad you would get the
touch treatment; I could not make this pane produce it at tablet width.

---

## Still open, unchanged from the last pass

1. **`ParkCutout` → `next/image`** — the cutouts still bypass the optimiser:
   432 KB above the fold, raw 1920×1080 into a ~532px slot, no `srcset`. Worth
   doing, and it wants the map preview re-verified alongside the grid because
   `next/image` changes the layout box the ink normalisation depends on.
2. **Privacy audit** — still separate, still yours to start.
3. **Crystal Palace** — noticeably lighter than the others (25.5% ink coverage
   against Bloblands' 37.4%) because it is a thin arc filling 38% of its own
   bounding box. My recommendation stands: leave the sizing rule alone; if you
   want parity it is an asset decision, not a CSS one.
