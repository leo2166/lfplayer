-- Optimize duplicate checking for song uploads
CREATE INDEX CONCURRENTLY IF NOT EXISTS songs_user_id_artist_title_idx ON songs (user_id, artist, title);
