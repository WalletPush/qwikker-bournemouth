-- ==========================================
-- PHASE 2: LOCK DOWN system_category (DEPLOY AFTER CODE IS UPDATED)
-- ==========================================
-- This migration adds constraints and cleans up
-- ONLY run this AFTER Phase 1 AND after all code is updated

-- ⚠️ CRITICAL: DO NOT RUN THIS UNTIL:
-- 1. Phase 1 (001_add_category_layers.sql) has been deployed
-- 2. All code has been updated to use system_category and display_category
-- 3. You've verified in staging that everything works
-- 4. At least 24-48 hours have passed to catch any issues

-- ==========================================
-- PRE-FLIGHT CHECKS
-- ==========================================

DO $$
DECLARE
  null_count INTEGER;
  invalid_count INTEGER;
BEGIN
  -- Check 1: Are there any NULL system_category values?
  SELECT COUNT(*) INTO null_count
  FROM business_profiles
  WHERE system_category IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % rows with NULL system_category. Fix these before running Phase 2!', null_count;
  END IF;
  
  RAISE NOTICE '✅ All rows have system_category set';
  
  -- Check 2: Are there any invalid system_category values?
  SELECT COUNT(*) INTO invalid_count
  FROM business_profiles
  WHERE system_category NOT IN (
    'restaurant','cafe','bar','dessert','takeaway','salon','barber','tattoo',
    'retail','fitness','sports','hotel','venue','entertainment','professional','other'
  );
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % rows with invalid system_category. Fix these before running Phase 2!', invalid_count;
  END IF;
  
  RAISE NOTICE '✅ All system_category values are valid';
END $$;

-- ==========================================
-- ADD CHECK CONSTRAINT (WITH NOT VALID FOR SAFETY)
-- ==========================================
-- Using NOT VALID + VALIDATE reduces (but doesn't eliminate) locking
-- This is safer than validating at constraint creation time

ALTER TABLE business_profiles
DROP CONSTRAINT IF EXISTS business_profiles_system_category_check;

-- Add constraint without validating existing rows first (faster, lighter lock)
ALTER TABLE business_profiles
ADD CONSTRAINT business_profiles_system_category_check
CHECK (system_category IN (
  'restaurant',
  'cafe',
  'bar',
  'dessert',
  'takeaway',
  'salon',
  'barber',
  'tattoo',
  'retail',
  'fitness',
  'sports',
  'hotel',
  'venue',
  'entertainment',
  'professional',
  'other'
)) NOT VALID;

-- Now validate the constraint (can happen concurrently without blocking writes)
ALTER TABLE business_profiles
VALIDATE CONSTRAINT business_profiles_system_category_check;

-- ==========================================
-- MAKE system_category NOT NULL
-- ==========================================

ALTER TABLE business_profiles
ALTER COLUMN system_category SET NOT NULL;

-- ==========================================
-- OPTIONAL: DROP OLD business_category COLUMN
-- ==========================================
-- ONLY uncomment this if:
-- 1. You're 100% sure all code has been updated
-- 2. You've tested thoroughly
-- 3. You have a backup

-- ALTER TABLE business_profiles
-- DROP COLUMN IF EXISTS business_category;

-- ==========================================
-- CLEANUP OLD CONSTRAINTS
-- ==========================================

-- Remove old CHECK constraints that might still be hanging around
ALTER TABLE business_profiles
DROP CONSTRAINT IF EXISTS profiles_business_category_check;

ALTER TABLE business_profiles
DROP CONSTRAINT IF EXISTS business_profiles_business_category_check;

-- ==========================================
-- FINAL VERIFICATION
-- ==========================================

-- Show column details
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'business_profiles'
  AND column_name IN ('system_category', 'display_category', 'google_types', 'business_category')
ORDER BY column_name;

-- Show final distribution
SELECT 
  system_category,
  COUNT(*) as count
FROM business_profiles
GROUP BY system_category
ORDER BY count DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Phase 2 complete! Category system is now fully locked down.';
  RAISE NOTICE '   - system_category: NOT NULL + CHECK constraint';
  RAISE NOTICE '   - display_category: Free-form label';
  RAISE NOTICE '   - google_types: Array of raw Google types';
END $$;

