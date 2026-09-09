# Park hero — arrangement, return arrow, and the removed drag hint

Status: **local, not committed, not deployed.** Build passes (exit 0), types
clean, no new lint findings.

Three pieces of work, in the order they were asked for.

---

## 1. Hero arrangement

**The return control moved into the hero**, directly above the park title, as
part of the bottom-left group: return → title → catalogue/coordinates →
address. It is a slot on `ParkHeroDetails` (`leadSlot`), so that component
still owns the group's rhythm.

**The standalone row above the hero is gone**, along with its clearance
padding. The hero now starts at the top of the viewport instead of being pushed
down by a row's full height — hero root top went from 71px to 0.

**The scan controls moved to the hero's top-right** as one group: image colour
and Explore 3D together, because both change how the scan is presented. They
were previously at the foot of the hero among the address and the scan date,
which put two actions in a row of statements.

**A restrained bottom scrim** was added — one gradient over the bottom 42%,
under the copy, pointer-transparent. Not a box per element and not a plate
behind the link. The title carries itself on size and the metadata chips have
their own dark backings, but an 11px control on a pale greyscale scan needed
the ground.

**Desktop is deliberately unchanged** beyond the return link's new home: it
keeps its existing viewer bar, and the mobile corner cluster does not render
there. The brief asked not to force an untested desktop rearrangement.

### Two bugs found placing it

- **The corner cluster landed inside the site nav.** My first clearance formula
  assumed the hero began at the nav's bottom; it actually begins at viewport 0,
  so `--logo-bottom − --nav-height` put the cluster at y=27, on top of the PARKS
  link. It now measures from `--logo-bottom` alone, which is the lowest the
  header reaches (the wordmark hangs below the bar). Verified at 95px, clear of
  both.
- **The link sat 20px left of the title**, then 10px: two stacked negative
  margins, then a specificity loss to source order. Each variant now carries its
  own pull-back, and the *mark* — not the touch target — lines up with the
  title.

---

## 2. Return arrow restyled to match the opening arrow

Same object as the map preview's park-opening arrow, reversed: MSCHN `←`, 23px,
`var(--accent)`, 44×44 target, the same 4px nudge on the same easing, the same
focus ring. It travels the way it points.

| Origin | Shows | Accessible name |
|---|---|---|
| Map | `←` only | "Back to map" |
| Grid | `←` only | "Back to grid" |
| Direct visit / no origin | `←` **View on map** | from the visible text |

Arrow-only where the destination is a view you were just in; labelled when
arriving cold, because a bare back-arrow would promise a history that may not
exist.

`--accent`, not `--pda-accent` — the latter is declared on the directory's
`.pda-root` and does not exist on a park page.

**Contrast**: orange on a greyscale scan is a strong hue contrast but a weak
luminance one, and several of these scans are pale concrete corner to corner.
The scrim does most of the work; each mark also carries a two-stop text-shadow
so it holds without a plate. Worth noting the hero's contrast is **the same in
both site themes** — the hero is the scan plus the scrim, and the light/dark
toggle does not touch it. Checked in both anyway.

**Navigation behaviour is unchanged**: origin-aware labels, session restore, and
the `?park=` focus fallback all still work. Verified map → park → back with the
selection, centre and zoom (51.4226/−0.0665, zoom 14) all intact.

---

## 3. GLB drag hint removed

Removed from `ParkModel.tsx`:

- the overlay with the curved `<path>` and the `.fbs-hint-dot` circle
- the `fbs-hint-drag` keyframes, the `.fbs-hint-dot` rule and its
  reduced-motion override
- `HINT_DISMISSED_KEY`, `hintDismissed`/`setHintDismissed`, `dismissHint`
- the canvas wrapper's `onPointerDown`, whose only job was dismissing it

Kept, having checked each first:

- `modelLoaded` — used in three other places (both preload branches and
  `autoRotate`)
- `useCallback` — still used by `handleLoad`
- OrbitControls, the loading states and every other interaction

Nothing clears session storage globally; the hint's key is simply never written
again. 1,661 characters removed.

**Verified**: the scan still loads and renders, the viewer still activates, and
the existing text instructions still appear — "scroll to zoom · drag to rotate"
is present in the active viewer. No `.fbs-hint-dot` in the DOM and no
`fbs-hint` rule in any stylesheet, in either the inline hero or the modal.

`ParkModel.tsx` reports 2 lint errors, and both are **pre-existing** — the file
gives an identical 6 problems / 2 errors / 4 warnings at `HEAD`, only the line
numbers shift.

---

## Verified across

- Mobile portrait 390×844, landscape phone 844×390, desktop 1440×900
- Both return variants, both site themes
- Return link 44px tall and hit-testing to itself at every width
- Corner cluster clear of the header, the logo overhang and the title
- No duplicate return link, no leftover row, no orphaned focus target
- No horizontal overflow

## Files

`components/ParkHeroShell.tsx`, `components/ParkHeroDetails.tsx`,
`components/ParkReturnLink.tsx`, `components/ParkModel.tsx`,
`app/parks/[slug]/page.tsx`
