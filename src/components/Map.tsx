"use client";

import { useEffect, useRef } from "react";
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from "maplibre-gl";
import type { Submission, Venue } from "@/lib/types";

export type FocusTarget = { venue: Venue };

type Props = {
  venues: Venue[];
  submissions: Submission[];
  focus: FocusTarget | null;
  onFileDrop: (file: File, lng: number, lat: number) => void;
  onMapTap: (lng: number, lat: number) => void;
  onPhotoClick: (submission: Submission) => void;
};

export default function Map({
  venues,
  submissions,
  focus,
  onFileDrop,
  onMapTap,
  onPhotoClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const venuesRef = useRef(venues);
  const markersRef = useRef<globalThis.Map<string, MapLibreMarker>>(
    new globalThis.Map(),
  );

  const onFileDropRef = useRef(onFileDrop);
  const onMapTapRef = useRef(onMapTap);
  const onPhotoClickRef = useRef(onPhotoClick);

  useEffect(() => {
    onFileDropRef.current = onFileDrop;
    onMapTapRef.current = onMapTap;
    onPhotoClickRef.current = onPhotoClick;
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

        const img = document.createElement("img");
        img.src = s.photo_url;
        img.alt = "";
        img.loading = "lazy";
        img.style.width = "60px";
        img.style.height = "60px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "4px";
        img.style.border = "2px solid white";
        img.style.boxShadow = "0 2px 8px rgba(0,0,0,0.35)";
        img.style.cursor = "zoom-in";
        img.style.display = "block";
        img.addEventListener("click", (e) => {
          e.stopPropagation();
          onPhotoClickRef.current(s);
        });

        const marker = new maplibregl.Marker({ element: img, anchor: "center" })
          .setLngLat([s.lng, s.lat])
          .addTo(map);

        markersRef.current.set(s.id, marker);
      }
    })();
  }, [submissions]);

  // Init map once.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mod = await import("maplibre-gl");
      const maplibregl = mod.default ?? mod;
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            basemap: {
              type: "raster",
              tiles: [
                "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
                "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
                "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
                "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>',
            },
          },
          layers: [{ id: "basemap", type: "raster", source: "basemap" }],
        },
        center: [-0.1276, 51.5074],
        zoom: 11,
        maxBounds: [
          [-0.55, 51.25],
          [0.35, 51.75],
        ],
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );

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
            "text-color": "#222",
            "text-halo-color": "#fff",
            "text-halo-width": 1.5,
          },
        });
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
