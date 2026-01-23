-- ============================================================================
-- STEP 1: Verify debug function exists
-- ============================================================================

SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'get_current_city';

-- Expected: Should return 1 row with the function definition

-- ============================================================================
-- STEP 2: Test tenant context setting (Bournemouth)
-- ============================================================================

-- Set context to Bournemouth
SELECT set_config('app.current_city', 'bournemouth', true) as context_set;

-- Verify it's set
SELECT public.get_current_city() as current_city;
-- Expected: 'bournemouth'

-- Check what data is visible
SELECT 'Bournemouth Profiles' as label, COUNT(*) as count 
FROM business_profiles;

SELECT 'Bournemouth Offers' as label, COUNT(*) as count 
FROM business_offers_chat_eligible;

SELECT 'Bournemouth Events' as label, COUNT(*) as count 
FROM business_events
WHERE status = 'approved' AND event_date >= CURRENT_DATE;

-- ============================================================================
-- STEP 3: Test tenant context setting (London - should be empty)
-- ============================================================================

-- Set context to London
SELECT set_config('app.current_city', 'london', true) as context_set;

-- Verify it's set
SELECT public.get_current_city() as current_city;
-- Expected: 'london'

-- Check what data is visible (should be ZERO)
SELECT 'London Profiles' as label, COUNT(*) as count 
FROM business_profiles;
-- Expected: 0 (until you add London data)

SELECT 'London Offers' as label, COUNT(*) as count 
FROM business_offers_chat_eligible;
-- Expected: 0

SELECT 'London Events' as label, COUNT(*) as count 
FROM business_events
WHERE status = 'approved' AND event_date >= CURRENT_DATE;
-- Expected: 0

-- ============================================================================
-- STEP 4: Verify offers are not expired
-- ============================================================================

-- Reset to Bournemouth
SELECT set_config('app.current_city', 'bournemouth', true);

-- Check current offers
SELECT 
  offer_name,
  offer_start_date,
  offer_end_date,
  CURRENT_DATE as today,
  CASE 
    WHEN offer_end_date IS NULL THEN 'No expiry'
    WHEN offer_end_date >= CURRENT_DATE THEN 'Active'
    ELSE 'EXPIRED'
  END as status,
  CASE 
    WHEN offer_end_date < CURRENT_DATE 
    THEN CURRENT_DATE - offer_end_date 
    ELSE NULL 
  END as days_expired
FROM business_offers_chat_eligible
ORDER BY offer_end_date DESC NULLS FIRST;

-- Expected: NO offers with status = 'EXPIRED'

-- ============================================================================
-- STEP 5: Verify business_profiles RLS
-- ============================================================================

-- Reset to Bournemouth
SELECT set_config('app.current_city', 'bournemouth', true);

-- Check which businesses are visible
SELECT 
  business_name,
  city,
  status,
  business_tier
FROM business_profiles
ORDER BY business_tier, business_name
LIMIT 10;

-- All should have city = 'bournemouth'
-- All should have status IN ('approved', 'unclaimed', 'claimed_free')

-- ============================================================================
-- STEP 6: Verify offers join correctly
-- ============================================================================

-- Test the exact query used in chat
SELECT 
  bo.id,
  bo.offer_name,
  bo.offer_value,
  bo.business_id,
  bo.offer_end_date,
  bp.business_name,
  bp.city,
  bp.business_tier
FROM business_offers_chat_eligible bo
INNER JOIN business_profiles bp ON bp.id = bo.business_id
WHERE bo.business_id IN (
  SELECT id FROM business_profiles WHERE city = 'bournemouth' LIMIT 3
)
ORDER BY bo.updated_at DESC
LIMIT 5;

-- Expected: 
-- - All offers have offer_end_date >= CURRENT_DATE OR NULL
-- - All business_name/city populated
-- - NO expired offers

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================

-- ✅ get_current_city() function exists
-- ✅ Context switches correctly between cities
-- ✅ Bournemouth shows data, London shows ZERO
-- ✅ NO expired offers in business_offers_chat_eligible
-- ✅ Offers join correctly with business_profiles
-- ✅ All visible businesses are in current city

-- If ALL checks pass → READY to run RLS migration
-- If ANY fail → DO NOT run RLS migration, fix the failing check first
