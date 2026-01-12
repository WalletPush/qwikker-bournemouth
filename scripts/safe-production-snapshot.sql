-- ============================================================================
-- SAFE PRODUCTION DATABASE SNAPSHOT
-- This version checks what exists BEFORE querying it
-- ============================================================================

-- 1. List ALL tables that actually exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Business Profiles: What columns ACTUALLY exist?
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  CASE 
    WHEN column_name IN ('latitude', 'longitude', 'lat', 'lng') THEN '📍 Location'
    WHEN column_name IN ('city', 'country', 'country_code') THEN '🌍 Geography'
    WHEN column_name IN ('status', 'owner_user_id', 'visibility') THEN '🔐 Claim/Status'
    WHEN column_name IN ('system_category', 'display_category', 'business_category') THEN '📂 Category'
    WHEN column_name IN ('google_place_id', 'auto_imported') THEN '🔗 Import'
    ELSE '📋 Other'
  END as category
FROM information_schema.columns
WHERE table_name = 'business_profiles'
  AND table_schema = 'public'
ORDER BY 
  CASE 
    WHEN column_name = 'id' THEN 1
    WHEN column_name = 'business_name' THEN 2
    WHEN column_name IN ('latitude', 'longitude', 'lat', 'lng') THEN 3
    WHEN column_name IN ('city', 'country', 'country_code') THEN 4
    ELSE 5
  END,
  column_name;

-- 3. Claim Requests: What columns exist?
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'claim_requests'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Franchise CRM Configs: What columns exist?
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'franchise_crm_configs'
  AND table_schema = 'public'
ORDER BY 
  CASE 
    WHEN column_name = 'city' THEN 1
    WHEN column_name IN ('latitude', 'longitude') THEN 2
    WHEN column_name IN ('country_code', 'country_name') THEN 3
    WHEN column_name LIKE '%api%' THEN 4
    ELSE 5
  END,
  column_name;

-- 5. Quick data check - what cities actually have data?
SELECT 
  city,
  COUNT(*) as total_businesses,
  COUNT(CASE WHEN status = 'unclaimed' THEN 1 END) as unclaimed,
  COUNT(CASE WHEN owner_user_id IS NOT NULL THEN 1 END) as claimed,
  COUNT(CASE WHEN status LIKE '%free%' THEN 1 END) as free_tier,
  MAX(created_at) as most_recent
FROM business_profiles
GROUP BY city
ORDER BY total_businesses DESC;

-- 6. RLS Policies on business_profiles
SELECT 
  policyname,
  cmd as applies_to,
  CASE 
    WHEN qual LIKE '%user_id%' THEN '✅ user_id filter'
    WHEN qual LIKE '%service_role%' THEN '✅ service_role'
    WHEN qual LIKE '%app.current_city%' THEN '⚠️ city context'
    ELSE '❓ other'
  END as protection
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'business_profiles'
ORDER BY policyname;

-- 7. Which migrations have actually been run? (last 20)
SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

-- 8. Check category columns (our recent migration)
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN system_category IS NOT NULL THEN 1 END) as has_system_category,
  COUNT(CASE WHEN display_category IS NOT NULL THEN 1 END) as has_display_category,
  COUNT(CASE WHEN business_category IS NOT NULL THEN 1 END) as has_business_category,
  COUNT(DISTINCT system_category) as unique_system_cats,
  COUNT(DISTINCT display_category) as unique_display_cats
FROM business_profiles;

-- 9. Sample of actual business data (5 rows)
SELECT 
  id,
  business_name,
  city,
  status,
  CASE WHEN owner_user_id IS NOT NULL THEN '✅ Claimed' ELSE '❌ Unclaimed' END as ownership
FROM business_profiles
ORDER BY created_at DESC
LIMIT 5;

-- 10. Summary: What's the current state?
SELECT 
  '🏢 Total Businesses' as metric,
  COUNT(*)::text as value
FROM business_profiles
UNION ALL
SELECT 
  '📍 Cities with data' as metric,
  COUNT(DISTINCT city)::text as value
FROM business_profiles
UNION ALL
SELECT 
  '✅ Claimed businesses' as metric,
  COUNT(CASE WHEN owner_user_id IS NOT NULL THEN 1 END)::text as value
FROM business_profiles
UNION ALL
SELECT 
  '❌ Unclaimed businesses' as metric,
  COUNT(CASE WHEN owner_user_id IS NULL THEN 1 END)::text as value
FROM business_profiles
UNION ALL
SELECT 
  '📋 Claim requests' as metric,
  COUNT(*)::text as value
FROM claim_requests
UNION ALL
SELECT 
  '🌍 Franchise configs' as metric,
  COUNT(*)::text as value
FROM franchise_crm_configs;

