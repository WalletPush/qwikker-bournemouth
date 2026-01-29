-- Fix business_profiles_ai_eligible to include BOTH paid AND admin-approved unclaimed
-- This ensures "AI Eligible" unclaimed businesses show in search results, not just fallback

CREATE OR REPLACE VIEW public.business_profiles_ai_eligible AS
-- Tier 1: Paid/Trial businesses (existing logic)
SELECT 
  id,
  business_name,
  display_category,
  google_primary_type,
  business_town,
  business_address,
  phone,
  website_url,
  google_place_id,
  latitude,
  longitude,
  rating,
  review_count,
  city,
  business_hours,
  business_hours_structured,
  status,
  business_tier,
  'paid_trial' as source_tier
FROM business_profiles_chat_eligible

UNION ALL

-- Tier 3: Admin-approved unclaimed businesses
SELECT 
  id,
  business_name,
  display_category,
  google_primary_type,
  business_town,
  business_address,
  phone,
  website_url,
  google_place_id,
  latitude,
  longitude,
  rating,
  review_count,
  city,
  business_hours,
  business_hours_structured,
  status,
  business_tier,
  'admin_approved_unclaimed' as source_tier
FROM business_profiles_ai_fallback_pool;

COMMENT ON VIEW business_profiles_ai_eligible IS
  'Combined view of ALL businesses eligible for AI chat: Paid/Trial (Tier 1) + Admin-approved unclaimed (Tier 3). Used by KB dropdown and AI search. Tier 2 (Lite) excluded because they have no KB content.';

-- Verify it worked
SELECT 
  source_tier,
  COUNT(*) as count,
  string_agg(business_name, ', ' ORDER BY business_name) as businesses
FROM business_profiles_ai_eligible
WHERE city = 'bournemouth'
GROUP BY source_tier;
