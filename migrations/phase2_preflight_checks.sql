-- ==========================================
-- PRE-PHASE-2 SANITY CHECKS
-- ==========================================
-- Run these checks in production BEFORE deploying Phase 2
-- Both queries should return 0 rows (or nulls = 0)

-- Check 1: Are there any NULL system_category values?
SELECT COUNT(*) as nulls
FROM business_profiles
WHERE system_category IS NULL;

-- Expected result: nulls = 0
-- If nulls > 0: Find and fix those rows before Phase 2!

-- Check 2: Are there any INVALID system_category values?
SELECT 
  system_category, 
  COUNT(*) as invalid_count,
  array_agg(business_name) as affected_businesses
FROM business_profiles
WHERE system_category NOT IN (
  'restaurant','cafe','bar','dessert','takeaway','salon','barber','tattoo',
  'retail','fitness','sports','hotel','venue','entertainment','professional','other'
)
GROUP BY system_category;

-- Expected result: 0 rows returned
-- If any rows returned: Fix those categories before Phase 2!

-- Check 3: Distribution check (informational)
SELECT 
  system_category,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM business_profiles
GROUP BY system_category
ORDER BY count DESC;

-- This shows your category distribution
-- Verify it looks reasonable before locking down

-- ==========================================
-- IF ALL CHECKS PASS: Safe to run Phase 2!
-- ==========================================
-- Next: Run migrations/002_lock_system_category.sql

