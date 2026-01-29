-- ═══════════════════════════════════════════════════════════════════
-- Check which businesses are AI-eligible (Tier 3 Fallback Pool)
-- ═══════════════════════════════════════════════════════════════════

-- Query the BASE TABLE directly (no view needed)
SELECT 
  business_name,
  city,
  status,
  auto_imported,
  admin_chat_fallback_approved,
  business_tier,
  google_primary_type,
  latitude,
  longitude,
  rating,
  review_count
FROM business_profiles
WHERE city = 'bournemouth'
  AND status = 'unclaimed'
  AND auto_imported = true
  AND admin_chat_fallback_approved = true
  AND business_tier = 'free_tier'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
ORDER BY business_name;
