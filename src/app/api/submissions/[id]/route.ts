import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, updateLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";

const BBOX = { minLng: -0.55, minLat: 51.25, maxLng: 0.35, maxLat: 51.75 };

type PatchBody = {
  lat?: unknown;
  lng?: unknown;
  owner_token?: unknown;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (updateLimiter) {
    const { success, reset } = await updateLimiter.limit(
      `update:${clientIp(req)}`,
    );
    if (!success) {
      return NextResponse.json(
        { error: "rate limited — try again later" },
        {
          status: 429,
          headers: {
            "retry-after": String(Math.ceil((reset - Date.now()) / 1000)),
          },
        },
      );
    }
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
  const lng = typeof body.lng === "number" ? body.lng : Number(body.lng);
  const token =
    typeof body.owner_token === "string" ? body.owner_token : null;

  if (!token) {
    return NextResponse.json({ error: "owner_token required" }, { status: 401 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }
  if (
    lat < BBOX.minLat ||
    lat > BBOX.maxLat ||
    lng < BBOX.minLng ||
    lng > BBOX.maxLng
  ) {
    return NextResponse.json(
      { error: "coordinates outside London" },
      { status: 400 },
    );
  }

  const hash = createHash("sha256").update(token).digest("hex");

  const supabase = supabaseServer();
  const { data: stored, error: lookupErr } = await supabase
    .from("submission_tokens")
    .select("owner_token_hash")
    .eq("submission_id", id)
    .maybeSingle();

  if (lookupErr || !stored || stored.owner_token_hash !== hash) {
    // Don't distinguish "not found" from "wrong token" — same surface.
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: updated, error: updErr } = await supabase
    .from("submissions")
    .update({ lat, lng })
    .eq("id", id)
    .select("id, venue_id, photo_url, lat, lng, created_at")
    .single();

  if (updErr || !updated) {
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }

  return NextResponse.json({ submission: updated });
}
