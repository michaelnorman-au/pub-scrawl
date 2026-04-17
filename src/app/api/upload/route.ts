import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, uploadLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs"; // sharp needs Node APIs

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

// Greater London bbox — reject coords outside this.
const BBOX = { minLng: -0.55, minLat: 51.25, maxLng: 0.35, maxLat: 51.75 };

export async function POST(req: NextRequest) {
  if (uploadLimiter) {
    const { success, reset } = await uploadLimiter.limit(
      `upload:${clientIp(req)}`,
    );
    if (!success) {
      return NextResponse.json(
        { error: "rate limited — try again later" },
        {
          status: 429,
          headers: { "retry-after": String(Math.ceil((reset - Date.now()) / 1000)) },
        },
      );
    }
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  const latRaw = form.get("lat");
  const lngRaw = form.get("lng");
  const venueIdRaw = form.get("venue_id");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "unsupported file type" },
      { status: 415 },
    );
  }

  const lat = typeof latRaw === "string" ? Number(latRaw) : NaN;
  const lng = typeof lngRaw === "string" ? Number(lngRaw) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng required" },
      { status: 400 },
    );
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

  const venueId =
    typeof venueIdRaw === "string" && venueIdRaw.length > 0 ? venueIdRaw : null;

  // Re-encode to JPEG. This strips EXIF (GPS + device metadata) and caps
  // pixel size. `rotate()` applies the EXIF orientation before the strip
  // so the image isn't sideways.
  const input = Buffer.from(await file.arrayBuffer());
  let output: Buffer;
  try {
    output = await sharp(input)
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "could not process image" },
      { status: 422 },
    );
  }

  const supabase = supabaseServer();
  const path = `${randomUUID()}.jpg`;

  const { error: uploadErr } = await supabase.storage
    .from("submissions")
    .upload(path, output, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: false,
    });
  if (uploadErr) {
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("submissions").getPublicUrl(path);

  const { data: row, error: insertErr } = await supabase
    .from("submissions")
    .insert({ venue_id: venueId, photo_url: publicUrl, lat, lng })
    .select("id, venue_id, photo_url, lat, lng, created_at")
    .single();

  if (insertErr) {
    await supabase.storage.from("submissions").remove([path]);
    return NextResponse.json(
      { error: "could not save submission" },
      { status: 500 },
    );
  }

  // Mint an owner token so the uploader's browser can later move this
  // photo. We only store the hash; the plaintext is returned once.
  const ownerToken = randomUUID();
  const ownerTokenHash = createHash("sha256")
    .update(ownerToken)
    .digest("hex");
  const { error: tokenErr } = await supabase
    .from("submission_tokens")
    .insert({ submission_id: row.id, owner_token_hash: ownerTokenHash });
  if (tokenErr) {
    // Non-fatal: the photo is live, just without a drag affordance.
    console.error("[upload] failed to store owner token", tokenErr);
  }

  return NextResponse.json({ submission: row, owner_token: ownerToken });
}
