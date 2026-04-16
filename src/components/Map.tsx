"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Venue } from "@/lib/types";

type Props = {
  venues: Venue[];
  onVenueSelect: (venue: Venue) => void;
};

export default function Map({ venues, onVenueSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onVenueSelectRef = useRef(onVenueSelect);

  useEffect(() => {
    onVenueSelectRef.current = onVenueSelect;
  }, [onVenueSelect]);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      // MapLibre v5's module shape puts the namespace under `default` in some
      // bundlers but flat in others — accept either.
      const mod = await import("maplibre-gl");
      const maplibregl = mod.default ?? mod;
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
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

      for (const venue of venues) {
        const lng = Number(venue.lng);
        const lat = Number(venue.lat);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
        const marker = new maplibregl.Marker({ color: "#000" })
          .setLngLat([lng, lat])
          .addTo(map);
        const el = marker.getElement();
        el.style.cursor = "pointer";
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onVenueSelectRef.current(venue);
        });
      }

      mapRef.current = map;
      cleanup = () => map.remove();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
      mapRef.current = null;
    };
  }, [venues]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
