import MapShell from "@/components/MapShell";
import { fetchSubmissions, fetchVenues } from "@/lib/queries";

export const revalidate = 60;

export default async function Home() {
  const [venues, initialSubmissions] = await Promise.all([
    fetchVenues(),
    fetchSubmissions(),
  ]);
  return <MapShell venues={venues} initialSubmissions={initialSubmissions} />;
}
