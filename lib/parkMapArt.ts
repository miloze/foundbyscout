// ── Map-preview artwork ──────────────────────────────────────────────────
// Client-safe on purpose: ParkCard is a client component, and lib/parkImages
// reads the filesystem, so the two cannot be the same module.
//
// A park's map preview is not the same asset as its directory photograph. The
// photograph is a framed 16:10 export that fills its box (see
// DIRECTORY_ASSET_SPEC); this is a photogrammetry cutout on transparency — the
// park lifted off its surroundings, with alpha where the ground was.
//
// The two are drawn by different rules and, since the found-object treatment,
// in different places: a photograph is a thumbnail inside the information bar,
// while a cutout straddles the bar's top edge and rises over the map. Which of
// the two an asset is cannot be recovered from its URL, so membership of the
// map below is what carries it.
//
// Explicit per-slug, not a convention like `/images/parks/<slug>/map-thumb.webp`:
// a convention would claim every park has one, and the 404 would only show up
// as a hole in the bar at runtime. Parks absent from here fall back to their
// directory photograph, and parks with neither show no art at all.

/**
 * Where the park actually is inside its transparent canvas, as fractions of
 * the canvas — `w`/`h` are the silhouette's size, `cx`/`cy` its centre.
 *
 * This exists because the canvas lies about how big a park is. All three
 * exports are 1920x1080, but the silhouette fills between 78% and 93% of the
 * width and between 63% and 80% of the height, so sizing the *image* to a slot
 * makes Bloblands render visibly smaller than Crystal Palace for no reason a
 * reader could see — the difference is empty alpha, not the park. Scale is set
 * from these numbers instead, so what gets sized is the park.
 *
 * Measured off the alpha channel (any pixel over 8/255 counts as ink) rather
 * than eyeballed. The first three exports all came out centred, at 0.50/0.50 to
 * three decimals, and honouring cx/cy rather than assuming them was written as
 * insurance against an export that was not — Stockwell then turned up at
 * 0.449/0.426, its park sitting left of and above the middle of its canvas. It
 * lands in the same place as the others because the offsets are undone; had
 * the centres been assumed it would have hung up and to the right of its slot.
 */
export type ParkInk = { w: number; h: number; cx: number; cy: number };

export type ParkCutout = {
  src: string;
  ink: ParkInk;
  /**
   * Silhouette width over silhouette height. The slot reserves width from
   * this, because the treatment sizes every park to the same silhouette
   * *height* — a long thin park and a compact one then read as objects at one
   * scale rather than as one big picture and one small one.
   */
  aspect: number;
  /**
   * The *canvas* aspect — the whole file, transparent margin included, as
   * width/height. Distinct from `aspect` above, which is the silhouette.
   *
   * The layout needs both: it sizes the silhouette, then works back to the
   * image box that contains it, and that step needs the file's own ratio. It
   * used to assume 16:9 in the CSS, which was true of every export and would
   * have gone wrong silently the first time it wasn't — the box would no
   * longer match the image, `object-fit` would letterbox inside it, and the
   * ink fractions would then be measured against a box the ink no longer
   * fills, hanging the park off its slot.
   *
   * Optional because 16:9 is the export spec; state it only where an asset
   * departs from it. Re-encoding at a different canvas ratio is exactly the
   * kind of thing an image optimiser does, so this is where that gets
   * absorbed.
   */
  source?: number;
};

// The export spec, and the default for `source` above.
export const CUTOUT_SOURCE_ASPECT = 16 / 9;

/**
 * The widest silhouette the reserved artwork area is built to hold, as
 * width/height — the current widest is Bloblands at 2.512, and this carries
 * headroom above it.
 *
 * This constant is what keeps the park title from moving. The artwork area's
 * width is `silhouette height x this`, so it depends only on the breakpoint
 * and never on which park is selected. Every park is then drawn at the same
 * silhouette height and centred in that fixed area: Crystal Palace at 2.05
 * simply leaves more empty space either side than Bloblands does.
 *
 * Sizing the area to each park's own silhouette instead — which is what the
 * previous pass did — moved the title's left edge by up to 56px between parks.
 *
 * A future export wider than this is not broken by it: the slot clamps such a
 * park by width instead of height, so it renders slightly shorter than the
 * others but stays inside the reserved area and still moves no text. Raising
 * the number costs bar width; it is not a limit that needs to track the widest
 * asset exactly.
 */
