"use client";

import { useEffect, useState } from "react";
import { fetchSubmissionsForVenue } from "@/lib/queries";
import type { Submission, Venue } from "@/lib/types";

type Props = {
  venue: Venue | null;
  onClose: () => void;
};

export default function VenuePanel({ venue, onClose }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!venue) {
      setSubmissions([]);
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

      <div className="p-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-zinc-500">No submissions yet.</p>
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
