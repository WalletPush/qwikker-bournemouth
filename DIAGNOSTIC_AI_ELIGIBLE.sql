-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETE DIAGNOSTIC: AI Eligible Businesses
-- Run ALL of these queries in order to see the full picture
-- ═══════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- QUERY 1: Check what columns actually exist in business_profiles
-- ══════════════════════════════════════════════════════════════════════════
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'business_profiles'
  AND column_name IN (
    'business_name', 'name', 'city', 'status', 'auto_imported', 
    'admin_chat_fallback_approved', 'business_tier', 'latitude', 'longitude'
  )
ORDER BY column_name;

-- ══════════════════════════════════════════════════════════════════════════
-- QUERY 2: Check how many unclaimed imported businesses exist in Bournemouth
-- ══════════════════════════════════════════════════════════════════════════
SELECT COUNT(*) AS total_unclaimed_imported
FROM business_profiles
WHERE city = 'bournemouth'
  AND status = 'unclaimed'
  AND auto_imported = true;

-- ══════════════════════════════════════════════════════════════════════════
-- QUERY 3: Check how many have admin_chat_fallback_approved = TRUE
-- ══════════════════════════════════════════════════════════════════════════
SELECT COUNT(*) AS ai_eligible_count
FROM business_profiles
WHERE city = 'bournemouth'
  AND status = 'unclaimed'
  AND auto_imported = true
  AND admin_chat_fallback_approved = true;

-- ══════════════════════════════════════════════════════════════════════════
-- QUERY 4: Show the actual AI-eligible businesses (the 2 you enabled)
-- ══════════════════════════════════════════════════════════════════════════
SELECT 
  business_name,
  city,
  status,
  auto_imported,
  admin_chat_fallback_approved,
  business_tier,
  google_primary_type,
  CASE 
    WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 'YES'
    ELSE 'NO'
  END AS has_coordinates
FROM business_profiles
WHERE city = 'bournemouth'
  AND status = 'unclaimed'
  AND auto_imported = true
  AND admin_chat_fallback_approved = true
ORDER BY business_name;

-- ══════════════════════════════════════════════════════════════════════════
-- QUERY 5: Check if the three-tier views exist
-- ══════════════════════════════════════════════════════════════════════════
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'business_profiles_ai_eligible',
    'business_profiles_lite_eligible', 
    'business_profiles_ai_fallback_pool'
  )
ORDER BY table_name;

-- ══════════════════════════════════════════════════════════════════════════
-- EXPECTED RESULTS:
-- Query 1: Should show all the column names and types
-- Query 2: Should show total unclaimed imported businesses (maybe 13 or so)
-- Query 3: Should show 2 (Triangle GYROSS + Kalimera Bournemouth)
-- Query 4: Should list the 2 businesses with their details
-- Query 5: Should show which views exist (probably MISSING all 3)
-- ══════════════════════════════════════════════════════════════════════════
