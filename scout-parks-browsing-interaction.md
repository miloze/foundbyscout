# Parks map — selected-park browsing interaction

Status: **local, not committed, not deployed.** Build passes (exit 0), types
clean. Lint down to **1 warning from 2** — the remaining one is pre-existing.

Done in the order you set: correctness first, then motion, then controls.

---

## 1. Filter/index desync — fixed

`carouselIdx` was **state**, set when a park was opened and when the carousel
stepped, and nothing recomputed it when the search string changed the results
underneath it. It is now **derived** from the selection and the current
results, so it cannot go stale — there is no moment at which it needs
resyncing, because it stops being a value that can be wrong.

Proven with the case that discriminates old from new:

| | Old (stored) | New (derived) |
|---|---|---|
| Crystal Palace, no filter | 3 of 4 | **3 of 4** |
| Same park, filtered to 3 results | 3 of 4 *(wrong)* | **2 of 3** |
| Selected park excluded, 3 results remain | "1 of 3", steps to the wrong park | **"3 parks", both disabled** |

`-1` — the selected park is not in the current results — is a real state, not
an error. The park stays selected on the map, stepping is disabled rather than
guessing an anchor, and the indicator reads "3 parks" instead of claiming a
position among parks it is not one of.

Zero results and one result both hide the stepper entirely.

## 2. Bounded browsing

No wrapping. `1 of 4` has Previous disabled, `4 of 4` has Next disabled, and
pressing a disabled end does nothing. Disabled rather than removed, so the
layout does not move when you reach an end.

## 3. Artwork stays non-clickable

No tap target added. I also removed the **last** click handler that was on it —
the photographic fallback still had a `router.push` — which left `useRouter`
unused, so that went too. Nothing in the artwork layer is interactive now.

## 4. Reduced motion, including map travel

`panTo`, `fitBounds` and the locate `flyTo` all honour it now: same
destination, arrived at instantly. Worth stating why this needed doing by hand
— the `prefers-reduced-motion` media query reaches CSS, and Leaflet's camera is
not CSS. The artwork slide and the exit layer are suppressed too.

## 5. Downward dismissal removed

Gone, along with the `dismiss` callback and the vertical drag feedback that
translated the sheet. It was an invisible gesture with no control advertising
it, clearing the preview for a reader who had no way of knowing they had asked
for that — the same reasoning that removed the up-swipe.

Vertical is still **detected**, so a scroll down the page is never mistaken for
a step; it simply does nothing. Browsing is horizontal, opening is the arrow.

---

## 6. Artwork slides, text stays put

Two animations, deliberately different:

- **Artwork travels** — it is the thing being browsed, and the direction says
  which way through the catalogue you are going. Stepping forward pushes the
  old park off to the left as the next arrives from the right.
- **Text only fades.** Its box, baselines and reserved title height are the
  whole point of the layout; sliding the identity block would undo it.

Driven from script (Web Animations API) rather than CSS, because a park change
reuses the same DOM nodes — a CSS animation would have to be restarted by
remounting, and remounting the artwork means reloading its image.

The outgoing park stays mounted for the 220ms, absolutely positioned over the
same reserved slot so it cannot affect the bar's height, and **paired with its
own park** — never the new name over the old picture. Both layers are
`aria-hidden` and pointer-transparent, so a second copy for a fifth of a second
adds nothing focusable or readable.

A selection made from a **list row or a marker gets the fade with no
direction**. Those are jumps, not steps, and an arbitrary left-or-right journey
would invent a relationship between two parks that has none.

220ms — mid-range of the 200–250 you asked to trial.

## 7. Stepping controls and position

`‹ 3 of 24 ›` replaces the row of dots. Dots needed a seven-wide sliding window
to survive a real catalogue and still said nothing useful: "one of these seven"
is not a position in a directory of hundreds.

- Real `<button>`s labelled "Previous park" / "Next park", 44px targets,
  visible focus rings, disabled at the ends
- **Desktop**: with the action, left of View park — both are things you do, and
  the identity block between them stays a block of statements. It shifts View
  park left by a fixed amount, the same for every park, so no anchor moves.
- **Mobile**: above the sheet, where the dots were
- A polite live region announces "Crystal Palace, 3 of 24" once per settled
  selection. The visible count is `aria-hidden` so it is not said twice, and
  nothing announces animation frames.

---

## Verified

- **Text does not move while browsing.** Every anchor — bar height and top,
  title left and top, catalogue mark, location baseline, artwork slot, action
  position — is identical across four consecutive steps.
- **Map drags pass behind the overhang.** At a real 24px overhang, every sample
  point right across the silhouette above the bar hit-tests to the Leaflet
  container. Both artwork layers are now explicitly `pointer-events: none`
  rather than relying on where the boxes happen to fall.
- **Swipe steps both ways**; swipe down leaves the sheet alone.
- **Rapid alternating input settles coherently**: name, count, list highlight
  and exactly one selected marker all agree, with no leftover exit layers.
- Bounded ends, zero results, one result, and selected-park-excluded all behave
  as described above.

## Noticed, not touched

The map's filter matches only **name and location**, while the accordion's
search dropdown also matches **postcode and address**. So typing "SE2" offers
parks in the dropdown but empties the map. Pre-existing, unrelated to this
pass, and a one-line change if you want them reconciled.

## Not attempted

Keyboard arrow-key shortcuts. The brief listed them as optional and warned
against intercepting typing in search or Leaflet's own keyboard navigation —
the stepper buttons already give keyboard users a way through, so the extra
surface did not seem worth the risk without a decision from you.
