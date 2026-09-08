// Asset URL helpers.
//
// 3D models live on Cloudflare R2 and are served through the CDN — no local GLB
// copies are kept. R2 layout: scout-assets/parks/{folder}/{model}.glb

export const CDN_BASE =
  process.env.NEXT_PUBLIC_CDN_BASE ?? "https://cdn.foundbyscout.fyi";

/**
 * ONE production model per park.
 *
 * Scout had a high/low pair per park, selected at runtime by device. The audit
 * that removed it found: a low export existed on R2 for exactly ONE of the four
 * published parks (bloblands), `model_file_mobile` was null for all four, and
 * the only thing the low path actually did was fire a 7-second timeout that
 * swapped the URL mid-load — which is what produced the iPad "Could not load
 * model-low.glb" failure. It was carrying the cost of two exports, two uploads,
 * two naming conventions, a quality parameter through five components and a
 * device-selection branch, in exchange for nothing that was working.
 *
 * There is a source/archive master offline. This is the web model. It is not
 * "high" — it is simply the model.
 *
 * LODs are not ruled out forever. If real measurements later show these are too
 * heavy for a device we care about, they can come back deliberately, driven by
 * evidence. Nothing here forecloses that: the map below would gain a second
 * entry and the resolver a parameter.
 */

// Logical concept -> physical object, so the code can be canonical before the
// bucket is. `folder/file` is not always `slug/model.glb`: wandle-park lives
// under /parks/wandle, and the-grove was uploaded as model-hi.glb. New uploads
// should standardise on `{slug}/model.glb`; when an object is renamed, change
// its value here and nothing else moves.
const CDN_MODELS: Record<string, string> = {
  "acton":          "acton/model-high.glb",
  "bloblands":      "bloblands/model-high.glb",
  "clapham":        "clapham/model-high.glb",
  "crystal-palace": "crystal-palace/model-high.glb",
  "pollards-hill":  "pollards-hill/model-high.glb",
  "stockwell":      "stockwell/model-high.glb",
  "swanley":        "swanley/model-high.glb",
  "the-grove":      "the-grove/model-hi.glb",
  "wandle-park":    "wandle/model-high.glb",
};

/** True if this park's model has been uploaded to R2. */
export function isOnCdn(slug: string) {
  return slug in CDN_MODELS;
}

/**
 * The park's production model on R2, or null if it has not been uploaded.
 * e.g. https://cdn.foundbyscout.fyi/parks/acton/model-high.glb
 */
export function modelUrl(slug: string): string | null {
  const path = CDN_MODELS[slug];
  return path ? `${CDN_BASE}/parks/${path}` : null;
}

// Paths written before the R2 migration, e.g. /images/parks/acton/model.glb,
// .../model-500k.glb, .../bloblands-1m.glb. Nothing serves these any more.
const LEGACY_MODEL_PATH = /^\/?images\/parks\/[^/]+\/[^/]+\.glb$/i;

/**
 * Resolve a stored model path to a URL that actually loads. Absolute URLs pass
 * through; legacy local paths are rewritten to the CDN.
 *
 * A legacy path resolves to the CDN or to nothing — it is never served from the
 * site itself. That fallback is what broke The Grove: its row still said
 * /images/parks/the-grove/model.glb, so the page handed the loader a **128MB**
 * local file. It "worked" in dev, would never load on a tablet, and hid the
 * real 11MB export sitting on R2.
 *
 * Models live on R2. Returning null for an unmigrated park makes that a visible
 * absence — the park page renders without a viewer — rather than a silent 128MB
 * download. If a park needs a scan, upload it and add the slug above.
 */
export function resolveModelUrl(
  stored: string | null | undefined,
  slug: string,
): string | null {
  if (!stored) return null;
  if (/^https?:\/\//i.test(stored)) return stored;
  if (LEGACY_MODEL_PATH.test(stored)) return modelUrl(slug);
  return stored;
}

/**
 * The park's Random Park render, by convention rather than by database field.
 *
 * Random Park has its own visual language — art-directed 3D/chalk renders
 * rather than the photography the grid and the profile use — so it needs its
 * own asset, but not its own schema. The path is derived from the slug:
 *
 *   /images/parks/{slug}/random.png
 *
 * A park without one is expected, not broken: the band falls back to the
 * photograph it was already showing, so the set can be filled in park by park.
 * If these ever move to R2, this is the one function that changes.
 */
export function randomRenderUrl(slug: string): string {
  return `/images/parks/${slug}/random.png`;
}
