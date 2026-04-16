import { supabase } from "./supabase";
import type { Submission, Venue } from "./types";

export async function fetchVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from("venues")
    .select("id, name, address, lat, lng, created_at");

  if (error) throw error;
  return data ?? [];
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
