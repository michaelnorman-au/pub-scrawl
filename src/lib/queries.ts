import { supabase } from "./supabase";
import type { Submission, Venue } from "./types";

const PAGE = 1000;

export async function fetchVenues(): Promise<Venue[]> {
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

export async function fetchSubmissions(): Promise<Submission[]> {
  const all: Submission[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("submissions")
      .select("id, venue_id, photo_url, lat, lng, created_at")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}
