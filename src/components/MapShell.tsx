"use client";

import { useState } from "react";
import Map from "./Map";
import VenuePanel from "./VenuePanel";
import type { Venue } from "@/lib/types";

type Props = {
  venues: Venue[];
};

export default function MapShell({ venues }: Props) {
  const [selected, setSelected] = useState<Venue | null>(null);

  return (
    <div className="relative w-screen h-screen">
      <Map venues={venues} onVenueSelect={setSelected} />
      <VenuePanel venue={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
