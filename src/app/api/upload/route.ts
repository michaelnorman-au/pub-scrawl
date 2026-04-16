import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs"; // sharp needs Node APIs

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  const venueId = form.get("venue_id");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (typeof venueId !== "string" || venueId.length === 0) {
    return NextResponse.json({ error: "venue_id required" }, { status: 400 });
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

  // Re-encode to JPEG. This strips EXIF (GPS + device metadata) and caps
  // pixel size. `rotate()` with no args applies the EXIF orientation
  // before the strip so the image isn't sideways.
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
  const path = `${venueId}/${randomUUID()}.jpg`;

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
    .insert({ venue_id: venueId, photo_url: publicUrl })
    .select("id, venue_id, photo_url, created_at")
    .single();

  if (insertErr) {
    // Roll back the upload if the DB rejected the row (e.g. bad venue_id).
    await supabase.storage.from("submissions").remove([path]);
    return NextResponse.json(
      { error: "could not save submission" },
      { status: 500 },
    );
  }

  return NextResponse.json({ submission: row });
}
