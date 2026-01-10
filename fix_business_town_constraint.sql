-- Remove the business_town check constraint that forces lowercase
-- business_town should allow proper capitalization for display purposes

DO $$ 
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'profiles_business_town_check' 
             AND table_name = 'business_profiles') THEN
    ALTER TABLE business_profiles DROP CONSTRAINT profiles_business_town_check;
    RAISE NOTICE '✅ Removed profiles_business_town_check constraint';
  ELSE
    RAISE NOTICE '⏭️  Constraint does not exist or already removed';
  END IF;

  RAISE NOTICE '🎉 business_town can now use proper capitalization!';
END $$;

-- Verify
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'business_profiles'
  AND constraint_name LIKE '%business_town%';

