# Pub Scrawl — Project Roadmap

A rough, phase-based plan. Timelines are deliberately loose — this is a side project.

---

## Phase 0 — Foundations

Get the workspace, accounts, and skeleton in place before writing feature code.

- [ ] Initialise Next.js + TypeScript project in repo root
- [ ] Set up Git repo and hosting (GitHub)
- [ ] Create Supabase project (free tier)
- [ ] Create Vercel project, link to GitHub for preview deploys
- [ ] Register domain
- [ ] Decide on branding basics (name confirmed: Pub Scrawl; logo/wordmark can wait)
- [ ] Agree on a lightweight working rhythm between the two founders (where issues live, how decisions are made)

---

## Phase 1 — Map MVP (read-only)

The map renders, with fake/seeded data, proving the core viewing experience.

- [ ] Integrate MapLibre GL JS with Protomaps or OpenFreeMap tiles
- [ ] Default view centred on London with sensible zoom bounds
- [ ] Design Postgres schema: `venues` (id, name, lat/lng, address) and `submissions` (id, venue_id, photo_url, created_at)
- [ ] Enable PostGIS, add spatial index on venues
- [ ] Seed database with ~20 real London pubs and dummy submission photos
- [ ] Render venue pins on the map from the database
- [ ] Click pin → side panel/modal showing that venue's submissions
- [ ] Basic responsive layout (mobile-first)

---

## Phase 2 — Anonymous Upload Flow

Users can contribute. This is the scariest phase: anonymous uploads need guardrails even in an "unmoderated" app.

- [ ] Upload button / flow on the map
- [ ] Venue picker: search existing venues, or drop a pin for a new one
- [ ] Photo picker (accept camera input on mobile)
- [ ] Server-side EXIF strip (non-negotiable — strips GPS and device info)
- [ ] Image resize / optimisation pipeline (Cloudflare Images or imgproxy)
- [ ] Store photo in Supabase Storage, metadata in Postgres
- [ ] IP-based rate limiting (e.g. N uploads per IP per hour)
- [ ] Cloudflare Turnstile on upload form
- [ ] "Report this submission" link on every photo (emails founders for manual takedown)
- [ ] Basic terms of service / takedown policy page (required by most hosts; DMCA-style)

---

## Phase 3 — Polish and Public Launch

Make it pleasant to use, then tell people.

- [ ] Landing page explaining the project
- [ ] Content warning splash on first visit (with localStorage dismiss)
- [ ] Venue deduplication heuristics (merge near-identical pins)
- [ ] Simple analytics (Plausible or similar — privacy-respecting)
- [ ] Error and empty states
- [ ] Share links to specific venues / submissions
- [ ] Soft launch to friends, then wider London
- [ ] Monitor for abuse, spam, legal notices; iterate on rate limits and takedown flow

---

## Phase 4 — Post-launch Explorations

Ideas to consider once the MVP is live and there's real usage to learn from.

- Optional accounts (if spam forces it, or for "my contributions")
- Browse feeds: "new today", "random", by borough
- Venue detail pages (more than a map popup)
- Tagging / categorisation (emergent, not prescribed)
- Expansion to other cities (Manchester, Berlin, NYC)
- Printed artefacts (zine, exhibition, book) drawn from the archive
- Public API for artists and researchers

---

## Open Questions

- What's the legal entity / takedown contact? (needed before public launch)
- Who pays for hosting beyond free tiers?
- How do we handle a venue that closes or is renamed?
- Do we retain photos indefinitely or age them out?
- Attribution: when an anonymous uploader wants credit later, do we support it?
