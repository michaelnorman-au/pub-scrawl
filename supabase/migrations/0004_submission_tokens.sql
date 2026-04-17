-- Pub Scrawl — owner tokens for creator-only drag
-- Stores a hash of a per-submission token. The plaintext token is
-- returned to the client at upload time and saved in localStorage.
-- Only the browser that uploaded a photo can later move it.
--
-- We use a separate table (not a column on submissions) so anon can't
-- read the hashes even via the public-read policy — this table has no
-- anon RLS policy, so only service_role can touch it.

create table if not exists submission_tokens (
  submission_id uuid primary key references submissions(id) on delete cascade,
  owner_token_hash text not null,
  created_at timestamptz not null default now()
);

alter table submission_tokens enable row level security;
-- No policies on purpose. Anon = no access. Service role bypasses RLS.
