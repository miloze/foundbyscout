// Asset URL helpers.
//
// 3D models live on Cloudflare R2 and are served through the CDN — no local GLB
// copies are kept. R2 layout: scout-assets/parks/{folder}/model-{high,low}.glb

export const CDN_BASE =
  process.env.NEXT_PUBLIC_CDN_BASE ?? "https://cdn.foundbyscout.fyi";

export type ModelQuality = "high" | "low";

// Parks whose scans are uploaded to R2. `folder` is the R2 directory, which is
// not always the park slug (wandle-park lives under /parks/wandle). `low` says
// whether a low-res export exists — some parks only have the high-res model.
const CDN_PARKS: Record<string, { folder: string; low: boolean }> = {
  "acton":          { folder: "acton",          low: true  },
  "bloblands":      { folder: "bloblands",      low: true  },
  "clapham":        { folder: "clapham",        low: true  },
  "crystal-palace": { folder: "crystal-palace", low: false },
  "pollards-hill":  { folder: "pollards-hill",  low: true  },
  "swanley":        { folder: "swanley",        low: true  },
  "wandle-park":    { folder: "wandle",         low: false },
};

/** True if this park's models have been migrated to R2. */
export function isOnCdn(slug: string) {
  return slug in CDN_PARKS;
}

/**
 * CDN URL for a park's GLB, e.g. https://cdn.foundbyscout.fyi/parks/acton/model-high.glb
 * Returns null when the park isn't on R2, or when asked for a low-res model
 * that wasn't exported — callers should fall back rather than request a 404.
 */
export function modelUrl(slug: string, quality: ModelQuality = "high"): string | null {
  const park = CDN_PARKS[slug];
  if (!park) return null;
  if (quality === "low" && !park.low) return null;
  return `${CDN_BASE}/parks/${park.folder}/model-${quality}.glb`;
}

/**
 * CDN URL for a park's optional feature GLB — the small landmark object that
 * spins alongside the main scan, e.g. Bloblands' volcano.
 *
 * There is no per-park registry entry for these: the file either exists at
 * parks/{folder}/feature.glb or the park's `has_feature_glb` flag is false and
 * this is never called. Returns null for parks not on R2, so a caller that
 * forgets the flag still can't request a URL that cannot resolve.
 */
export function featureUrl(slug: string): string | null {
  const park = CDN_PARKS[slug];
  if (!park) return null;
  return `${CDN_BASE}/parks/${park.folder}/feature.glb`;
}

// Paths written before the R2 migration, e.g. /images/parks/acton/model.glb,
// .../model-500k.glb, .../bloblands-1m.glb. Nothing serves these any more.
const LEGACY_MODEL_PATH = /^\/?images\/parks\/[^/]+\/[^/]+\.glb$/i;

/**
 * Resolve a stored model path to a URL that actually loads. Absolute URLs pass
 * through; legacy local paths are rewritten to the CDN for parks already on R2,
 * so rows that haven't been migrated in the DB yet still resolve. Parks not yet
 * uploaded keep their stored path. Returns null when there is nothing to load.
 */
export function resolveModelUrl(
  stored: string | null | undefined,
  slug: string,
  quality: ModelQuality = "high",
): string | null {
  if (!stored) return null;
  if (/^https?:\/\//i.test(stored)) return stored;
  if (LEGACY_MODEL_PATH.test(stored)) return modelUrl(slug, quality) ?? (isOnCdn(slug) ? null : stored);
  return stored;
}
