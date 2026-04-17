// Client-side EXIF GPS reader. We deliberately strip EXIF on the server
// for privacy — this helper exists only to OFFER the uploader the choice
// of using the photo's embedded location, which they must explicitly
// accept (via UploadDialog). The server still strips before storing.

import exifr from "exifr";

export type GpsCoords = { lat: number; lng: number };

const BBOX = { minLng: -0.55, minLat: 51.25, maxLng: 0.35, maxLat: 51.75 };

export function isInLondon({ lat, lng }: GpsCoords): boolean {
  return (
    lat >= BBOX.minLat &&
    lat <= BBOX.maxLat &&
    lng >= BBOX.minLng &&
    lng <= BBOX.maxLng
  );
}

export async function readExifGps(file: File): Promise<GpsCoords | null> {
  try {
    const out = await exifr.gps(file);
    if (!out) return null;
    const { latitude, longitude } = out;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return null;
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { lat: latitude, lng: longitude };
  } catch {
    return null;
  }
}
