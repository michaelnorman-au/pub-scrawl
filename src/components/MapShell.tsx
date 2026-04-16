"use client";

import { useState } from "react";
import Map, { type FocusTarget } from "./Map";
import SearchBox from "./SearchBox";
import VenuePanel from "./VenuePanel";
import type { Venue } from "@/lib/types";

type Props = {
  venues: Venue[];
};

export default function MapShell({ venues }: Props) {
  const [selected, setSelected] = useState<Venue | null>(null);
  // Separate from `selected` so clicking a pin doesn't also trigger a
  // fly animation (the pin is already centred under the cursor).
  const [focus, setFocus] = useState<FocusTarget | null>(null);

  function focusVenue(v: Venue) {
    setSelected(v);
    // Always a new object so React sees a prop change even if the same
    // venue is searched twice.
    setFocus({ venue: v });
  }

  return (
    <div className="relative w-screen h-screen">
      <Map venues={venues} onVenueSelect={setSelected} focus={focus} />
      <SearchBox venues={venues} onSelect={focusVenue} />
      <VenuePanel venue={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
