-- Pub Scrawl — enable Realtime on submissions
-- Adds the table to Supabase's default realtime publication so
-- browser clients can subscribe to INSERT / UPDATE / DELETE events
-- and reflect new photos, drag moves, and deletes without a refresh.

alter publication supabase_realtime add table submissions;
