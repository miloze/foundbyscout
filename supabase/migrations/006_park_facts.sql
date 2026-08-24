-- 006_park_facts.sql
--
-- Structured park facts, per the "park page detail blocks" handover. These
-- replace the free-form `glance` jsonb array ({icon, value, label, available})
-- for the At a Glance grid: eight named fields with two distinct shapes, so
-- the render owns the icon and the copy and the admin only picks the answer.
--
-- The old columns are deliberately left in place — `glance`, `hours`,
-- `transport`, `builder` and `is_free`/`is_covered` still hold live data and
-- still back other surfaces (the directory tags read is_free/is_covered).
-- Nothing is dropped here; the park page simply stops reading `glance` and
-- `hours`.

-- ── At a Glance ────────────────────────────────────────────────────────────
-- Enum fields. Stored as text with a check rather than a pg enum: the value
-- set is small and likely to grow, and adding to a check constraint is a
-- plain migration where altering an enum type is not.
alter table parks add column if not exists setting text;
alter table parks add column if not exists entry   text;

alter table parks drop constraint if exists parks_setting_check;
alter table parks add  constraint parks_setting_check
  check (setting is null or setting in ('outdoor', 'indoor'));

alter table parks drop constraint if exists parks_entry_check;
alter table parks add  constraint parks_entry_check
  check (entry is null or entry in ('free', 'paid'));

-- Boolean fields. Nullable, not `not null default false`: a park nobody has
-- surveyed yet and a park with no cafe both render in the muted state, but
-- only one of them is a claim, and the admin needs to be able to tell them
-- apart when filling the form.
alter table parks add column if not exists cafe            boolean;
alter table parks add column if not exists toilets         boolean;
alter table parks add column if not exists water_fountain  boolean;
alter table parks add column if not exists car_park        boolean;
alter table parks add column if not exists lighting        boolean;
alter table parks add column if not exists seating         boolean;

-- ── Fact rows + Getting there ──────────────────────────────────────────────
alter table parks add column if not exists opening_times text;
alter table parks add column if not exists built_by      text;
alter table parks add column if not exists getting_there text;

-- ── Backfill ───────────────────────────────────────────────────────────────
-- Three of the new fields restate something the table already knew, so every
-- existing park renders a populated grid without an admin pass.
update parks set setting = case when is_covered then 'indoor' else 'outdoor' end
  where setting is null and is_covered is not null;

update parks set entry = case when is_free then 'free' else 'paid' end
  where entry is null and is_free is not null;

update parks set built_by = builder
  where built_by is null and builder is not null and builder <> '';

-- `hours` is an array of {days, time}; only a single-row schedule collapses
-- cleanly into the one-line `opening_times` string. Anything more detailed is
-- left for the admin to summarise by hand.
update parks
   set opening_times = hours -> 0 ->> 'time'
 where opening_times is null
   and jsonb_typeof(hours) = 'array'
   and jsonb_array_length(hours) = 1
   and coalesce(hours -> 0 ->> 'time', '') <> '';

-- `getting_there` has no equivalent to backfill from — `transport` and
-- `address` are still rendered inside the accordion beneath the prose, so
-- nothing is lost while the field is empty.
