"use client";

import { useEffect } from "react";

type Props = {
  src: string | null;
  owned: boolean;
  onClose: () => void;
  onDelete?: () => void;
};

export default function Lightbox({ src, owned, onClose, onDelete }: Props) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-zoom-out"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "95vw", maxHeight: "95vh" }}
        className="block cursor-default"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="absolute top-4 right-4 text-white text-3xl leading-none hover:opacity-80"
      >
        ×
      </button>
      {owned && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (
              window.confirm(
                "Delete this photo? This can't be undone.",
              )
            ) {
              onDelete();
            }
          }}
          className="absolute top-4 left-4 text-white text-sm px-3 py-1.5 rounded bg-red-600/90 hover:bg-red-600"
        >
          Delete
        </button>
      )}
    </div>
  );
}
