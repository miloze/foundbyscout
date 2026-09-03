import { createHash } from "crypto";
import { readFileSync, statSync } from "fs";
import { join } from "path";

export { debugAllowed } from "./debugMode";

// ── Park image audit ─────────────────────────────────────────────────────
// Server-only: reads the filesystem. Do not import from a client component —
// the debug indicator in the Grid reaches this through /api/dev/park-images.
//
// Answers one question per image slot: is there a real photograph of *this
// park* behind it? That is deliberately not the same question as "does the file
// exist", because both of the ways this archive has actually failed pass an
// existence check:
//
//  - blank stand-in files dropped in so the paths resolve. They return 200 and
//    render as empty tiles, so a file check calls the archive fully shot.
//  - one real photograph reused across several parks. Three parks currently
//    share a single hero image, byte for byte.
//
// So a slot is only "ok" when a file is there, is big enough to be a
// photograph, and is not also serving some other park.

export type SlotStatus =
  | "ok"          // a real file is there
  | "placeholder" // file resolves but is not a photograph
  | "missing"     // a path is configured, nothing is at it
  | "empty"       // no path configured at all
  | "remote";     // an off-disk URL; not verifiable from here

export type SlotKey = "directory_image_url" | "hero_image" | "thumbnail";

export type SlotAudit = {
  key: SlotKey;
  label: string;
  /** What the database currently holds. */
  value: string | null;
  /** The path that should hold a file — the configured one, or the convention. */
  expectedPath: string;
  status: SlotStatus;
  bytes?: number;
  /** Why a placeholder was called a placeholder. */
  reason?: string;
};

export type ParkAudit = {
  slug: string;
  name: string;
  published: boolean;
  slots: SlotAudit[];
  /** True only when every slot holds a real photograph. */
  complete: boolean;
};

export type ParkImageRow = {
  slug: string;
  name: string;
  published: boolean;
  directory_image_url: string | null;
  hero_image: string | null;
  thumbnail: string | null;
};

/**
 * The directory asset export.
 *
 * 16:10 because that is what every surface it feeds actually displays — the
 * Grid tile at all three densities, the accordion drawer figure, and both map
 * card thumbnails. Master and display ratio match, so nothing is cropped and
 * what is framed is what appears. The one exception is the feature card at
 * 16:9, which trims about 10% off the top and bottom.
 *
 * 1200 wide is set by the largest real demand, which is a phone rather than a
 * monitor: at Large density the Grid is a single full-width column, so a DPR3
 * handset asks for ~1179px. It is also exactly one of Next's deviceSizes, so
 * the image optimiser passes it through rather than resampling off-ladder.
 *
 * Superseded 2:1 / 1000x500: once the Grid moved to 16:10 nothing in the
 * system displayed at 2:1 any more, so that master was cropped 20% on every
 * surface — which also left only 960 visible pixels, under the 1179 above.
 */
export const DIRECTORY_ASSET_SPEC = { ratio: "16:10", width: 1200, height: 750 } as const;

// The filename each slot is expected to use, so a park with an empty field can
// still be told where to put the export rather than just that it has none.
const SLOTS: { key: SlotKey; label: string; filename: string }[] = [
  { key: "directory_image_url", label: "Directory", filename: "directory.webp" },
  { key: "hero_image",          label: "Hero",      filename: "hero-01.webp" },
  { key: "thumbnail",           label: "Thumbnail", filename: "thumb.webp" },
];

export function conventionalPath(slug: string, key: SlotKey): string {
  const slot = SLOTS.find(s => s.key === key)!;
  return `/images/parks/${slug}/${slot.filename}`;
}

// Anything smaller than this is not a photograph at these dimensions. The blank
// placeholder in the tree is 4.7KB for 500,000 pixels; the one real directory
// export is 62KB. The gap is wide enough that a single floor separates them
// without needing to decode the image.
const FLAT_FILE_BYTES = 8 * 1024;

type DiskFile = { bytes: number; hash: string } | null;

function readDisk(publicPath: string): DiskFile {
  try {
    const abs = join(process.cwd(), "public", publicPath.replace(/^\//, ""));
    const bytes = statSync(abs).size;
    return { bytes, hash: createHash("sha1").update(readFileSync(abs)).digest("hex") };
  } catch {
    return null;
  }
}

/**
 * Audits every park in one pass.
 *
 * Takes the whole set rather than one park at a time because the strongest
 * placeholder signal is cross-park: two parks cannot legitimately share the
 * same photograph, so any file content that appears under more than one slug
 * is stock. That rule needs no size threshold and keeps working if the
 * placeholder is ever regenerated at a different size.
 */
export function auditParks(parks: ParkImageRow[]): ParkAudit[] {
  const disk = new Map<string, DiskFile>();
  const hashOwners = new Map<string, Set<string>>();

  for (const park of parks) {
    for (const slot of SLOTS) {
      const value = park[slot.key];
      if (!value || /^https?:\/\//i.test(value)) continue;
      if (!disk.has(value)) disk.set(value, readDisk(value));
      const file = disk.get(value);
      if (!file) continue;
      if (!hashOwners.has(file.hash)) hashOwners.set(file.hash, new Set());
      hashOwners.get(file.hash)!.add(park.slug);
    }
  }

  return parks.map(park => {
    const slots: SlotAudit[] = SLOTS.map(slot => {
      const value = park[slot.key];
      const expectedPath = value && !/^https?:\/\//i.test(value)
        ? value
        : conventionalPath(park.slug, slot.key);
      const base = { key: slot.key, label: slot.label, value, expectedPath };

      if (!value) return { ...base, status: "empty" as const };
      if (/^https?:\/\//i.test(value)) return { ...base, status: "remote" as const };

      const file = disk.get(value);
      if (!file) return { ...base, status: "missing" as const };

      const owners = hashOwners.get(file.hash);
      if (owners && owners.size > 1) {
        return {
          ...base, status: "placeholder" as const, bytes: file.bytes,
          reason: `identical file used by ${owners.size} parks`,
        };
      }
      if (file.bytes < FLAT_FILE_BYTES) {
        return {
          ...base, status: "placeholder" as const, bytes: file.bytes,
          reason: `${(file.bytes / 1024).toFixed(1)}KB — too small to be a photograph`,
        };
      }
      return { ...base, status: "ok" as const, bytes: file.bytes };
    });

    return {
      slug: park.slug,
      name: park.name,
      published: park.published,
      slots,
      complete: slots.every(s => s.status === "ok" || s.status === "remote"),
    };
  });
}
