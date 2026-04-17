// Import London pubs/bars/nightclubs from OpenStreetMap into Supabase.
// Idempotent: upserts on osm_id, never touches submissions.
//
// Usage:
//   node --env-file=.env.local scripts/import-osm.mjs
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BBOX = "51.25,-0.55,51.75,0.35";
const OVERPASS_QUERY = `
[out:json][timeout:180];
(
  node["amenity"="pub"](${BBOX});
  node["amenity"="bar"](${BBOX});
  node["amenity"="nightclub"](${BBOX});
);
out;
`;

console.log("Fetching London pubs/bars/nightclubs from Overpass…");
const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  body: "data=" + encodeURIComponent(OVERPASS_QUERY),
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
});

if (!res.ok) {
  console.error(`Overpass error: ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(1);
}

const osm = await res.json();

const venues = [];
for (const el of osm.elements ?? []) {
  if (el.type !== "node") continue;
  const name = el.tags?.name;
  if (!name) continue;

  const addrParts = [
    el.tags["addr:housenumber"],
    el.tags["addr:street"],
    el.tags["addr:postcode"],
  ].filter(Boolean);
  const address = addrParts.length > 0 ? addrParts.join(" ") : null;

  venues.push({
    osm_id: el.id,
    name,
    address,
    lat: el.lat,
    lng: el.lon,
  });
}

console.log(`Got ${venues.length} named venues from OSM.`);

console.log("Upserting venues…");
const BATCH = 500;
for (let i = 0; i < venues.length; i += BATCH) {
  const chunk = venues.slice(i, i + BATCH);
  const { error } = await supabase
    .from("venues")
    .upsert(chunk, { onConflict: "osm_id" });
  if (error) {
    console.error(`Upsert failed at ${i}:`, error);
    process.exit(1);
  }
  console.log(`  ${Math.min(i + BATCH, venues.length)}/${venues.length}`);
}

console.log("Done. Submissions untouched.");
