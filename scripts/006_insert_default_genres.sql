-- Insert default genres
INSERT INTO public.genres (name, description, color) VALUES
  ('Rock', 'Rock and roll classics', '#EF4444'),
  ('Pop', 'Popular music hits', '#EC4899'),
  ('Hip Hop', 'Hip hop and rap', '#F97316'),
  ('Jazz', 'Smooth jazz vibes', '#F59E0B'),
  ('Classical', 'Classical symphonies', '#8B5CF6'),
  ('Electronic', 'Electronic and EDM', '#06B6D4'),
  ('R&B', 'Soul and R&B', '#D946EF'),
  ('Country', 'Country music', '#84CC16'),
  ('Reggae', 'Reggae and ska', '#10B981'),
  ('Metal', 'Heavy metal', '#6366F1')
ON CONFLICT (name) DO NOTHING;
