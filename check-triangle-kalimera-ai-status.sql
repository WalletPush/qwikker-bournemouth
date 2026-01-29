-- Check AI Eligible status for Triangle GYROSS and Kalimera Bournemouth
SELECT 
  business_name,
  city,
  status,
  admin_chat_fallback_approved,
  auto_imported,
  updated_at
FROM business_profiles
WHERE 
  city = 'bournemouth'
  AND (
    business_name ILIKE '%triangle%gyross%' 
    OR business_name ILIKE '%kalimera%'
  )
ORDER BY business_name;
