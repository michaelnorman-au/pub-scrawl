"use client";

import { useEffect, useRef } from "react";
import type {
  Map as MapLibreMap,
  GeoJSONSource,
  MapGeoJSONFeature,
} from "maplibre-gl";
import type { Venue } from "@/lib/types";

type Props = {
  venues: Venue[];
  onVenueSelect: (venue: Venue) => void;
};

export default function Map({ venues, onVenueSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const venuesRef = useRef(venues);
  const onVenueSelectRef = useRef(onVenueSelect);

  useEffect(() => {
    onVenueSelectRef.current = onVenueSelect;
  }, [onVenueSelect]);

  useEffect(() => {
    venuesRef.current = venues;
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) {
      const src = map.getSource("venues") as GeoJSONSource | undefined;
      src?.setData(toGeoJSON(venues));
    }
  }, [venues]);

  useEffect(() => {
    let cancelled = false;

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

      map.on("load", () => {
        map.addSource("venues", {
          type: "geojson",
          data: toGeoJSON(venuesRef.current),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "venues",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#111",
            "circle-radius": [
              "step",
              ["get", "point_count"],
              15,
              50,
              20,
              200,
              25,
              1000,
              30,
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });

        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "venues",
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-size": 12,
          },
          paint: { "text-color": "#fff" },
        });

        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: "venues",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#111",
            "circle-radius": 7,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });

        map.on("click", "clusters", async (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["clusters"],
          });
          const feature = features[0];
          const clusterId = feature?.properties?.cluster_id;
          if (clusterId == null) return;
          const src = map.getSource("venues") as GeoJSONSource;
          const zoom = await src.getClusterExpansionZoom(clusterId);
          const coords = (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ];
          map.easeTo({ center: coords, zoom });
        });

        map.on("click", "unclustered-point", (e) => {
          const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
          if (!feature) return;
          const id = feature.properties?.id as string | undefined;
          if (!id) return;
          const venue = venuesRef.current.find((v) => v.id === id);
          if (venue) onVenueSelectRef.current(venue);
        });

        for (const layer of ["clusters", "unclustered-point"] as const) {
          map.on("mouseenter", layer, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layer, () => {
            map.getCanvas().style.cursor = "";
          });
        }
      });

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}

function toGeoJSON(venues: Venue[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
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
