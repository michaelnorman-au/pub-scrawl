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
  venue_id: string;
  photo_url: string;
  created_at: string;
};
