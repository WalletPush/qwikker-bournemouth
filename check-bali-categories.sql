-- Check Bali business categories and AI eligibility details
SELECT 
  business_name,
  city,
  status,
  system_category,
  display_category,
  business_type,
  admin_chat_fallback_approved,
  latitude,
  longitude,
  business_description,
  CASE 
    WHEN menu_preview IS NOT NULL THEN jsonb_array_length(menu_preview)
    ELSE 0
  END as menu_items_count
FROM business_profiles
WHERE city = 'bali'
ORDER BY business_name;
