-- Add storage_path column to songs table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'songs' AND column_name = 'storage_path') THEN
        ALTER TABLE songs ADD COLUMN storage_path TEXT;
        RAISE NOTICE 'Column storage_path added successfully.';
    ELSE
        RAISE NOTICE 'Column storage_path already exists.';
    END IF;
END $$;

-- Populate storage_path from file_path if storage_path is null
UPDATE songs
SET storage_path = file_path
WHERE storage_path IS NULL AND file_path IS NOT NULL;

-- Verify
SELECT count(*) as songs_with_storage_path FROM songs WHERE storage_path IS NOT NULL;
