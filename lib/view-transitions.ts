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
