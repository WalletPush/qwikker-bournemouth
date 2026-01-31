-- QUICK FIX: Run this in Supabase SQL Editor
-- Expands placeholder_variant range from 0-2 to 0-10

-- Drop existing constraint
ALTER TABLE business_profiles
DROP CONSTRAINT IF EXISTS business_profiles_placeholder_variant_check;

-- Add new constraint (0-10)
ALTER TABLE business_profiles
ADD CONSTRAINT business_profiles_placeholder_variant_check 
CHECK (placeholder_variant >= 0 AND placeholder_variant <= 10);

-- Verify it worked
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'business_profiles_placeholder_variant_check';

-- Should show: CHECK ((placeholder_variant >= 0) AND (placeholder_variant <= 10))
