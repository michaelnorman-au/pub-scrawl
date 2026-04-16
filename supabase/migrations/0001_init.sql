-- Pub Scrawl — initial schema
-- Run this in the Supabase SQL editor (Project → SQL → New query).

create extension if not exists postgis;

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists venues_lat_lng_idx on venues (lat, lng);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  photo_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists submissions_venue_id_idx on submissions (venue_id);

alter table venues enable row level security;
alter table submissions enable row level security;

drop policy if exists "Public read venues" on venues;
create policy "Public read venues"
  on venues for select
  using (true);

drop policy if exists "Public read submissions" on submissions;
create policy "Public read submissions"
  on submissions for select
  using (true);

-- Insert/update policies come in Phase 2 (anonymous upload flow).
