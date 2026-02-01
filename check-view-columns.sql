-- Check columns in each view
SELECT 'business_profiles_chat_eligible' as view_name, column_name
FROM information_schema.columns
WHERE table_name = 'business_profiles_chat_eligible'
ORDER BY ordinal_position;

SELECT 'business_profiles_lite_eligible' as view_name, column_name
FROM information_schema.columns
WHERE table_name = 'business_profiles_lite_eligible'
ORDER BY ordinal_position;

SELECT 'business_profiles_ai_fallback_pool' as view_name, column_name
FROM information_schema.columns
WHERE table_name = 'business_profiles_ai_fallback_pool'
ORDER BY ordinal_position;
