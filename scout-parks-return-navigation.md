# Parks — opening arrow and return navigation

Status: **local, not committed, not deployed.** Build passes (exit 0); lint and
types show no new findings.

Two things: the preview arrow is now horizontal, and a park page can get you
back to where you were browsing.

---

## 1. The opening arrow

`↗` → `→`, same reserved 44px slot, same accent orange, same 44×44 target,
same accessible name (`View Bloblands`). The hover nudge changed with it —
horizontal 4px, which is now literally the caret travel `.fbs-cta` uses rather
than a diagonal cousin of it.

**Desktop is untouched**: still the labelled `View park` button
(`.fbs-cta--accent`), no arrow-only control anywhere on the desktop bar.
Verified by measurement, not by eye.

I raised the "a right arrow at the right edge of a swipeable row could read as
*next park*" objection in the previous pass and it was decided against, which
is the user's call. What now carries the distinction is everything except
direction: the arrow is accent orange where no browse affordance is, it sits
bottom-right while the carousel dots sit top-centre, and it is the only control
in the sheet. Worth a look in use — it is the one part of this I would want
watched.

Swipe still cannot open a park: the link cancels its own default when a drag
was recorded, so a gesture that starts on the arrow changes park rather than
navigating.

---

## 2. Return control on the park page

New: `components/ParkReturnLink.tsx`, rendered above the hero.

| Arrived from | Label | Destination |
|---|---|---|
| Map | ← Back to map | `/parks`, restored |
| Grid | ← Back to grid | `/parks?mode=grid`, restored |
| Anywhere else | ← View on map | `/parks?park=<slug>`, focused on this park |
| …with no coordinates | ← Back to parks | `/parks` |

Set in DM Mono, uppercase, wide tracking — the site's small-label voice — with
`←` and a reversed version of the CTA's hover nudge. A real `<Link>`, 44px
tall, accent focus ring.

**Not `history.back()`.** A park page can be the first entry in a tab's
history or arrived at from a search engine, where "back" means leaving the
site. Normal browser Back still behaves normally; this is a second, explicit
route that always lands somewhere known.

**Origin is matched by slug, not just by mode.** Recording only "you were last
in Map" makes every park page claim you came from the map — including one
opened from the home page an hour later in the same tab. Matching the slug
means "Back to map" appears exactly when *this* park was the one opened from
the directory, and the honest fallback appears otherwise.

---

## 3. Restoring the browsing session

Extends the existing `components/parksGridState.ts` rather than adding a
parallel store — Grid mode, density and scroll already lived there, so origin,
map view and search now ride in the same session record.

Saved: map centre, zoom, selected park (by slug), list scroll, and the search
string. Written on every settle (`moveend`/`zoomend`, selection change, list
scroll) because there is no reliable unload hook for a client-side navigation.

Read back on mount in priority order: an explicit focus request, then the
snapshot, then — only if there is no snapshot — the random London park the map
has always opened on.

`?park=<slug>` is new, and is what "View on map" points at: it focuses that
park instead of the random pick. Consumed once, so it cannot re-centre the map
under someone who has since panned away. An unknown slug is ignored rather than
erroring.

### Verified round trips

- **Map → park → Back to map**: The Grove still selected, centre
  51.4402/−0.0688, zoom 14 — all preserved. Repeated with Bloblands after the
  final refactor: same result.
- **Grid → park → Back to grid**: origin `{grid, the-grove}`, lands on
  `/parks?mode=grid`, session holds `mode: "grid"`, `scrollY: 141`.
- **Direct visit → View on map**: no session, label falls back correctly, lands
  on `/parks?park=crystal-palace` with **Crystal Palace selected** rather than a
  random park.
- **Desktop**: labelled CTA unchanged, origin recorded, return control resolves.

---

## Three bugs found by testing

1. **The return control was invisible.** Correct in the document, painted over
   on screen: the hero is pulled up under the fixed nav with a relative offset,
   so it covers anything preceding it in the flow. Fixed with a stacking
   context, not by moving it.
2. **It sat under the logo on desktop.** The wordmark overhangs the nav bar —
   bottom at 81px on a phone, 106px on a desktop — so one flat top padding
   cleared it at one width and not the other. Now offset from
   `--logo-bottom`/`--nav-height`, which is the same pair
   `ParksDirectoryAccordion` sizes its own bar from. Measured clear at both:
   93 vs 81 on mobile, 118 vs 106 on desktop.
3. **The map snapshot was being destroyed before it was read.** Leaflet fires
   `moveend` while setting its own opening view, and the parks list the restore
   needs arrives only after the Supabase round trip — so the default UK view
   overwrote the saved one several hundred milliseconds before anything tried
   to use it, and "Back to map" returned to the default every single time.
   Nothing is written now until the stored view has been consumed.

Also corrected: my first version of the return control called `setState` inside
an effect to read sessionStorage, which is the cascading-render pattern React
lints against — it was a genuine error, not a warning. Rewritten with
`useSyncExternalStore`, which is what `parksGridState` already uses to read the
query string.

---

## Files

- `components/ParkReturnLink.tsx` — **new**
- `components/parksGridState.ts` — origin, map snapshot, search persistence
- `components/ParksMap.tsx` — snapshot save/restore, origin on both map links
- `components/ParksGridView.tsx` — origin on tile links
- `components/ParksDirectoryAccordion.tsx` — search persistence, `?park=`
- `components/ParkCard.tsx` — horizontal arrow; `ParkCardCTA` takes an `onClick`
- `app/parks/[slug]/page.tsx` — mounts the return control, computes `hasCoords`

## Caveats

- **Grid scroll restore** writes through `requestAnimationFrame`, which the
  test browser freezes unless a screenshot forces a paint. Verified by forcing
  paint; it is pre-existing behaviour that I confirmed rather than changed.
- **A stale origin cannot mislabel**, but it can go missing: opening the same
  park twice from different places in one session leaves the most recent
  origin, which is correct. Clearing session storage falls back to "View on
  map", which is always valid.
- Parks with no coordinates get "Back to parks" — no invented location. None of
  the four current parks exercises this path, so it is reasoned rather than
  observed.
