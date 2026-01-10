-- Remove the UNIQUE constraint on user_id
-- This constraint prevents admins from importing multiple businesses
-- user_id = creator/importer (can create many businesses)
-- owner_user_id = business owner (unique per business when claimed)

DO $$ 
BEGIN
  -- Drop the unique constraint on user_id
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'profiles_user_id_key' 
             AND table_name = 'business_profiles') THEN
    ALTER TABLE business_profiles DROP CONSTRAINT profiles_user_id_key;
    RAISE NOTICE '✅ Removed profiles_user_id_key (UNIQUE constraint)';
  ELSE
    RAISE NOTICE '⏭️  Constraint already removed or does not exist';
  END IF;

  RAISE NOTICE '🎉 Admin users can now create/import multiple businesses!';
  RAISE NOTICE 'ℹ️  user_id = creator (can create many)';
  RAISE NOTICE 'ℹ️  owner_user_id = actual business owner (set when claimed)';
END $$;

-- Verify the constraint is gone
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'business_profiles'
  AND constraint_name = 'profiles_user_id_key';

