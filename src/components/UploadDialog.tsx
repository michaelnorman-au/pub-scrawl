"use client";

import { useEffect, useState } from "react";
import { isInLondon, type GpsCoords } from "@/lib/exif";

export type UploadChoice = "exif" | "drop" | "cancel";

type Props = {
  exifCoords: GpsCoords;
  dropCoords: GpsCoords;
  previewSrc: string;
  onChoose: (choice: UploadChoice) => void;
};

const PRIVACY_ACK_KEY = "pubscrawl:exif-ack";

function hasAcknowledged(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PRIVACY_ACK_KEY) === "1";
  } catch {
    return false;
  }
}

export default function UploadDialog({
  exifCoords,
  dropCoords,
  previewSrc,
  onChoose,
}: Props) {
  const exifInBounds = isInLondon(exifCoords);
  const [choice, setChoice] = useState<"exif" | "drop">(
    exifInBounds ? "exif" : "drop",
  );
  const showPrivacyNote = !hasAcknowledged();

  function confirm() {
    try {
      window.localStorage.setItem(PRIVACY_ACK_KEY, "1");
    } catch {
      /* ignore */
    }
    onChoose(choice);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChoose("cancel");
      if (e.key === "Enter") confirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choice, onChoose]);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      onClick={() => onChoose("cancel")}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white shadow-xl max-w-md w-full p-6 space-y-4"
      >
        <div className="flex gap-4 items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt=""
            className="w-20 h-20 object-cover"
          />
          <div className="flex-1">
            <h2 className="text-lg text-zinc-900">
              Where should this photo live?
            </h2>
            <p className="text-sm text-zinc-700 mt-2 leading-relaxed">
              This photo has location metadata. Pick which to use.
            </p>
          </div>
        </div>

        <div className="text-sm text-zinc-700 space-y-2">
          <label
            className={`flex items-start gap-3 p-3 border cursor-pointer ${
              !exifInBounds
                ? "border-zinc-200 opacity-50 cursor-not-allowed"
                : choice === "exif"
                  ? "border-black bg-zinc-50"
                  : "border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <input
              type="radio"
              name="upload-where"
              checked={choice === "exif"}
              disabled={!exifInBounds}
              onChange={() => setChoice("exif")}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-zinc-900">Where the photo was taken</div>
              <div className="text-xs text-zinc-500 mt-0.5 font-mono">
                {exifCoords.lat.toFixed(5)}, {exifCoords.lng.toFixed(5)}
              </div>
              {!exifInBounds && (
                <div className="text-xs text-amber-600 mt-1">
                  Outside London — can&apos;t use this option.
                </div>
              )}
              {exifInBounds && showPrivacyNote && (
                <div className="text-xs text-zinc-500 mt-1">
                  Heads up: this reveals where you were.
                </div>
              )}
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-3 border cursor-pointer ${
              choice === "drop"
                ? "border-black bg-zinc-50"
                : "border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <input
              type="radio"
              name="upload-where"
              checked={choice === "drop"}
              onChange={() => setChoice("drop")}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-zinc-900">Where you dropped it</div>
              <div className="text-xs text-zinc-500 mt-0.5 font-mono">
                {dropCoords.lat.toFixed(5)}, {dropCoords.lng.toFixed(5)}
              </div>
            </div>
          </label>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={() => onChoose("cancel")}
            className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            className="px-4 py-2 text-sm bg-black text-white hover:bg-zinc-800"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
