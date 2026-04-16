"use client";

import { useEffect, useRef, useState } from "react";
import { fetchSubmissionsForVenue } from "@/lib/queries";
import type { Submission, Venue } from "@/lib/types";

type Props = {
  venue: Venue | null;
  onClose: () => void;
};

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "error"; message: string };

export default function VenuePanel({ venue, onClose }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!venue) {
      setSubmissions([]);
      setUpload({ status: "idle" });
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchSubmissionsForVenue(venue.id)
      .then((rows) => {
        if (!cancelled) setSubmissions(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venue]);

  if (!venue) return null;

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file || !venue) return;

    setUpload({ status: "uploading" });
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("venue_id", venue.id);
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

  const uploading = upload.status === "uploading";

  return (
    <div
      className="
        fixed z-10 bg-white shadow-2xl overflow-y-auto
        inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl
        md:inset-x-auto md:bottom-0 md:top-0 md:right-0 md:w-[420px] md:max-h-none md:rounded-none
      "
    >
      <div className="sticky top-0 bg-white border-b border-zinc-200 p-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{venue.name}</h2>
          {venue.address && (
            <p className="text-sm text-zinc-600 mt-1">{venue.address}</p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 text-zinc-500 hover:text-zinc-900 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-3 text-sm font-medium bg-black text-white rounded hover:bg-zinc-800 disabled:bg-zinc-400"
          >
            {uploading ? "Uploading…" : "Upload a photo"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFilePicked}
          />
          {upload.status === "error" && (
            <p className="mt-2 text-sm text-red-600">
              Couldn&apos;t upload: {upload.message}
            </p>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No submissions yet. Be the first.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {submissions.map((s) => (
              <a
                key={s.id}
                href={s.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-[3/4] bg-zinc-100 overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.photo_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
