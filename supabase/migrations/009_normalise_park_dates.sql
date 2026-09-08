-- Make `opened` and `scanned` hold dates.
--
-- Both are plain `text` (001 and 004), so they hold whatever the admin's text
-- box was given. Across the four published parks that was four different
-- shapes — '1978', 'March 2018', the literal 'NA', and '' — and the park page
-- printed the stored string directly, so Crystal Palace's profile told visitors
-- it was "Scanned: NA".
--
-- Two consequences, one visible and one not. The visible one is junk on a page
-- whose whole premise is that its field notation is real. The invisible one is
-- that neither column can be *used*: 'March 2018' and '1978' do not compare, so
-- parks cannot be ordered by age and a scan date cannot drive anything.
--
-- This normalises both to partial ISO and constrains them to it.

-- ── Partial ISO, deliberately ────────────────────────────────────────────────
-- 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD', kept as text rather than moved to `date`.
--
-- A `date` column cannot store "1978" — it would have to invent 1978-01-01, a
-- January and a first-of-the-month that nobody established. That is precisely
-- the fabrication this migration exists to remove, so the column keeps the
-- precision it was actually given and records nothing it was not.
--
-- Text costs nothing here: partial ISO sorts correctly as a string, because the
-- components run most- to least-significant and are zero-padded. '1978' sorts
-- before '2018-03', which sorts before '2026'.

-- ── 1. Prose months to ISO ───────────────────────────────────────────────────
-- Generic rather than a list of the four rows known to be wrong: unpublished
-- parks hold values too, and they become visible the moment one is published.
create or replace function pg_temp.to_partial_iso(raw text)
returns text
language plpgsql
immutable
as $$
declare
  s     text := btrim(coalesce(raw, ''));
  month text;
  parts text[];
begin
  if s = '' then
    return null;
  end if;

  -- Already partial ISO.
  if s ~ '^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$' then
    return s;
  end if;

  -- 'March 2018' / 'march 2018'
  parts := regexp_split_to_array(s, '\s+');
  if array_length(parts, 1) = 2 and parts[2] ~ '^\d{4}$' then
    month := case lower(parts[1])
      when 'january' then '01' when 'february' then '02' when 'march'     then '03'
      when 'april'   then '04' when 'may'      then '05' when 'june'      then '06'
      when 'july'    then '07' when 'august'   then '08' when 'september' then '09'
      when 'october' then '10' when 'november' then '11' when 'december'  then '12'
    end;
    if month is not null then
      return parts[2] || '-' || month;
    end if;
  end if;

  -- Anything else was never a date. 'NA', 'TBC', 'n/a' and friends all land
  -- here and become null, which is the honest value: the archive does not know.
  return null;
end;
$$;

update parks set opened  = pg_temp.to_partial_iso(opened)
  where opened is distinct from pg_temp.to_partial_iso(opened);

update parks set scanned = pg_temp.to_partial_iso(scanned)
  where scanned is distinct from pg_temp.to_partial_iso(scanned);

-- ── 2. Constrain, so it cannot drift back ────────────────────────────────────
-- The constraint is the actual fix. Without it the next value typed into the
-- admin is free text again and the column re-rots at the speed of one entry.
-- Null stays legal throughout: an unscanned park is a real state.
alter table parks drop constraint if exists parks_opened_partial_iso;
alter table parks add  constraint parks_opened_partial_iso
  check (opened is null or opened ~ '^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$');

alter table parks drop constraint if exists parks_scanned_partial_iso;
alter table parks add  constraint parks_scanned_partial_iso
  check (scanned is null or scanned ~ '^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$');

comment on column parks.opened  is
  'Partial ISO: YYYY, YYYY-MM or YYYY-MM-DD. Precision is meaningful — store only what is known. Rendered by lib/fieldDate.';
comment on column parks.scanned is
  'Partial ISO: YYYY, YYYY-MM or YYYY-MM-DD. Null where the park has not been scanned; never a placeholder string.';
