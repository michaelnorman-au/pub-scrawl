// DESTRUCTIVE: wipes all uploaded photos from Supabase Storage AND all
// rows from the submissions table. Venues are untouched.
//
// Usage: node --env-file=.env.local scripts/purge-submissions.mjs

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// Count rows first so the user can see the blast radius.
const { count } = await supabase
  .from("submissions")
  .select("id", { count: "exact", head: true });
console.log(`submissions rows: ${count ?? "?"}`);

// List + remove all objects in the submissions bucket, paging as needed.
let removed = 0;
for (;;) {
  const { data: files, error } = await supabase.storage
    .from("submissions")
    .list("", { limit: 1000 });
  if (error) {
    console.error("storage list failed:", error);
    process.exit(1);
  }
  if (!files || files.length === 0) break;
  const paths = files.map((f) => f.name);
  const { error: rmErr } = await supabase.storage
    .from("submissions")
    .remove(paths);
  if (rmErr) {
    console.error("storage remove failed:", rmErr);
    process.exit(1);
  }
  removed += paths.length;
  console.log(`  removed ${removed} files`);
  if (files.length < 1000) break;
}

// Delete DB rows. submission_tokens cascades via FK.
const { error: delErr } = await supabase
  .from("submissions")
  .delete()
  .neq("id", "00000000-0000-0000-0000-000000000000");
if (delErr) {
  console.error("delete failed:", delErr);
  process.exit(1);
}

console.log("Done. All submissions and stored photos wiped.");
