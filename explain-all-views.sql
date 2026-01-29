-- Check ALL business profile views and their definitions
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE viewname LIKE '%business_profile%'
ORDER BY viewname;

-- Check what's IN each view for Bournemouth
SELECT 'business_profiles_ai_eligible' as view_name, COUNT(*) as count, string_agg(business_name, ', ') as businesses
FROM business_profiles_ai_eligible
WHERE city = 'bournemouth'
UNION ALL
SELECT 'business_profiles_chat_eligible' as view_name, COUNT(*) as count, string_agg(business_name, ', ') as businesses
FROM business_profiles_chat_eligible
WHERE city = 'bournemouth'
UNION ALL
SELECT 'business_profiles_ai_fallback_pool' as view_name, COUNT(*) as count, string_agg(business_name, ', ') as businesses
FROM business_profiles_ai_fallback_pool
WHERE city = 'bournemouth'
UNION ALL
SELECT 'business_profiles_lite_eligible' as view_name, COUNT(*) as count, string_agg(business_name, ', ') as businesses
FROM business_profiles_lite_eligible
WHERE city = 'bournemouth';

-- Check if Greek places are AI eligible
SELECT 
  business_name,
  status,
  admin_chat_fallback_approved,
  auto_imported,
  business_tier,
  CASE 
    WHEN id IN (SELECT id FROM business_profiles_ai_eligible WHERE city = 'bournemouth') THEN 'YES - ai_eligible'
    WHEN id IN (SELECT id FROM business_profiles_chat_eligible WHERE city = 'bournemouth') THEN 'YES - chat_eligible'
    WHEN id IN (SELECT id FROM business_profiles_ai_fallback_pool WHERE city = 'bournemouth') THEN 'YES - fallback_pool'
    WHEN id IN (SELECT id FROM business_profiles_lite_eligible WHERE city = 'bournemouth') THEN 'YES - lite_eligible'
    ELSE 'NO - not in any view'
  END as in_which_view
FROM business_profiles
WHERE city = 'bournemouth' 
AND (business_name ILIKE '%greek%' OR business_name ILIKE '%gyross%' OR business_name ILIKE '%kalimera%')
ORDER BY business_name;
