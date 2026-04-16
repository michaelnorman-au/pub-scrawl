"use client";

import { useRef, useState } from "react";
import Map, { type FocusTarget } from "./Map";
import SearchBox from "./SearchBox";
import Lightbox from "./Lightbox";
import type { Submission, Venue } from "@/lib/types";

type Props = {
  venues: Venue[];
  initialSubmissions: Submission[];
};

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "error"; message: string };

export default function MapShell({ venues, initialSubmissions }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });

  // For mobile tap-to-upload: remember coords, open file picker, upload on change.
  const pendingCoordsRef = useRef<{ lng: number; lat: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File, lng: number, lat: number) {
    setUpload({ status: "uploading" });
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("lng", String(lng));
      body.append("lat", String(lat));
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) {
        const { error } = await res
          .json()
          .catch(() => ({ error: "upload failed" }));
        throw new Error(error ?? "upload failed");
      }
      const { submission } = (await res.json()) as { submission: Submission };
      setSubmissions((prev) => [submission, ...prev]);
      setUpload({ status: "idle" });
    } catch (err) {
      setUpload({
        status: "error",
        message: err instanceof Error ? err.message : "upload failed",
      });
    }
  }

  function handleMapTap(lng: number, lat: number) {
    pendingCoordsRef.current = { lng, lat };
    fileInputRef.current?.click();
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const coords = pendingCoordsRef.current;
    pendingCoordsRef.current = null;
    if (!file || !coords) return;
    uploadFile(file, coords.lng, coords.lat);
  }

  return (
    <div className="relative w-screen h-screen">
      <Map
        venues={venues}
        submissions={submissions}
        focus={focus}
        onFileDrop={uploadFile}
        onMapTap={handleMapTap}
        onPhotoClick={(s) => setLightboxSrc(s.photo_url)}
      />
      <SearchBox
        venues={venues}
        onSelect={(v) => setFocus({ venue: v })}
      />
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Upload status toast */}
      {upload.status !== "idle" && (
        <div className="fixed z-30 bottom-4 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {upload.status === "uploading"
            ? "Uploading…"
            : `Upload failed: ${upload.message}`}
        </div>
      )}

      {/* First-time hint */}
      <div className="pointer-events-none fixed z-10 bottom-3 right-3 text-[11px] text-zinc-700 bg-white/80 backdrop-blur px-2 py-1 rounded">
        Drag a photo onto the map · tap the map on mobile
      </div>
    </div>
  );
}
