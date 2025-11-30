-- Create a new policy to allow public, read-only access to all songs.
-- This is necessary for the "Guest Mode" to work, so that unauthenticated
-- users can see and play music.
CREATE POLICY "songs_select_public"
  ON public.songs FOR SELECT
  USING (true);
