-- Create indexes to speed up duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_songs_user_title_artist ON songs(user_id, title, artist);
CREATE INDEX IF NOT EXISTS idx_songs_genre_id ON songs(genre_id);
