-- ============================================================================
-- SANITY CHECK: Why aren't businesses showing in fallback pool?
-- ============================================================================

-- Step 1: Check ALL businesses with admin_chat_fallback_approved = true
SELECT 
  business_name,
  city,
  status,
  business_tier,
  auto_imported,
  admin_chat_fallback_approved,
  latitude IS NOT NULL as has_lat,
  longitude IS NOT NULL as has_lng,
  -- Check which condition is failing
  CASE
    WHEN auto_imported IS NOT TRUE THEN '❌ Not auto_imported'
    WHEN status != 'unclaimed' THEN '❌ Status not unclaimed (' || status || ')'
    WHEN business_tier != 'free_tier' THEN '❌ Not free_tier (' || business_tier || ')'
    WHEN admin_chat_fallback_approved IS NOT TRUE THEN '❌ Not approved'
    WHEN latitude IS NULL THEN '❌ Missing latitude'
    WHEN longitude IS NULL THEN '❌ Missing longitude'
    ELSE '✅ Should be in fallback pool'
  END as diagnosis
FROM business_profiles
WHERE admin_chat_fallback_approved = true
ORDER BY city, business_name;

-- Step 2: Show what's ACTUALLY in the fallback pool view
SELECT 
  '=== BUSINESSES IN FALLBACK POOL ===' as section,
  business_name,
  city,
  status,
  rating
FROM business_profiles_ai_fallback_pool
ORDER BY city, business_name;

-- Step 3: Count by city
SELECT 
  city,
  COUNT(*) as approved_count,
  SUM(CASE WHEN auto_imported = true THEN 1 ELSE 0 END) as auto_imported_count,
  SUM(CASE WHEN status = 'unclaimed' THEN 1 ELSE 0 END) as unclaimed_count,
  SUM(CASE WHEN business_tier = 'free_tier' THEN 1 ELSE 0 END) as free_tier_count,
  SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) as has_coords_count
FROM business_profiles
WHERE admin_chat_fallback_approved = true
GROUP BY city
ORDER BY city;
