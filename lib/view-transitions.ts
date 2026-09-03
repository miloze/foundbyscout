/**
 * Shared view-transition identities for the hero → park page navigation.
 *
 * The home hero and the park page hero render the same three facts — park
 * name, catalogue number, address — in different layouts, with different
 * markup, at different sizes. Giving each pair one matching
 * `view-transition-name` is what makes the browser treat them as one element
 * continuing into a new position rather than two elements being unmounted and
 * mounted. See app/globals.css for the timing applied to every group.
 *
 * Names are defined here rather than inline in either component precisely
 * because they have to match: a typo in one of the two files would silently
 * degrade to a crossfade with no error anywhere. Both consumers call this.
 *
 * Scoped by slug so two heroes for different parks can never claim the same
 * name — `view-transition-name` must be unique across the document at the
 * moment a transition starts. That matters the day the parks directory
 * animates a card into this same hero.
 *
 * Deliberately NOT included: the hero image. The homepage's beauty photo and
 * the park page's orthographic scan frame are genuinely different pictures,
 * and the flash-cut spec exists to mask exactly that swap. Naming it would
 * morph one into the other, which is the opposite of a cut.
 */
export function heroTransitionNames(slug: string) {
  return {
    /** MSCHN park name — the anchor of the whole transition. */
    name: `park-name-${slug}`,
    /** Catalogue number, e.g. 004. Inverted chip on home, accent tag on park. */
    catalogue: `park-cat-${slug}`,
    /** Address/location line. Condensed on home, fuller on the park page. */
    address: `park-address-${slug}`,
  } as const;
}

/**
 * Detail that exists only on the park page. These get names so they animate
 * as themselves — their own fade in, on the shared timing — instead of being
 * swept along in the root snapshot's whole-page crossfade. There is no home
 * counterpart by design: they are the "more detail appearing around it" half
 * of the continuity spec.
 */
export function parkDetailTransitionNames(slug: string) {
  return {
    scanned: `park-detail-scanned-${slug}`,
    coords: `park-detail-coords-${slug}`,
  } as const;
}

/**
 * Records which way the next park-to-park navigation is going, so the title's
 * view transition slides the right way — see the ::view-transition rules in
 * app/globals.css.
 *
 * It has to be an attribute on the document element because the
 * ::view-transition pseudo-elements hang off the root, not off whichever
 * component triggered the navigation, and it has to be written before the
 * navigation starts so the style is in place when the browser takes its
 * snapshots.
 *
 * It lived in ParkHeroDetails while the arrows flanked the title. The arrows
 * are gone and the trigger is the header cluster now, so it lives here — with
 * the rest of the transition's identities — rather than in whichever component
 * currently happens to own a button.
 */
export function markParkNavDirection(dir: "prev" | "next") {
  document.documentElement.dataset.parkNav = dir;
  // Cleared again once the transition has had time to start and finish, so the
  // flag only ever describes the navigation that set it. Without this it
  // sticks, and the next Back — or a park opened from Grid or the map —
  // inherits a direction it never asked for and slides the wrong way.
  // 500ms against a 260ms transition: if a slow route somehow overran it the
  // title would simply crossfade, the same graceful fallback as arriving with
  // no flag at all.
  window.setTimeout(() => { delete document.documentElement.dataset.parkNav; }, 500);
}
