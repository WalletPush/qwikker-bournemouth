-- ============================================================================
-- PRODUCTION DATABASE SNAPSHOT
-- Run this in your Supabase SQL editor to see ACTUAL production state
-- ============================================================================

-- 1. List ALL tables that actually exist
SELECT 
  'TABLE' as type,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Business Profiles: What columns ACTUALLY exist?
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'business_profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. What RLS policies are ACTUALLY active?
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('business_profiles', 'app_users', 'business_offers', 'claim_requests')
ORDER BY tablename, policyname;

-- 4. What indexes actually exist?
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('business_profiles', 'business_offers', 'claim_requests', 'app_users')
ORDER BY tablename, indexname;

-- 5. Which migrations have ACTUALLY been run?
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 50;

-- 6. Quick data check - what cities actually have data?
SELECT 
  city,
  COUNT(*) as business_count,
  COUNT(DISTINCT status) as status_types,
  COUNT(DISTINCT CASE WHEN owner_user_id IS NOT NULL THEN 1 END) as claimed_count,
  COUNT(DISTINCT CASE WHEN owner_user_id IS NULL THEN 1 END) as unclaimed_count
FROM business_profiles
GROUP BY city
ORDER BY business_count DESC;

-- 7. Check claim_requests table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'claim_requests'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Check franchise_crm_configs (only columns that exist)
SELECT 
  city,
  CASE WHEN google_places_api_key IS NOT NULL THEN '✅ Set' ELSE '❌ Missing' END as api_key,
  country_code,
  currency_code,
  status
FROM franchise_crm_configs
ORDER BY city;

-- 8b. Check if lat/lng columns exist in franchise_crm_configs
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'franchise_crm_configs'
  AND table_schema = 'public'
  AND column_name IN ('latitude', 'longitude', 'lat', 'lng', 'google_places_api_key', 'country_code', 'country_name')
ORDER BY column_name;

-- 8c. Check if lat/lng columns exist in business_profiles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'business_profiles'
  AND table_schema = 'public'
  AND column_name IN ('latitude', 'longitude', 'lat', 'lng')
ORDER BY column_name;

-- 9. Check if app.current_city is ever set (for RLS)
-- This shows if the RLS city context is actually being used
SELECT 
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%app.current_city%' THEN '⚠️ Relies on app.current_city'
    WHEN qual LIKE '%user_id%' THEN '✅ Uses user_id filter'
    WHEN qual LIKE '%service_role%' THEN '✅ Service role bypass'
    ELSE 'Unknown'
  END as security_method
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'business_profiles';

-- 10. Summary: What's actually protecting business_profiles?
SELECT 
  policyname,
  cmd as applies_to,
  CASE 
    WHEN qual LIKE '%user_id%' THEN '✅ PRIMARY: user_id filter'
    WHEN qual LIKE '%service_role%' THEN '✅ ADMIN: service role'
    WHEN qual LIKE '%app.current_city%' THEN '⚠️ SECONDARY: city context (may default to bournemouth)'
    ELSE '❓ Unknown'
  END as protection_layer
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'business_profiles'
ORDER BY policyname;

