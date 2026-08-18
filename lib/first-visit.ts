/**
 * First-visit gate for the homepage hero entrance (see components/HeroEntrance).
 *
 * The cookie is read on the server, in the page's own render, rather than by a
 * client hook. A hook can only resolve after hydration, which means a returning
 * visitor either sees a frame of the pre-animation state or the hero has to be
 * held back until JS runs — both of which the entrance spec rules out. Reading
 * it here means the very first painted HTML is already the correct one: clipped
 * for a first visit, final for everyone else.
 *
 * Deliberately free of `next/headers` so <HeroEntrance>, a client component, can
 * import the same constants without pulling server-only code into the bundle.
 * The read itself is one line in app/page.tsx.
 */

export const VISITED_COOKIE = "scout_visited";

/** ~1 year. The entrance is a first-impression beat, not a recurring one. */
export const VISITED_MAX_AGE = 60 * 60 * 24 * 365;
