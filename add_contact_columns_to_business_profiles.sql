-- Add ONLY the missing Google Places column
-- email, phone, website, rating, review_count already exist!

DO $$ 
BEGIN
  -- Add years_on_google column (the ONLY missing column)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'business_profiles' 
                 AND column_name = 'years_on_google') THEN
    ALTER TABLE business_profiles ADD COLUMN years_on_google INTEGER;
    RAISE NOTICE '✅ Added years_on_google column';
  ELSE
    RAISE NOTICE '⏭️  years_on_google already exists';
  END IF;

  RAISE NOTICE '🎉 Migration complete!';
END $$;

-- Verify the column was added
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'business_profiles'
  AND column_name IN ('email', 'phone', 'website', 'rating', 'review_count', 'years_on_google')
ORDER BY column_name;

