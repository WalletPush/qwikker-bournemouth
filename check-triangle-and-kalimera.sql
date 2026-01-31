-- Check if both Triangle Gyros and Kalimera are AI eligible and in the fallback pool

-- 1. Check business_profiles for both
SELECT 
  business_name,
  status,
  business_tier,
  admin_chat_fallback_approved,
  system_category,
  display_category,
  google_primary_type
FROM business_profiles
WHERE business_name ILIKE '%triangle%' 
   OR business_name ILIKE '%kalimera%'
ORDER BY business_name;

-- 2. Check if they're in the ai_fallback_pool view
SELECT 
  business_name,
  status,
  business_tier,
  admin_chat_fallback_approved,
  system_category
FROM business_profiles_ai_fallback_pool
WHERE business_name ILIKE '%triangle%' 
   OR business_name ILIKE '%kalimera%'
ORDER BY business_name;

-- 3. Check menu_preview for both (claimed_free needs 5 featured items)
SELECT 
  bp.business_name,
  bp.status,
  bp.business_tier,
  bp.menu_preview,
  jsonb_array_length(bp.menu_preview) as menu_item_count
FROM business_profiles bp
WHERE (bp.business_name ILIKE '%triangle%' OR bp.business_name ILIKE '%kalimera%')
ORDER BY bp.business_name;
