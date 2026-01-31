-- Check what columns business_profiles_ai_fallback_pool actually has
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'business_profiles_ai_fallback_pool'
  AND table_schema = 'public'
ORDER BY ordinal_position;
