"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  StyleSpecification,
} from "maplibre-gl";
import type { Submission, Venue } from "@/lib/types";

// Ghost style: OpenFreeMap vector tiles, no fills or lines — just labels
// in light grey. Our venue labels go on top in black.
const GHOST_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    openfreemap: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · tiles <a href="https://openfreemap.org">OpenFreeMap</a>',
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#ffffff" },
    },
    {
      id: "place-labels",
      type: "symbol",
      source: "openfreemap",
      "source-layer": "place",
      minzoom: 8,
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": [
          "match",
          ["get", "class"],
          ["city"], 14,
          ["town"], 12,
          ["suburb", "neighbourhood"], 11,
          10,
        ],
        "text-letter-spacing": 0.05,
      },
      paint: {
        "text-color": "#bbbbbb",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
    },
    {
      id: "road-labels",
      type: "symbol",
      source: "openfreemap",
      "source-layer": "transportation_name",
      minzoom: 12,
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "symbol-placement": "line",
      },
      paint: {
        "text-color": "#bbbbbb",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
    },
    {
      id: "water-labels",
      type: "symbol",
      source: "openfreemap",
      "source-layer": "water_name",
      minzoom: 10,
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": ["Noto Sans Italic"],
        "text-size": 11,
        "text-letter-spacing": 0.1,
      },
      paint: {
        "text-color": "#bbbbbb",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
    },
  ],
};

export type FocusTarget = { venue: Venue };

type Props = {
  venues: Venue[];
  submissions: Submission[];
  focus: FocusTarget | null;
  ownedIds: Set<string>;
  onFileDrop: (file: File, lng: number, lat: number) => void;
  onMapTap: (lng: number, lat: number) => void;
  onPhotoClick: (submission: Submission) => void;
  onPhotoMove: (
    submissionId: string,
    lng: number,
    lat: number,
  ) => Promise<boolean>;
};

