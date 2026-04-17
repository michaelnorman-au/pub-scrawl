"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function InfoModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white shadow-xl max-w-md w-full p-6 space-y-4"
      >
        <div>
          <h2 className="text-lg text-zinc-900">Pub Scrawl</h2>
          <p className="text-sm text-zinc-700 mt-2 leading-relaxed">
            A crowd-sourced map of the graffiti, scratchings, and markings
            inside London&apos;s pub and club toilet cubicles. An archive of
            anonymous public art, growing one photo at a time.
          </p>
        </div>

        <div className="text-sm text-zinc-700 space-y-1">
          <p className="text-zinc-900">How it works</p>
          <ul className="list-disc pl-5 space-y-0.5 text-zinc-600">
            <li>Drag a photo onto the map to place it.</li>
            <li>On mobile, tap the map to upload.</li>
            <li>Click a photo to view it full size.</li>
            <li>Drag your own photos to move them; delete from the viewer.</li>
          </ul>
        </div>

        <p className="text-sm text-zinc-600">
          Created by Blythe and Michael.
        </p>

        <div className="text-xs text-zinc-500 border-t border-zinc-200 pt-3 space-y-1">
          <p>
            Map data ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-zinc-800"
            >
              OpenStreetMap
            </a>{" "}
            contributors.
          </p>
          <p>
            Tiles via{" "}
            <a
              href="https://openfreemap.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-zinc-800"
            >
              OpenFreeMap
            </a>
            . Map rendering by{" "}
            <a
              href="https://maplibre.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-zinc-800"
            >
              MapLibre
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
