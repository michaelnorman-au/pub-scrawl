-- Pub Scrawl — Phase 3 redesign
-- Submissions get their own lat/lng; venue_id becomes optional.
-- After this, photos are placed anywhere on the map, not attached to a
-- specific venue. Venues remain as map labels only.

alter table submissions
  add column if not exists lat double precision,
  add column if not exists lng double precision;

alter table submissions
  alter column venue_id drop not null;

create index if not exists submissions_lat_lng_idx
  on submissions (lat, lng);
