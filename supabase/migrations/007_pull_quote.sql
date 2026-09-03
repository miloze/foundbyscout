-- 007 — Park pull quote
--
-- Fills the gap in the Introduction column between the intro copy and the
-- photo grid: the At a Glance sidebar opposite is shorter than the editorial,
-- and the alternative — shrinking the photography to close it — would break
-- the full-bleed image scale the hero, the GLB viewer and the hybrid-width
-- layout all hold to.
--
-- Both columns are nullable and neither is backfilled. A park without a quote
-- renders no block at all and keeps today's gap, which is why there is no
-- default here and no special case in the layout.
--
-- Applied directly in the SQL editor rather than through the admin form, and
-- the NOTIFY is the point: 006's fields were invisible to PostgREST until its
-- schema cache was reloaded, which read as "the column didn't save".

alter table parks
  add column if not exists pull_quote text,
  add column if not exists pull_quote_attribution text;

notify pgrst, 'reload schema';
