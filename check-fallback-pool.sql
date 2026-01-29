-- ═══════════════════════════════════════════════════════════════════
-- DIAGNOSTIC SCRIPT: Check AI Fallback Pool Setup
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: Check if the view exists
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.views 
  WHERE table_schema = 'public' 
    AND table_name = 'business_profiles_ai_fallback_pool'
) AS view_exists;

-- STEP 2: Check base table columns
SELECT 
  business_name,
  city,
  status,
  auto_imported,
  admin_chat_fallback_approved,
  latitude,
  longitude,
  business_tier,
  google_primary_type
FROM business_profiles
WHERE city = 'bournemouth'
  AND status = 'unclaimed'
  AND auto_imported = true
  AND admin_chat_fallback_approved = true
ORDER BY business_name;

-- STEP 3: Count how many businesses are eligible
SELECT COUNT(*) AS eligible_count
FROM business_profiles
WHERE city = 'bournemouth'
  AND status = 'unclaimed'
  AND auto_imported = true
  AND admin_chat_fallback_approved = true;

-- STEP 4: If view exists, query it
-- (Run this ONLY if STEP 1 returned TRUE)
-- SELECT *
-- FROM business_profiles_ai_fallback_pool
-- WHERE city = 'bournemouth'
-- LIMIT 10;
