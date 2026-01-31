-- DEBUG: Check Bali AI Eligible Businesses
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check if businesses exist and their AI eligible status
SELECT 
  id,
  business_name,
  city,
  status,
  admin_chat_fallback_approved,
  system_category,
  created_at
FROM business_profiles
WHERE city ILIKE '%bali%'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if they're in the AI eligible views
SELECT 
  'ai_eligible' as view_name,
  COUNT(*) as count
FROM business_profiles_ai_eligible
WHERE city ILIKE '%bali%'

UNION ALL

SELECT 
  'ai_fallback_pool' as view_name,
  COUNT(*) as count
FROM business_profiles_ai_fallback_pool
WHERE city ILIKE '%bali%'

UNION ALL

SELECT 
  'lite_eligible' as view_name,
  COUNT(*) as count
FROM business_profiles_lite_eligible
WHERE city ILIKE '%bali%';

-- 3. Show the actual businesses in each tier
SELECT 
  'Tier 1 (Paid/Trial)' as tier,
  business_name,
  city
FROM business_profiles_ai_eligible
WHERE city ILIKE '%bali%'

UNION ALL

SELECT 
  'Tier 2 (Claimed Free)' as tier,
  business_name,
  city
FROM business_profiles_lite_eligible
WHERE city ILIKE '%bali%'

UNION ALL

SELECT 
  'Tier 3 (Unclaimed)' as tier,
  business_name,
  city
FROM business_profiles_ai_fallback_pool
WHERE city ILIKE '%bali%'
ORDER BY tier, business_name;
