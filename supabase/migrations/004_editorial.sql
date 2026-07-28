-- ── Found By Scout — Editorial layer ────────────────────────────────────────
-- Run this in the Supabase SQL editor BEFORE deploying the editorial UI.
-- The admin park form PATCHes `editorial` as a column; until it exists, saving
-- a park returns 400.
--
-- Preview what you have first:
--   select slug, published, scout from parks order by slug;

-- ── 1. The editorial column ────────────────────────────────────────────────
-- One jsonb blob rather than five typed columns. Editorial content is never
-- queried, filtered, sorted or joined — it is read whole, per park, on one
-- page — so the only real advantage of typed columns goes unused, while the
-- cost (a migration every time the editorial model grows, which the Editorial
-- Bible says it will) is paid repeatedly. This also matches the six jsonb
-- structures already on the table: glance, transport, hours, socials,
-- gallery_rows, viewer_settings.
--
-- Shape — every key optional, absent key = section does not render:
--   {
--     "feature": { "title": "The Volcano", "body": ["…", "…"] },
--     "notes":   ["…", "…"],
--     "origins": { "teaser": "…", "body": ["…"] },
--     "local":   ["…", "…"]
--   }
--
-- The Introduction is NOT in here: it reuses the existing `description` text[],
-- which is already populated and already rendered in the right place.
alter table parks add column if not exists editorial jsonb not null default '{}'::jsonb;

-- ── 2. The dead `scout` column — deliberately NOT dropped ──────────────────
-- Commented "scout's personal commentary" but never wired up: no reader, no
-- writer, and empty on all 11 parks (verified 2026-07-28). Its intent is now
-- served properly by editorial.feature.
--
-- The drop is commented out rather than removed. Supabase's SQL editor flags
-- any DROP COLUMN as a destructive operation, and there is no reason to take
-- that risk on a production table to reclaim one unused column — nothing in
-- the codebase references it, so leaving it in place costs nothing.
--
-- To drop it later, confirm this returns 0 first:
--   select count(*) from parks where scout is not null and scout <> '';
-- then run:
--   alter table parks drop column if exists scout;

-- ── 3. Record the columns that drifted in without a migration ──────────────
-- These already exist in the live database but were added ad hoc, so
-- supabase/migrations could not rebuild it from scratch. All no-ops against
-- the current database; they exist so a fresh environment matches production.
alter table parks add column if not exists ping_pong           jsonb;
alter table parks add column if not exists thumbnail           text;
alter table parks add column if not exists gallery_images      text[]  default '{}';
alter table parks add column if not exists slot_order          integer[];
alter table parks add column if not exists slot_ratios         text[];
alter table parks add column if not exists gallery_rows        jsonb   default '[]';
alter table parks add column if not exists viewer_settings     jsonb   default '{}';
alter table parks add column if not exists model_file_mobile   text;
alter table parks add column if not exists model_file_low      text;
alter table parks add column if not exists preload_image_url   text;
alter table parks add column if not exists catalogue_id        text;
alter table parks add column if not exists scanned             text;
alter table parks add column if not exists directory_image_url text;

-- ── Not touched, deliberately ──────────────────────────────────────────────
-- `facts`, `facilities`, `gallery`, `spots` are orphaned (populated on some
-- unpublished parks, rendered nowhere). `facts` is specification data, so it
-- belongs to the Sidebar pillar or nowhere — a separate decision, not an
-- editorial one. `slot_ratios` / `slot_order` are superseded by gallery_rows
-- but still written on every admin save; removing them means editing the save
-- path, which is unrelated risk for no benefit. Left for a dedicated cleanup.