export const CUTOUT_SLOT_ASPECT = 2.55;

export const PARK_MAP_ART: Record<string, ParkCutout> = {
  bloblands: {
    src: "/images/parks/bloblands/map-thumb.webp",
    ink: { w: 0.8911, h: 0.6306, cx: 0.5003, cy: 0.4995 },
    aspect: 2.512,
  },
  "crystal-palace": {
    src: "/images/parks/crystal-palace/map-thumb.webp",
    ink: { w: 0.9281, h: 0.8037, cx: 0.4995, cy: 0.4991 },
    aspect: 2.053,
  },
  "the-grove": {
    src: "/images/parks/the-grove/map-thumb.webp",
    ink: { w: 0.7771, h: 0.6407, cx: 0.5, cy: 0.4991 },
    aspect: 2.156,
  },
  // The one export whose park is not centred on its canvas — see ParkInk.
  stockwell: {
    src: "/images/parks/stockwell/map-thumb.webp",
    ink: { w: 0.8562, h: 0.6435, cx: 0.449, cy: 0.4264 },
    aspect: 2.365,
  },
};

export type ParkArtSource = {
  slug: string;
  directory_image_url?: string | null;
  hero_image?: string | null;
};

/**
 * Dev-only registrations, so states the real catalogue can no longer reach are
 * still reachable. Right now that is one: a slug the register swears has
 * artwork, pointing at a file that is not there. Every published park has a
 * cutout, so without this the failure path never runs outside production.
 *
 * process.env.NODE_ENV is inlined at build time, so this is `{}` in a
 * production bundle and the object literal is dropped.
 */
const DEV_ONLY_ART: Record<string, ParkCutout> =
  process.env.NODE_ENV === "development"
    ? {
        "fixture-art-broken": {
          src: "/images/parks/__fixture__/does-not-exist.webp",
          ink: { w: 0.88, h: 0.66, cx: 0.5, cy: 0.5 },
          aspect: 2.2,
        },
      }
    : {};

/** The park's cutout, or null if it has none. */
export function parkCutout(park: Pick<ParkArtSource, "slug">): ParkCutout | null {
  return PARK_MAP_ART[park.slug] ?? DEV_ONLY_ART[park.slug] ?? null;
}

/**
 * The photographic fallback — unchanged from what every other surface uses.
 * Deliberately does not consult the cutout map: photographs and cutouts are
 * two different treatments in two different places, and a layout asks for the
 * one it is about to draw.
 */
export function parkPhoto(park: ParkArtSource): string | null {
  return park.directory_image_url || park.hero_image || null;
}

/**
 * The CSS custom properties the cutout's box is built from.
 *
 * Returned as variables rather than finished pixel values so the size stays a
 * CSS concern: the layout states one silhouette height (--pms-ink-h) against
 * the viewport, and these turn it into the image box that puts a silhouette of
 * exactly that height in the slot. Doing the arithmetic in JS instead would
 * mean measuring the slot on every resize to get the same answer.
 *
 *   --img-h : the whole image's height, silhouette plus its empty margin
 *   --img-w : and its width, from --src-aspect below
 *   --src-aspect : the source canvas's own ratio, so the box the image is
 *                  drawn into always matches the image. Every surface builds
 *                  its box from this rather than restating 16:9, which is what
 *                  keeps a re-encoded asset from being letterboxed or cropped.
 *   --ink-*  : passed through for the offset maths at the use site
 */
export function cutoutVars(cut: ParkCutout): Record<string, string> {
  return {
    "--ink-w": String(cut.ink.w),
    "--ink-h": String(cut.ink.h),
    "--ink-cx": String(cut.ink.cx),
    "--ink-cy": String(cut.ink.cy),
    "--ink-aspect": String(cut.aspect),
    "--src-aspect": String(cut.source ?? CUTOUT_SOURCE_ASPECT),
  };
}
