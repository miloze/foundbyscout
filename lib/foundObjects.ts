/**
 * Which feature each park exhibits on the homepage, and how it behaves.
 *
 * This holds only what is genuinely *about the feature* — its name, how it
 * moves, how big it sits, where its GLB is. Everything about the park itself
 * (name, postcode, coordinates) is read from the database at render time and
 * is deliberately absent here.
 *
 * That split exists because of a real error. These records previously carried
 * a hardcoded `place` string, and Bloblands' said "SE24 / South London" while
 * the database held SE27 9UA. It looked like field notation and was wrong,
 * which is exactly what the instrument-layer rule about real information is
 * there to prevent. A fact the database already holds does not get a second
 * copy here.
 *
 * Lives in lib/ rather than in the component so app/page.tsx can read the slugs
 * on the server without importing a client module.
 *
 * PROTOTYPE SCOPE: one curated feature per park, hardcoded. No feature table,
 * no selection logic, no cycling.
 */

import { featureUrl } from "@/lib/assets";

export type FoundObjectMotion = "orbit" | "pingpong";

export type FoundObjectFeature = {
  /** The object. Small, mono, above the park name. */
  feature: string;
  /** A full orbit shows every side; "pingpong" sweeps about the authored front
   *  instead, for a scan whose back is missing or not worth showing. */
  motion: FoundObjectMotion;
  /** Art direction on the size the model's bounds imply: 1 is the geometry's
   *  own answer, above 1 bigger, below 1 smaller. */
  scale: number;
};

export const FOUND_OBJECTS: Record<string, FoundObjectFeature> = {
  bloblands: {
    feature: "Volcano",
    motion: "orbit",
    scale: 1,
  },
  stockwell: {
    feature: "Ledge",
    motion: "orbit",
    scale: 1,
  },
};

/**
 * The parks that can actually be exhibited: configured here *and* carrying a
 * scan on the CDN.
 *
 * Both halves are load-bearing. The records above say what a feature is and how
 * it behaves, which is editorial; whether its GLB has been uploaded is an
 * operational fact that lives with every other asset question in lib/assets. A
 * park missing from either side is simply not shown, which is the difference
 * between a module that exhibits three parks and one that exhibits four with a
 * hole in it.
 */
export const FOUND_OBJECT_SLUGS =
  Object.keys(FOUND_OBJECTS).filter(slug => featureUrl(slug) !== null);

/** What the homepage shows with no query string. `?object=<slug>` overrides. */
export const DEFAULT_FOUND_OBJECT = "stockwell";

/** The park facts the module needs, all read from the database. */
export type FoundObjectPark = {
  slug: string;
  name: string;
  postcode: string | null;
  location: string | null;
  lat: number | string | null;
  lng: number | string | null;
};
