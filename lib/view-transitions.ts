/**
 * View-transition identities for the park page.
 *
 * There used to be three, shared with the homepage hero — park name, catalogue
 * mark and address — so the trio morphed from the home hero into the park page.
 * That is gone. It read as glitchy (the title flew into position while the
 * destination hero was still resolving behind it, so the one composed thing on
 * screen was the piece that moved), and because the two routes named the same
 * elements identically while an App Router transition mounts both route trees
 * at once, React reported "two <ViewTransition name=...> components with the
 * same name mounted at the same time" on every Home to featured-park click.
 *
 * Home to park is a plain root crossfade now; the timing lives in
 * app/globals.css.
 *
 * What survives is park to park, which is a different navigation with a
 * different job: stepping through the catalogue with the header's prev/next
 * arrows slides the title in the direction of travel, so the archive reads as
 * a strip being scrolled rather than a page being replaced. That needs a name
 * on the title — a view-transition-class only applies to an element that has
 * one — and it cannot collide, because the two parks either side of a step
 * always have different slugs.
 */
export function parkTitleTransitionName(slug: string): string {
  return `park-name-${slug}`;
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
