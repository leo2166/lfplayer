-- Create genres table
CREATE TABLE IF NOT EXISTS public.genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#7C3AED',
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "genres_select_all"
  ON public.genres FOR SELECT
  USING (true);
