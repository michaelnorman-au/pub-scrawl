# Pub Scrawl

A crowd-sourced, map-based archive of the graffiti, scratchings, and markings found inside pub and club toilet cubicles. Starting in London.

See [`docs/project-summary.md`](docs/project-summary.md) for the concept, and [`docs/project-roadmap.md`](docs/project-roadmap.md) for what we're building and when.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- MapLibre GL JS with Protomaps / OpenFreeMap tiles *(to be added)*
- Supabase — Postgres + PostGIS + Storage *(to be added)*
- Vercel hosting

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Project layout

```
docs/         Project summary, roadmap, and design notes
src/app/      Next.js App Router pages and layouts
public/       Static assets
```
