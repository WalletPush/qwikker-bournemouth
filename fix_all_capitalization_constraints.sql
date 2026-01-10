-- Remove ALL check constraints that force lowercase on display fields
-- These fields should allow proper capitalization from Google Places

DO $$ 
BEGIN
  -- Drop business_town constraint
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'profiles_business_town_check' 
             AND table_name = 'business_profiles') THEN
    ALTER TABLE business_profiles DROP CONSTRAINT profiles_business_town_check;
    RAISE NOTICE '✅ Removed profiles_business_town_check';
  END IF;

  -- Drop business_type constraint
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'profiles_business_type_check' 
             AND table_name = 'business_profiles') THEN
    ALTER TABLE business_profiles DROP CONSTRAINT profiles_business_type_check;
    RAISE NOTICE '✅ Removed profiles_business_type_check';
  END IF;

  -- Drop business_category constraint
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'profiles_business_category_check' 
             AND table_name = 'business_profiles') THEN
    ALTER TABLE business_profiles DROP CONSTRAINT profiles_business_category_check;
    RAISE NOTICE '✅ Removed profiles_business_category_check';
  END IF;

  RAISE NOTICE '🎉 All capitalization constraints removed! Fields can now use proper capitalization.';
END $$;

-- Verify what constraints remain
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'business_profiles'
  AND constraint_name LIKE 'profiles_%_check'
ORDER BY constraint_name;

