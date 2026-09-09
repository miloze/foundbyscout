// ── Development-only park fixtures ───────────────────────────────────────
//
// The live catalogue is four parks, which is too few to see any of the
// problems the index will actually have: whether the column scrolls, whether
// its scrollbar is findable, whether selecting a park off the map reveals its
// row without throwing the page around, and what a long name does to a row.
// Four rows fit on screen, so every one of those questions answers itself
// falsely.
//
// These fill the column out locally. They are never inserted anywhere — they
// are appended to the fetched array in memory, in the browser, and only when
// all three of these hold:
//
//   - the build is a development build
//   - the URL asks for them, via ?fixtures=<n>
//
// process.env.NODE_ENV is inlined at build time, so the `development` check is
// a literal `false` in a production bundle and the whole module is dropped by
// dead-code elimination rather than merely going unused.
//
// Usage:  /parks?fixtures=80

/** The shape the map needs. Structurally the same as its Park type; kept local
 *  so the fixture module never becomes something the real types depend on. */
export type FixturePark = {
  id: string; slug: string; name: string; postcode: string; location: string;
  borough: string; lat: number; lng: number; type: string;
  is_covered: boolean; is_free: boolean; opened: string; builder: string;
  hero_image: string; brief: string;
  catalogue_id: string | null; sort_order: number | null;
  directory_image_url: string | null;
  address: string[] | null;
  // The grid's index reads these two as well.
  thumbnail: string | null;
  gallery_images: string[] | null;
};

/**
 * The slug the dev cutout register points at a file that does not exist.
 *
 * Every published park now has artwork, which means the grid's photographic
 * path, its empty plate and the cutout's own failure handling are all
 * unreachable from real data — the three states most likely to break unnoticed.
 * Fixture 0 always takes this slug so the broken-cutout case is one URL away.
 */
export const BROKEN_CUTOUT_SLUG = "fixture-art-broken";

/** Which image treatment a fixture carries, so every branch of the tile is
 *  represented in any run of four or more. */
export type FixtureArt = "broken-cutout" | "photo" | "broken-photo" | "none";

export function fixtureArt(i: number): FixtureArt {
  return (["broken-cutout", "photo", "broken-photo", "none"] as const)[i % 4];
}

const AREAS = [
  ["SE15", "South London", "Southwark"], ["E9", "East London", "Hackney"],
  ["NW5", "North London", "Camden"], ["W10", "West London", "Kensington"],
  ["BS3", "Bristol", "Bristol"], ["M14", "Manchester", "Manchester"],
  ["LS6", "Leeds", "Leeds"], ["EH6", "Edinburgh", "Edinburgh"],
  ["CF24", "Cardiff", "Cardiff"], ["NE6", "Newcastle", "Newcastle"],
];

const TYPES = ["Bowl", "Street", "Transition", "Plaza", "DIY", "Mini ramp"];

// Deliberately includes names well past what a 300px column can hold on one
// line: an index that only ever sees "Stockwell" never shows what wrapping,
// ellipsising or a two-line row does to the rhythm of the list.
const NAMES = [
  "Hollow", "Marsh Lane", "The Undercroft", "Kings Reach", "Bellenden Road",
  "Saint Augustine's Recreation Ground Concrete Bowl", "Northolt", "Gasworks",
  "Quarry", "The Long Meadow Transition Park And Community Space",
  "Brickfields", "Cripplegate", "Watermead", "The Steps", "Ironmonger Row",
];

/** How many fixtures the URL is asking for, or 0. Dev builds only. */
export function fixtureCount(search: string): number {
  if (process.env.NODE_ENV !== "development") return 0;
  const n = Number(new URLSearchParams(search).get("fixtures"));
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 300) : 0;
}

/**
 * `count` synthetic parks, scattered across the UK so markers do not stack.
 *
 * Deterministic rather than random: a list that reshuffles on every reload
 * cannot be used to check that a scroll position survived a view switch.
 * `startOrder` continues the catalogue numbering after the real parks so the
 * marks stay unique and the sort order the map relies on is not disturbed.
 */
export function makeFixtureParks(count: number, startOrder: number): FixturePark[] {
  return Array.from({ length: count }, (_, i) => {
    const [postcode, location, borough] = AREAS[i % AREAS.length];
    const name = NAMES[i % NAMES.length];
    const n = startOrder + i;
    const art = fixtureArt(i);
    // A real file, so the photographic path renders something rather than
    // failing its way to the plate. It is another park's photograph, which is
    // exactly why fixtures never reach the archive audit: that audit flags a
    // file shared between parks as a placeholder, and here it deliberately is.
    const photo = "/images/parks/the-grove/hero-01.webp";
    return {
      id: `fixture-${i}`,
      slug: art === "broken-cutout" && i === 0 ? BROKEN_CUTOUT_SLUG : `fixture-${i}`,
      name: `${name} ${Math.floor(i / NAMES.length) + 1}`,
      postcode: `${postcode} ${1 + (i % 9)}AA`,
      location, borough,
      // A shallow spiral over Britain — spread enough that markers are
      // separable, tight enough that they share a sensible starting view.
      lat: 51.5 + Math.sin(i * 0.7) * (2.4 + i * 0.02),
      lng: -1.2 + Math.cos(i * 0.7) * (2.2 + i * 0.02),
      type: TYPES[i % TYPES.length],
      is_covered: i % 5 === 0,
      is_free: i % 3 !== 0,
      opened: "", builder: "",
      brief: "",
      catalogue_id: null, sort_order: n,
      address: null,
      // One of each: a photograph that loads, a path that 404s so the
      // candidate walk and its onError are exercised, and nothing at all so
      // the empty plate is.
      directory_image_url:
        art === "photo" ? photo
        : art === "broken-photo" ? `/images/parks/__fixture__/missing-${i}.webp`
        : null,
      hero_image: "",
      thumbnail: null, gallery_images: null,
    };
  });
}
