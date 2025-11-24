-- Create playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_color TEXT DEFAULT '#7C3AED',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "playlists_select_own"
  ON public.playlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "playlists_insert_own"
  ON public.playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "playlists_update_own"
  ON public.playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "playlists_delete_own"
  ON public.playlists FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX playlists_user_id_idx ON public.playlists(user_id);
