"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { type FocusTarget } from "./Map";
import SearchBox from "./SearchBox";
import Lightbox from "./Lightbox";
import UploadDialog, { type UploadChoice } from "./UploadDialog";
import InfoModal from "./InfoModal";
import { readExifGps, type GpsCoords } from "@/lib/exif";
import type { Submission, Venue } from "@/lib/types";

type Props = {
  venues: Venue[];
  initialSubmissions: Submission[];
};

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "error"; message: string };

type PendingDialog = {
  exifCoords: GpsCoords;
  dropCoords: GpsCoords;
  previewSrc: string;
  resolve: (choice: UploadChoice) => void;
};

const TOKEN_KEY_PREFIX = "pubscrawl:token:";

function readToken(submissionId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY_PREFIX + submissionId);
  } catch {
    return null;
  }
}

function writeToken(submissionId: string, token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY_PREFIX + submissionId, token);
  } catch {
    /* ignore */
  }
}

export default function MapShell({ venues, initialSubmissions }: Props) {
  const [submissions, setSubmissions] =
    useState<Submission[]>(initialSubmissions);
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const [lightboxSubmission, setLightboxSubmission] =
    useState<Submission | null>(null);
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const [ownedIds, setOwnedIds] = useState<Set<string>>(() => new Set());
  const [pendingDialog, setPendingDialog] = useState<PendingDialog | null>(
    null,
  );
  const [infoOpen, setInfoOpen] = useState(false);

  const hydratedRef = useRef(false);
  if (!hydratedRef.current && typeof window !== "undefined") {
    hydratedRef.current = true;
    const ids = new Set<string>();
    for (const s of initialSubmissions) {
      if (readToken(s.id)) ids.add(s.id);
    }
    if (ids.size > 0) setOwnedIds(ids);
  }

  // Block document-level Ctrl+wheel (desktop trackpad pinch / Ctrl+scroll)
  // from triggering the browser's own zoom when the user isn't over the
  // map canvas itself.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    document.addEventListener("wheel", onWheel, { passive: false });
    return () => document.removeEventListener("wheel", onWheel);
  }, []);

  // Auto-open the info modal on first visit.
  useEffect(() => {
    try {
      if (window.localStorage.getItem("pubscrawl:seen-info") !== "1") {
        setInfoOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function closeInfo() {
    setInfoOpen(false);
    try {
      window.localStorage.setItem("pubscrawl:seen-info", "1");
    } catch {
      /* ignore */
    }
  }

  const pendingCoordsRef = useRef<{ lng: number; lat: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function askUserForLocation(
    exifCoords: GpsCoords,
    dropCoords: GpsCoords,
    previewSrc: string,
  ): Promise<UploadChoice> {
    return new Promise<UploadChoice>((resolve) => {
      setPendingDialog({ exifCoords, dropCoords, previewSrc, resolve });
    });
  }

  async function uploadFile(file: File, lng: number, lat: number) {
    const exif = await readExifGps(file);

    let finalLng = lng;
    let finalLat = lat;

    if (exif) {
      const previewSrc = URL.createObjectURL(file);
      try {
        const choice = await askUserForLocation(
          exif,
          { lat, lng },
          previewSrc,
        );
        if (choice === "cancel") return;
        if (choice === "exif") {
          finalLng = exif.lng;
          finalLat = exif.lat;
        }
      } finally {
        URL.revokeObjectURL(previewSrc);
      }
    }

    setUpload({ status: "uploading" });
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("lng", String(finalLng));
      body.append("lat", String(finalLat));
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) {
        const { error } = await res
          .json()
          .catch(() => ({ error: "upload failed" }));
        throw new Error(error ?? "upload failed");
      }
      const { submission, owner_token } = (await res.json()) as {
        submission: Submission;
        owner_token: string;
      };
      if (owner_token) {
        writeToken(submission.id, owner_token);
        setOwnedIds((prev) => {
          const next = new Set(prev);
          next.add(submission.id);
          return next;
        });
      }
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

  async function handlePhotoDelete(submissionId: string) {
    const token = readToken(submissionId);
    if (!token) return;
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "DELETE",
        headers: { "x-owner-token": token },
      });
      if (!res.ok) {
        setUpload({ status: "error", message: "couldn't delete photo" });
        return;
      }
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      setOwnedIds((prev) => {
        const next = new Set(prev);
        next.delete(submissionId);
        return next;
      });
      try {
        window.localStorage.removeItem(TOKEN_KEY_PREFIX + submissionId);
      } catch {
        /* ignore */
      }
      setLightboxSubmission(null);
    } catch {
      setUpload({ status: "error", message: "couldn't delete photo" });
    }
  }

  async function handlePhotoMove(
    submissionId: string,
    lng: number,
    lat: number,
  ): Promise<boolean> {
    const token = readToken(submissionId);
    if (!token) return false;
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lng, lat, owner_token: token }),
      });
      if (!res.ok) {
        setUpload({ status: "error", message: "couldn't move photo" });
        return false;
      }
      const { submission } = (await res.json()) as { submission: Submission };
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submission.id ? submission : s)),
      );
      return true;
    } catch {
      return false;
    }
  }

  const ownedSet = useMemo(() => ownedIds, [ownedIds]);

  return (
    <div className="relative w-screen h-screen">
      <Map
        venues={venues}
        submissions={submissions}
        focus={focus}
        ownedIds={ownedSet}
        onFileDrop={uploadFile}
        onMapTap={handleMapTap}
        onPhotoClick={(s) => setLightboxSubmission(s)}
        onPhotoMove={handlePhotoMove}
      />
      <div className="fixed z-20 bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2 w-[min(calc(100%-1.5rem),420px)]">
        <div className="flex-1">
          <SearchBox venues={venues} onSelect={(v) => setFocus({ venue: v })} />
        </div>
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label="About Pub Scrawl"
          className="shrink-0 w-11 h-11 rounded-full bg-white/95 backdrop-blur shadow-lg text-zinc-500 text-sm hover:bg-white flex items-center justify-center"
        >
          i
        </button>
      </div>
      <Lightbox
        src={lightboxSubmission?.photo_url ?? null}
        owned={
          lightboxSubmission ? ownedIds.has(lightboxSubmission.id) : false
        }
        onClose={() => setLightboxSubmission(null)}
        onDelete={
          lightboxSubmission
            ? () => handlePhotoDelete(lightboxSubmission.id)
            : undefined
        }
      />

      {pendingDialog && (
        <UploadDialog
          exifCoords={pendingDialog.exifCoords}
          dropCoords={pendingDialog.dropCoords}
          previewSrc={pendingDialog.previewSrc}
          onChoose={(c) => {
            pendingDialog.resolve(c);
            setPendingDialog(null);
          }}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {upload.status !== "idle" && (
        <div className="fixed z-30 bottom-4 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {upload.status === "uploading"
            ? "Uploading…"
            : `Upload failed: ${upload.message}`}
        </div>
      )}

      <InfoModal open={infoOpen} onClose={closeInfo} />
    </div>
  );
}
