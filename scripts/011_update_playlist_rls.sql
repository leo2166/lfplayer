-- Permitir lectura pública de playlists
DROP POLICY IF EXISTS "playlists_select_own" ON public.playlists;
CREATE POLICY "playlists_select_public"
  ON public.playlists FOR SELECT
  USING (true);

-- Mantener escritura solo para propios (Admin)
-- (Las políticas insert/update/delete existentes _own funcionan bien si el admin es el creador)

-- Permitir lectura pública de canciones de playlist
DROP POLICY IF EXISTS "playlist_songs_select" ON public.playlist_songs;
CREATE POLICY "playlist_songs_select_public"
  ON public.playlist_songs FOR SELECT
  USING (true);
