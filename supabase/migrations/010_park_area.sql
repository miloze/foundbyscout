-- Give a park's area a column of its own.
--
-- The hero chip and the park page's location chain both read `address[1]` —
-- the second line of the postal address — and call the result "area". That
-- works only because a London address usually puts the neighbourhood there.
-- Across the eleven rows in the catalogue it is a neighbourhood for five
-- (West Norwood, South Bank, Dulwich, Brixton, Mitcham) and a street for
-- three: Wandle Park reads "Cornwall Road", Crystal Palace "Ledrington Road",
-- Folkstone Gardens "Rolt Street". The remaining three put a town or a
-- postcode there.
--
-- The failure is structural rather than a data-entry mistake. `address` is a
-- postal address, and a postal address has no fixed slot for a neighbourhood;
-- reading meaning out of a line's position will keep producing streets for
-- as long as it is done that way. Reordering the address lines is not the fix
-- either — that damages the address to serve a label, and the address is
-- needed intact for "Getting there".
--
-- So: a dedicated field. `area` is the human label for where a park is —
-- "West Norwood", "Dulwich", "Mitcham" — and nothing else reads from it.
--
-- Deliberately left NULL for every existing row. Populating it from
-- `address[1]` would re-import exactly the three wrong values this exists to
-- stop, and inventing the missing ones is not the migration's call to make.
-- Until a row is given an area, the label falls back to `borough`, which is
-- populated for all eleven — so nothing shows blank, and a fallback is
-- visibly a borough rather than a guess dressed as a neighbourhood.
--
-- `location` is not this field. It holds the broad region ("South London",
-- "West London", "Sevenoaks") and drives the directory's region filter.

alter table public.parks
  add column if not exists area text;

comment on column public.parks.area is
  'Human label for where the park is — the neighbourhood or area, e.g. "West Norwood". '
  'Falls back to borough when null. Never derived from address line position; '
  'the postal address stays intact in address[]. Distinct from location, which is the broad region.';
