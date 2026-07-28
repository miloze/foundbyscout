-- Migrate 3D model paths from local /public to Cloudflare R2 via cdn.foundbyscout.fyi
--
-- Before: /images/parks/{slug}/model.glb, /images/parks/{slug}/model-500k.glb,
--         and one-offs like bloblands-1m.glb / acton-500k.glb
-- After:  https://cdn.foundbyscout.fyi/parks/{folder}/model-{high,low}.glb
--
-- Two things this has to work around, both verified against R2 on 2026-07-28:
--   * wandle-park's assets live under /parks/wandle/, not /parks/wandle-park/
--   * crystal-palace and wandle have no model-low.glb uploaded — those rows are
--     set to NULL rather than pointed at a 404. Re-run the low update once the
--     low-res exports land.
--
-- Preview first:
--   select slug, model_file, model_file_low, model_file_mobile from parks order by slug;

-- ── High-res ───────────────────────────────────────────────────────────────
-- Unconditional for migrated parks: acton's model_file currently points at
-- clapham's CDN URL, so an "only if not already http" guard would preserve
-- the wrong value.
update parks
set model_file = 'https://cdn.foundbyscout.fyi/parks/'
              || case when slug = 'wandle-park' then 'wandle' else slug end
              || '/model-high.glb'
where slug in ('acton','bloblands','clapham','crystal-palace','pollards-hill','swanley','wandle-park');

-- ── Low-res (only where the export exists on R2) ───────────────────────────
update parks
set model_file_low = 'https://cdn.foundbyscout.fyi/parks/' || slug || '/model-low.glb'
where slug in ('acton','bloblands','clapham','pollards-hill','swanley');

update parks
set model_file_low = null
where slug in ('crystal-palace','wandle-park');

-- ── Mobile ─────────────────────────────────────────────────────────────────
-- Mobile reuses the low-res GLB; null where there isn't one (the viewer then
-- serves the high-res model on phones too).
update parks
set model_file_mobile = 'https://cdn.foundbyscout.fyi/parks/' || slug || '/model-low.glb'
where slug in ('acton','bloblands','clapham','pollards-hill','swanley')
  and coalesce(model_file_mobile, '') <> '';

update parks
set model_file_mobile = null
where slug in ('crystal-palace','wandle-park')
  and coalesce(model_file_mobile, '') <> '';

-- ── Gallery slot GLBs (jsonb) — deliberately NOT migrated ──────────────────
-- The only gallery slot GLB in the table is bloblands' /images/parks/bloblands/
-- volcano.glb, which is a separate object rather than the park scan and has not
-- been uploaded to R2 (confirmed 404). Rewriting it to model-high.glb would
-- swap in the wrong model. Migrate it once volcano.glb is on R2:
--   update parks set gallery_rows = replace(gallery_rows::text,
--     '/images/parks/bloblands/volcano.glb',
--     'https://cdn.foundbyscout.fyi/parks/bloblands/volcano.glb')::jsonb
--   where slug = 'bloblands';

-- Parks still on local paths after this need their GLBs uploading to R2:
--   folkstone-gardens, southbank, stockwell, the-grove
--   select slug, model_file from parks where model_file like '/images/%';
