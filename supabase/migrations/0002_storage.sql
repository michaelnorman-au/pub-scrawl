-- Pub Scrawl — Phase 2 storage setup
-- Creates the submissions bucket for uploaded photos and sets policies.
-- Run in Supabase SQL editor.

-- Public bucket: anyone can read photo URLs (needed for the map).
-- Writes are NOT allowed from anon clients — our /api/upload route uses
-- the service_role key to write, bypassing RLS.
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', true)
on conflict (id) do nothing;

-- Public read policy on the objects inside the bucket.
drop policy if exists "Public read submissions bucket" on storage.objects;
create policy "Public read submissions bucket"
  on storage.objects for select
  using (bucket_id = 'submissions');

-- No insert/update/delete policy for anon. The server-side API route
-- will use the service_role key, which bypasses RLS. That's the only
-- code path allowed to write to this bucket.

-- Phase 2 also needs to allow anon to insert rows into submissions.
-- The API route will still be the only writer (uses service_role), but
-- we add the policy explicitly so nobody has to remember the implicit
-- rule later. Anon insert stays blocked.
-- (No change required — RLS already denies anon inserts on submissions.)
