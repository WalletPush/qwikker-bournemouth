-- Add placeholder system columns to business_profiles
-- Run this migration to support the placeholder image system

-- Add placeholder_variant column (0 = default neutral variant)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS placeholder_variant INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN business_profiles.placeholder_variant IS 'Placeholder image variant ID (0-10). Admins can select variants for unclaimed businesses. Must be <= unclaimedMaxVariantId for unclaimed status.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_placeholder_variant 
ON business_profiles(placeholder_variant);

-- Verify columns exist
DO $$ 
BEGIN
  RAISE NOTICE '✅ Verifying placeholder_variant column...';
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_profiles' 
    AND column_name = 'placeholder_variant'
  ) THEN
    RAISE NOTICE '   ✅ placeholder_variant column exists';
  ELSE
    RAISE EXCEPTION '   ❌ placeholder_variant column missing!';
  END IF;
  
  RAISE NOTICE '✅ Placeholder system migration complete!';
END $$;

-- Show sample of data
SELECT 
  business_name,
  status,
  system_category,
  placeholder_variant
FROM business_profiles
WHERE status IN ('unclaimed', 'claimed_free')
LIMIT 5;

