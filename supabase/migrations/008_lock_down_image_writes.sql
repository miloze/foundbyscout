-- 008 — Take image writes away from the anon key
--
-- Until this ran, two things were writable by anyone who opened the site:
--
--   * the park-images storage bucket. 001 created policies named "Service role
--     upload/delete park-images", but neither carried a TO clause, and a policy
--     with no TO defaults to `public`. The service role bypasses RLS outright,
--     so those policies never applied to it — the only thing they did was grant
--     INSERT and DELETE to anon. Verified 2026-09-05: an anon DELETE of a
--     missing key returned 404 NoSuchKey, i.e. it passed the policy and failed
--     only on the absent object.
--
--   * public.park_images. 001 only ever declared a SELECT policy, but the live
--     table accepted anon INSERT/UPDATE/DELETE, so permissive write policies
--     were added in the dashboard and never made it into a migration. Verified
--     the same day: an anon insert of {} returned 23502 (not-null violation),
--     not 42501 — RLS let it through.
--
-- The anon key ships in the client bundle by design, so both of those were
-- open to every visitor. Nothing legitimate needs them any more: the admin
-- uploader now writes through /api/admin/uploads under the service role.
--
-- Reads are deliberately untouched. The bucket stays public and park_images
-- stays world-readable — those images are on the website.

-- ── park_images: drop every policy, restore read-only ─────────────────────
-- Dropped by discovery rather than by name: the write policies were added by
-- hand, so their names are not knowable from this repo.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'park_images'
  loop
    execute format('drop policy %I on public.park_images', pol.policyname);
  end loop;
end $$;

alter table public.park_images enable row level security;

create policy "Public read park_images"
  on public.park_images for select using (true);

-- No INSERT/UPDATE/DELETE policy is created. With RLS on and no policy for a
-- command, that command is denied — which is the intent. The service role
-- bypasses RLS, so /api/admin/uploads still writes.

-- ── park_images: the column the admin uploader has always sent ────────────
-- The uploader posted url/ratio/order_index; the table has none of those, so
-- every save it ever attempted failed with PGRST204 and the table is empty.
-- `ratio` is the only one carrying information: `url` is derivable from `path`
-- via getPublicUrl, and `sort_order` already exists. The route now sends
-- path/ratio/sort_order.
alter table public.park_images add column if not exists ratio text;

alter table public.park_images drop constraint if exists park_images_ratio_check;
alter table public.park_images add  constraint park_images_ratio_check
  check (ratio is null or ratio in ('16x9', '9x16', '1x1'));

-- ── storage: revoke the anon write grants ─────────────────────────────────
drop policy if exists "Service role upload park-images" on storage.objects;
drop policy if exists "Service role delete park-images" on storage.objects;

-- Public read stays; this is what serves the images on the site.
drop policy if exists "Public read park-images" on storage.objects;
create policy "Public read park-images"
  on storage.objects for select
  using (bucket_id = 'park-images');

notify pgrst, 'reload schema';

-- ── Review before you close the editor ────────────────────────────────────
-- Anything still listed here can write to storage. Expect zero rows. A row
-- means another write policy was added by hand and this migration did not know
-- to drop it — read its qual/with_check and remove it if it grants anon.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and cmd in ('INSERT', 'UPDATE', 'DELETE')
order by policyname;
