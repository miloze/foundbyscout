# Scout / FoundByScout — Code Handoff Notes

Running log of code-related work and open items, most recent first. Next.js
skatepark directory, Supabase backend, deployed from GitHub.

---

## 2026-09-03 — CARTO basemap "API KEY REQUIRED" watermark

**Problem:** the park map (`components/ParksMap.tsx`) tiled "API KEY REQUIRED"
over the whole basemap, local and live. CARTO retired free/anonymous access to
`basemaps.cartocdn.com` and now gates it behind an API key — this hit a lot of
other projects at the same time (Home Assistant, Grafana, openHAB), not
specific to this one.

**Resolution: dropped CARTO rather than keying it.** The satellite view already
runs on `NEXT_PUBLIC_MAPBOX_TOKEN`, which is set locally *and* on the host and
was never broken. The basemap now uses Mapbox `light-v11` / `dark-v11` off that
same token, so there is no second credential to provision in any environment
and nothing to add to the host before deploying.

**What changed in `components/ParksMap.tsx`:**
- Added a `basemapUrl(theme, token)` helper and a `BASEMAP_ATTRIBUTION`
  constant above the component. Both tile-layer call sites — the mount effect
  and the satellite/theme toggle effect — now go through them instead of
  repeating a ternary of hardcoded URLs.
- `CARTO_API_KEY` removed. The duplicate `MAPBOX_TOKEN` declaration further
  down the file was folded into the single one at the top.
- Attribution updated to "© Mapbox © OpenStreetMap".

**Verified:** production build compiles clean; dark and light basemaps both
load with 0 failed tiles and no `cartocdn` or `key=undefined` requests.

**Correcting the earlier draft of this note:** it claimed the free CARTO key had
been obtained and added to `.env.local`. It never was — there is no CARTO
variable in that file. Moot now, since nothing references one.

**Still open — dead code, unrelated to the fix:** `components/ParksDirectory.tsx`
still holds three old `{s}.basemaps.cartocdn.com` URLs. It is only reachable via
`components/ParksMapDynamic.tsx`, which nothing imports, so it renders nowhere
and the stale URLs are harmless. Both files are candidates for deletion.

**If CARTO is ever revisited:** `NEXT_PUBLIC_*` values are inlined into the
client bundle at build time, so such a key is publicly readable on the deployed
site no matter how carefully it is kept out of git. Keeping it out of git is
still right, but the actual protection is domain-restricting the key.

**Files touched:** `components/ParksMap.tsx`. No `.env.local` change required.

---

## Earlier — Editorial gallery system (row-based layout)

Status: **done, live in code.** `components/EditorialGallery.tsx`,
`app/parks/[slug]/page.tsx` (imports `EditorialGallery`, reads
`gallery_rows` from Supabase), and `app/admin/parks/[slug]/page.tsx`
(admin UI for building rows/slots) all have the row-based gallery wired up.
`gallery_rows` (JSONB array of slot rows) and `gallery_images` (flat URL
array indexed by `slot`) are both live in Supabase. No open items here —
this section is kept only as a reference for the data shape:

```json
[
  [{ "slot": 0, "ratio": "16/9", "type": "image" }],
  [{ "slot": 1, "ratio": "9/16", "type": "image" }, { "slot": 2, "ratio": "9/16", "type": "image" }],
  [{ "slot": 3, "ratio": "16/9", "type": "video" }]
]
```

---

## Reference: design system CSS vars
`--font-mono`, `--font-heading`, `--font-body`, `--foreground`,
`--background`, `--muted`, `--border`, `--card`, `--accent`
(defined in `app/colors_and_type.css` / `app/globals.css`).
