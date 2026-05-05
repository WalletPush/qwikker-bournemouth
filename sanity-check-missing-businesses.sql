-- WHY are Bellaggio and El Murrino missing from the AI?
-- Check their admin_chat_fallback_approved flag

SELECT 
  business_name,
  display_category,
  status,
  admin_chat_fallback_approved,
  latitude,
  longitude,
  city
FROM business_profiles
WHERE city = 'bournemouth'
  AND status = 'unclaimed'
  AND latitude IS NOT NULL
ORDER BY admin_chat_fallback_approved DESC NULLS LAST, business_name;

-- Quick fix: Approve ALL unclaimed Bournemouth businesses with valid coords for AI fallback
-- UNCOMMENT AND RUN THIS TO FIX:
-- UPDATE business_profiles
-- SET admin_chat_fallback_approved = true
-- WHERE city = 'bournemouth'
--   AND status = 'unclaimed'
--   AND latitude IS NOT NULL
--   AND longitude IS NOT NULL
--   AND admin_chat_fallback_approved IS NOT TRUE;
