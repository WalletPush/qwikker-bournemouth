-- Add google_photo_name column to replace google_photo_reference
-- This stores the NEW API photo name (e.g., "places/ChIJ...")
-- Photo names can expire and must NOT be cached long-term

-- Add the new column
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS google_photo_name TEXT;

-- Add comment
COMMENT ON COLUMN business_profiles.google_photo_name IS 'Google Places API (New) photo name. WARNING: Photo names can expire - do not cache. Fetch fresh via Place Details when needed.';

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'business_profiles'
  AND column_name = 'google_photo_name';

