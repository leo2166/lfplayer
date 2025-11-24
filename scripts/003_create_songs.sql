-- Create songs table
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  genre_id UUID REFERENCES public.genres(id) ON DELETE SET NULL,
  duration INTEGER,
  blob_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "songs_select_own"
  ON public.songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "songs_insert_own"
  ON public.songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "songs_update_own"
  ON public.songs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "songs_delete_own"
  ON public.songs FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX songs_user_id_idx ON public.songs(user_id);
CREATE INDEX songs_genre_id_idx ON public.songs(genre_id);