export default function Map({
  venues,
  submissions,
  focus,
  ownedIds,
  onFileDrop,
  onMapTap,
  onPhotoClick,
  onPhotoMove,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const venuesRef = useRef(venues);
  const markersRef = useRef<globalThis.Map<string, MapLibreMarker>>(
    new globalThis.Map(),
  );
  // Flipped true once the map has loaded. Gates the submissions-marker
  // effect, which otherwise races ahead of map init and silently does
  // nothing for the initial server-hydrated submissions.
  const [mapReady, setMapReady] = useState(false);

  const onFileDropRef = useRef(onFileDrop);
  const onMapTapRef = useRef(onMapTap);
  const onPhotoClickRef = useRef(onPhotoClick);
  const onPhotoMoveRef = useRef(onPhotoMove);
  const ownedIdsRef = useRef(ownedIds);

  useEffect(() => {
    onFileDropRef.current = onFileDrop;
    onMapTapRef.current = onMapTap;
    onPhotoClickRef.current = onPhotoClick;
    onPhotoMoveRef.current = onPhotoMove;
    ownedIdsRef.current = ownedIds;
  });

  // Update venue labels source when venues change.
  useEffect(() => {
    venuesRef.current = venues;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("venues") as
      | { setData: (d: GeoJSON.FeatureCollection) => void }
      | undefined;
    src?.setData(venuesToGeoJSON(venues));
  }, [venues]);

  // Fly to a searched venue.
  useEffect(() => {
    if (!focus) return;
    const map = mapRef.current;
    if (!map) return;
    const lng = Number(focus.venue.lng);
    const lat = Number(focus.venue.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    map.easeTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 16),
      duration: 600,
    });
  }, [focus]);

  // Diff-sync submission markers to the `submissions` prop.
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    const want = new Set<string>();
    for (const s of submissions) want.add(s.id);

    // Remove gone
    for (const [id, marker] of markersRef.current) {
      if (!want.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Add new
    (async () => {
      const mod = await import("maplibre-gl");
      const maplibregl = mod.default ?? mod;
      for (const s of submissions) {
        if (markersRef.current.has(s.id)) continue;
        if (s.lat == null || s.lng == null) continue;

        const owned = ownedIdsRef.current.has(s.id);

        const img = document.createElement("img");
        img.src = s.photo_url;
        img.alt = "";
        img.loading = "lazy";
        img.style.maxWidth = "80px";
        img.style.maxHeight = "80px";
        img.style.width = "auto";
        img.style.height = "auto";
        img.style.cursor = owned ? "grab" : "zoom-in";
        img.style.display = "block";
        img.addEventListener("click", (e) => {
          e.stopPropagation();
          onPhotoClickRef.current(s);
        });
        // Prevent browser-default image drag from stealing HTML5 drag
        // events — we want MapLibre to own the drag when draggable.
        img.draggable = false;

        const marker = new maplibregl.Marker({
          element: img,
          anchor: "center",
          draggable: owned,
        })
          .setLngLat([s.lng, s.lat])
          .addTo(map);

        // Revert coords if the PATCH fails.
        let origLng = s.lng;
        let origLat = s.lat;
        marker.on("dragstart", () => {
          const ll = marker.getLngLat();
          origLng = ll.lng;
          origLat = ll.lat;
          img.style.cursor = "grabbing";
        });
        marker.on("dragend", async () => {
          img.style.cursor = ownedIdsRef.current.has(s.id) ? "grab" : "zoom-in";
          const { lng, lat } = marker.getLngLat();
          const ok = await onPhotoMoveRef.current(s.id, lng, lat);
          if (!ok) {
            marker.setLngLat([origLng, origLat]);
          }
        });

        markersRef.current.set(s.id, marker);
      }
    })();
  }, [submissions, mapReady]);

  // Sync draggability + cursor on markers when ownership changes (e.g.
  // after mount when we read localStorage).
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const owned = ownedIds.has(id);
      marker.setDraggable(owned);
      const el = marker.getElement() as HTMLImageElement;
      el.style.cursor = owned ? "grab" : "zoom-in";
    }
  }, [ownedIds]);

  // Init map once.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mod = await import("maplibre-gl");
      const maplibregl = mod.default ?? mod;
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: GHOST_STYLE,
        center: [-0.1276, 51.5074],
        zoom: 11,
        maxBounds: [
          [-0.55, 51.25],
          [0.35, 51.75],
        ],
        attributionControl: false,
      });

      // Keep gestures simple: pan + pinch-zoom only.
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.touchPitch.disable();

      // Custom wheel: trackpad two-finger scroll pans; pinch (wheel + ctrlKey)
      // zooms.
      map.scrollZoom.disable();
      map.getCanvas().addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          if (e.ctrlKey) {
            map.zoomTo(map.getZoom() - e.deltaY / 100, { duration: 0 });
          } else {
            map.panBy([e.deltaX, e.deltaY], { duration: 0 });
          }
        },
        { passive: false },
      );

      map.on("load", () => {
        map.addSource("venues", {
          type: "geojson",
          data: venuesToGeoJSON(venuesRef.current),
        });

        map.addLayer({
          id: "venue-labels",
          type: "symbol",
          source: "venues",
          minzoom: 14,
          layout: {
            "text-field": ["get", "name"],
            "text-size": 11,
            "text-font": ["Noto Sans Regular"],
            "text-anchor": "center",
            "text-allow-overlap": false,
            "text-optional": true,
            "text-padding": 2,
          },
          paint: {
            "text-color": "#000",
            "text-halo-color": "#fff",
            "text-halo-width": 1.5,
          },
        });

        setMapReady(true);
      });

      // Drag-and-drop files to upload at the drop location (desktop).
      const container = containerRef.current;
      container.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      });
      container.addEventListener("drop", (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        const rect = container.getBoundingClientRect();
        const { lng, lat } = map.unproject([
          e.clientX - rect.left,
          e.clientY - rect.top,
        ]);
        onFileDropRef.current(file, lng, lat);
      });

      // Tap on touch devices to open the file picker at the tap location.
      // MapLibre already distinguishes tap vs drag internally — its `click`
      // event only fires for taps that didn't drag.
      const isTouch =
        typeof window !== "undefined" &&
        window.matchMedia("(hover: none) and (pointer: coarse)").matches;
      if (isTouch) {
        map.on("click", (e) => {
          onMapTapRef.current(e.lngLat.lng, e.lngLat.lat);
        });
      }

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      for (const m of markersRef.current.values()) m.remove();
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}

function venuesToGeoJSON(
  venues: Venue[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (const v of venues) {
    const lng = Number(v.lng);
    const lat = Number(v.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    features.push({
      type: "Feature",
      properties: { id: v.id, name: v.name },
      geometry: { type: "Point", coordinates: [lng, lat] },
    });
  }
  return { type: "FeatureCollection", features };
}
