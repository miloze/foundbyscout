-- ── Found By Scout — Feature GLB flag ───────────────────────────────────────
-- Run this in the Supabase SQL editor BEFORE deploying the feature-GLB UI.
-- The admin park form PATCHes the whole form object as columns, so until this
-- exists, saving any park returns 400 — the same failure mode as 004.
--
-- One boolean, no path column: the asset always lives at a fixed R2 key,
--   parks/{folder}/feature.glb
-- derived from the same CDN_PARKS folder map lib/assets.ts already uses for
-- model-high.glb and model-low.glb (see featureUrl()). A path column would let
-- the two drift apart for no gain — there is only ever one feature per park.
--
-- Scale, position and orientation are baked into the GLB itself. The viewer
-- adds only the main model's Z-up correction and spins it about its own
-- bounding-box centre, so there are no per-park settings to store.
alter table parks add column if not exists has_feature_glb boolean not null default false;

-- Turn it on for the reference park once parks/bloblands/feature.glb is on R2.
-- Left commented deliberately: flipping this before the upload lands points the
-- viewer at a 404. It fails soft — the feature sits in its own Suspense
-- boundary, so the park still renders — but it logs a fetch error on every
-- visit, which is noise nobody needs.
--   update parks set has_feature_glb = true where slug = 'bloblands';

-- ── The dead `use_contour_model` column — deliberately NOT dropped ─────────
-- Added in 001 to route the hero to ContourModel, a second viewer for
-- terrain/contour data. That component was deleted; the column and its admin
-- checkbox outlived it, so for some time the form offered a toggle that
-- changed nothing. The checkbox is now gone from the admin.
--
-- The column stays, for the same reason `scout` did in 004: Supabase flags any
-- DROP COLUMN as destructive, and nothing reads or writes this one any more,
-- so leaving it costs nothing. Note the admin no longer sends it, so existing
-- values simply freeze where they are.
--
-- To drop it later:
--   alter table parks drop column if exists use_contour_model;

-- Verify:
--   select slug, has_feature_glb from parks order by slug;
