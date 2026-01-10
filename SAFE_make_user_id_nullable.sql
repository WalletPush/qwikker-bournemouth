-- SAFE SOLUTION: Make user_id NULLABLE instead of removing UNIQUE constraint
-- This way:
-- - Founding member businesses: user_id = business owner (UNIQUE) ✅
-- - Imported businesses: user_id = NULL (no creator needed) ✅
-- - Dashboard login still works: WHERE user_id = auth.uid() ✅

DO $$ 
BEGIN
  -- Make user_id nullable (if not already)
  ALTER TABLE business_profiles ALTER COLUMN user_id DROP NOT NULL;
  RAISE NOTICE '✅ user_id is now NULLABLE';
  
  RAISE NOTICE '🎉 Safe solution implemented!';
  RAISE NOTICE 'ℹ️  Founding member businesses: user_id = business owner account (UNIQUE preserved)';
  RAISE NOTICE 'ℹ️  Imported businesses: user_id = NULL (no conflict with UNIQUE)';
  RAISE NOTICE 'ℹ️  owner_user_id still used to track who claims/owns the business';
END $$;

-- Verify
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'business_profiles'
  AND column_name IN ('user_id', 'owner_user_id');

