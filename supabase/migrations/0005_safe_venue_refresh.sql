-- Pub Scrawl — make re-imports safe
-- 1. Change submissions.venue_id FK from ON DELETE CASCADE to SET NULL,
--    so wiping/refreshing venues never destroys uploaded photos.
-- 2. Add a unique osm_id on venues so the import script can upsert.
--    We clear the legacy rows first (they pre-date osm_id) — the FK
--    change above means no submissions die.

alter table submissions
  drop constraint if exists submissions_venue_id_fkey;

alter table submissions
  add constraint submissions_venue_id_fkey
    foreign key (venue_id)
    references venues(id)
    on delete set null;

-- Drop legacy venues now so we can safely add a NOT NULL + unique osm_id.
delete from venues where true;

alter table venues
  add column if not exists osm_id bigint;

alter table venues
  alter column osm_id set not null,
  add constraint venues_osm_id_unique unique (osm_id);
