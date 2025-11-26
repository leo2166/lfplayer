-- Insert default genres
INSERT INTO public.genres (name, description, color, created_by) VALUES
  ('Rock', 'Rock and roll classics', '#EF4444', auth.uid()),
  ('Pop', 'Popular music hits', '#EC4899', auth.uid()),
  ('Hip Hop', 'Hip hop and rap', '#F97316', auth.uid()),
  ('Jazz', 'Smooth jazz vibes', '#F59E0B', auth.uid()),
  ('Classical', 'Classical symphonies', '#8B5CF6', auth.uid()),
  ('Electronic', 'Electronic and EDM', '#06B6D4', auth.uid()),
  ('R&B', 'Soul and R&B', '#D946EF', auth.uid()),
  ('Country', 'Country music', '#84CC16', auth.uid()),
  ('Reggae', 'Reggae and ska', '#10B981', auth.uid()),
  ('Metal', 'Heavy metal', '#6366F1', auth.uid()),
  ('Romantica en español', 'Música romántica en español', '#E11D48', auth.uid()),
  ('Romantica en ingles', 'Música romántica en ingles', '#F43F5E', auth.uid()),
  ('Salsa', 'Salsa music', '#FBBF24', auth.uid()),
  ('Merengue', 'Merengue music', '#F59E0B', auth.uid()),
  ('Tecno Vallenato', 'Tecno Vallenato music', '#10B981', auth.uid()),
  ('Gaita Zuliana', 'Gaita Zuliana music', '#3B82F6', auth.uid())
ON CONFLICT (name) DO NOTHING;
