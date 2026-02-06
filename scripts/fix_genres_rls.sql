-- Enable RLS on genres
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

-- Allow public read access to genres
CREATE POLICY "Allow public read access" ON public.genres
FOR SELECT USING (true);

-- Allow authenticated users to insert genres (needed for upload)
CREATE POLICY "Allow authenticated insert" ON public.genres
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update genres
CREATE POLICY "Allow authenticated update" ON public.genres
FOR UPDATE USING (auth.role() = 'authenticated');
