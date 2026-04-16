import MapShell from "@/components/MapShell";
import { fetchVenues } from "@/lib/queries";

export const revalidate = 60;

export default async function Home() {
  const venues = await fetchVenues();
  return <MapShell venues={venues} />;
}
