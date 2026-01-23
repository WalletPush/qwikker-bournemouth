-- ============================================================================
-- TEST CITY ISOLATION FOR OFFERS
-- Purpose: Prove whether city isolation exists or not
-- ============================================================================

-- STEP 1: Create a test offer for a business in a DIFFERENT city
-- (We'll use a real business from your DB but in a different city)

-- First, check what cities exist and pick one that's NOT bournemouth
SELECT DISTINCT city, COUNT(*) as business_count
FROM business_profiles
WHERE city IS NOT NULL
GROUP BY city
ORDER BY city;

-- ============================================================================

-- STEP 2: Insert a TEST offer for a business in another city
-- (Replace 'OTHER_CITY' with an actual city from step 1)
-- (Replace 'BUSINESS_ID_FROM_OTHER_CITY' with an actual business ID)

-- Example:
-- INSERT INTO business_offers (
--   business_id,
--   offer_name,
--   offer_type,
--   offer_value,
--   status,
--   offer_start_date,
--   offer_end_date
-- )
-- SELECT 
--   id,
--   'TEST OFFER - DELETE ME',
--   'discount',
--   '50% OFF TEST',
--   'approved',
--   CURRENT_DATE,
--   CURRENT_DATE + INTERVAL '30 days'
-- FROM business_profiles
-- WHERE city = 'calgary' -- Change to whatever city exists
-- LIMIT 1;

-- ============================================================================

-- STEP 3: Check if the test offer appears in business_offers_chat_eligible
SELECT 
  bo.id,
  bo.offer_name,
  bo.business_id,
  bp.business_name,
  bp.city,
  bo.status,
  bo.offer_end_date
FROM business_offers_chat_eligible bo
INNER JOIN business_profiles bp ON bp.id = bo.business_id
ORDER BY bp.city, bo.offer_name;

-- If you see the test offer, city isolation is BROKEN ❌
-- If you only see Bournemouth offers, it might be working ✅ (but we need to verify HOW)

-- ============================================================================

-- STEP 4: Check how the chat code filters offers
-- Does it add a city filter in the query?

-- Check the actual query the chat would run:
SELECT 
  bo.*,
  bp.city
FROM business_offers_chat_eligible bo
INNER JOIN business_profiles bp ON bp.id = bo.business_id
WHERE bp.city = 'bournemouth';  -- This is what the chat SHOULD do

-- ============================================================================

-- CLEANUP: Delete the test offer after testing
-- DELETE FROM business_offers 
-- WHERE offer_name = 'TEST OFFER - DELETE ME';
