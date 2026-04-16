import { supabase } from "./supabase";
import type { Submission, Venue } from "./types";

export async function fetchVenues(): Promise<Venue[]> {
  // Supabase/PostgREST caps single-query returns at 1000 rows, so we
  // page through until exhausted. London has ~2.5k venues.
  const PAGE = 1000;
  const all: Venue[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("venues")
      .select("id, name, address, lat, lng, created_at")
      .order("id")
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

export async function fetchSubmissionsForVenue(
  venueId: string,
): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("id, venue_id, photo_url, created_at")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
