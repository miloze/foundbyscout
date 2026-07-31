-- ── Bloblands editorial — the reference implementation ──────────────────────
-- Copy from SCOUT_Editorial_Example_Bloblands.md → "Published Copy".
-- Run AFTER migrations/004_editorial.sql. Content, not schema — safe to re-run.
--
-- The Introduction is not set here: it is the existing `description` text[],
-- edited in the admin (section 11, Editorial). It is copy, not schema.
--
-- The feature / origins / local keys this file used to write were retired when
-- the narrative sections came off the park page — nothing reads them, so
-- seeding them would only put content back that the next admin save strips.
-- The retired copy is preserved in SCOUT_Editorial_Example_Bloblands.md.

update parks
set editorial = jsonb_build_object(
  'notes', jsonb_build_array(
    'The obvious line isn''t necessarily the best one. The volcano opens alternative routes that become more rewarding with each visit.',
    'The preserved volcano gives the park an identity that couldn''t be recreated if it were designed from scratch today.',
    'After rain, lower areas can remain damp for longer than expected.',
    'The mini-ramp reflects the park''s DIY spirit, reportedly poured using leftover concrete from the main build.',
    'Despite its modest footprint, the park offers more variety than its size initially suggests.'
  )
)
where slug = 'bloblands';

-- ── Image callouts ──────────────────────────────────────────────────────────
-- These live on the slot objects inside gallery_rows, so there is no schema
-- change. Slot 0 is the opening full-width frame, 2 the left square, 7 the
-- closing panorama. Matches the dossier's Hero / Detail / Wide table.
--
-- jsonb_set can't reach into an array-of-arrays by value, so this walks the
-- structure and re-assembles it, leaving every other key on every slot intact.
update parks p
set gallery_rows = (
  select jsonb_agg(
    (
      select jsonb_agg(
        jsonb_set(col, '{slots}', (
          select jsonb_agg(
            case (slot->>'slot')::int
              when 0 then slot || '{"label":"Landmark","caption":"The preserved volcano remains the heart of the park."}'::jsonb
              when 2 then slot || '{"label":"Flow","caption":"The strongest lines reveal themselves gradually."}'::jsonb
              when 7 then slot || '{"label":"Setting","caption":"Layers of old and new concrete define the character of Bloblands."}'::jsonb
              else slot
            end
            order by slot_idx
          )
          from jsonb_array_elements(col->'slots') with ordinality as s(slot, slot_idx)
        ))
        order by col_idx
      )
      from jsonb_array_elements(row_el) with ordinality as c(col, col_idx)
    )
    order by row_idx
  )
  from jsonb_array_elements(p.gallery_rows) with ordinality as r(row_el, row_idx)
)
where p.slug = 'bloblands'
  and jsonb_typeof(p.gallery_rows) = 'array';

-- Verify:
--   select jsonb_pretty(editorial) from parks where slug = 'bloblands';
--   select jsonb_pretty(gallery_rows) from parks where slug = 'bloblands';
