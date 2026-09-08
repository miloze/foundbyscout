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
  /** Served from /public: same-origin, so it is reachable from a phone on the
   *  LAN during testing, where R2's CORS allow-list is not. Production should
   *  resolve through lib/assets like every other model. */
  src: string;
};

export const FOUND_OBJECTS: Record<string, FoundObjectFeature> = {
  bloblands: {
    feature: "Volcano",
    motion: "orbit",
    scale: 1,
    src: "/images/parks/bloblands/feature.glb",
  },
  stockwell: {
    feature: "Ledge",
    motion: "orbit",
    scale: 1,
    src: "/images/parks/stockwell/feature.glb",
  },
};

export const FOUND_OBJECT_SLUGS = Object.keys(FOUND_OBJECTS);

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
