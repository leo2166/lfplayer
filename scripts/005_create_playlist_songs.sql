-- Create junction table for playlist and songs (many-to-many)
CREATE TABLE IF NOT EXISTS public.playlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INTEGER,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(playlist_id, song_id)
);

ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see songs in their playlists
CREATE POLICY "playlist_songs_select"
  ON public.playlist_songs FOR SELECT
  USING (
    playlist_id IN (
      SELECT id FROM public.playlists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "playlist_songs_insert"
  ON public.playlist_songs FOR INSERT
  WITH CHECK (
    playlist_id IN (
      SELECT id FROM public.playlists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "playlist_songs_delete"
  ON public.playlist_songs FOR DELETE
  USING (
    playlist_id IN (
      SELECT id FROM public.playlists WHERE user_id = auth.uid()
    )
  );

CREATE INDEX playlist_songs_playlist_id_idx ON public.playlist_songs(playlist_id);
CREATE INDEX playlist_songs_song_id_idx ON public.playlist_songs(song_id);
