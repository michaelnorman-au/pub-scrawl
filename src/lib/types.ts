export type Venue = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  created_at: string;
};

export type Submission = {
  id: string;
  venue_id: string | null;
  photo_url: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
};
