# Pub Scrawl — Project Summary

## Concept

Pub Scrawl is a crowd-sourced, map-based web app that archives the graffiti, scratchings, and markings found inside pub and club toilet cubicles. It treats these markings as a form of vernacular public art — ephemeral, anonymous, and overlooked — and preserves them as an ever-growing visual map.

Starting in London, with potential to expand globally.

## Core Experience

1. User opens the map and sees pins at venues where submissions exist.
2. Clicking a pin reveals the photos other people have uploaded from that venue's toilets.
3. User visits a pub, snaps a photo of a cubicle scratching, and uploads it from their phone — pinning it to the venue.
4. The map grows organically as more contributions come in.

## Guiding Principles

- **Unmoderated.** The art experiment doesn't work with curation. Everything submitted goes live. Content warnings may be shown on entry.
- **Anonymous.** No accounts required to upload or browse. If abuse becomes a serious problem, optional accounts may be introduced later.
- **Low friction.** Upload should take under 30 seconds on a phone, in a toilet, possibly drunk.
- **Art-first, not utility-first.** This is not a "find a toilet" app. The graffiti is the point.

## Scope Boundaries

**In scope (MVP):**
- Browsing the map and viewing submissions by venue
- Anonymous photo upload tied to a venue
- London only

**Out of scope (for now):**
- User accounts, profiles, comments, likes
- Moderation tooling
- Global coverage
- Mobile apps (web-first, mobile-responsive)

## Key Risks

- **Legal / content.** Unmoderated user uploads can include illegal content (CSAM, revenge material, doxxing). Even with an "unmoderated" ethos, we need a takedown path and abuse reporting to stay on the right side of the law and our host providers.
- **Privacy.** Phone photos embed GPS and device metadata in EXIF. Stripping EXIF server-side is non-negotiable to protect anonymous uploaders.
- **Spam.** Anonymous + open upload = spam magnet. Rate limiting and lightweight bot protection (e.g. Cloudflare Turnstile) needed from day one.
- **Venue accuracy.** Pin placement needs a venue database or a sensible place-picker, otherwise the map becomes a mess of near-duplicate pins.

## Tech Stack (recommended)

- **Frontend:** Next.js + React + TypeScript
- **Map:** MapLibre GL JS with Protomaps or OpenFreeMap tiles (avoiding Mapbox/Google billing)
- **Backend / DB:** Supabase (Postgres + PostGIS + Storage)
- **Image handling:** Cloudflare Images or imgproxy; EXIF stripped on upload
- **Hosting:** Vercel
- **Abuse controls:** IP-based rate limiting, Cloudflare Turnstile

## Team

- Two founders, building nights/weekends.
