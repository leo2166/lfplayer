ALTER TABLE IF EXISTS public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.storage_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "songs_select_public" ON public.songs;
DROP POLICY IF EXISTS "genres_select_public" ON public.genres;
DROP POLICY IF EXISTS "buckets_select_public" ON public.storage_buckets;

CREATE POLICY "songs_select_public" ON public.songs FOR SELECT USING (true);
CREATE POLICY "genres_select_public" ON public.genres FOR SELECT USING (true);
CREATE POLICY "buckets_select_public" ON public.storage_buckets FOR SELECT USING (true);
