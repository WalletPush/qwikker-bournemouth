-- ============================================================================
-- CHECK CITY ISOLATION FOR OFFERS
-- Purpose: Verify if offers are properly filtered by city
-- ============================================================================

-- 1. Check if business_offers_chat_eligible view has city info
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'business_offers_chat_eligible'
  AND column_name LIKE '%city%'
ORDER BY column_name;

-- ============================================================================

-- 2. Join offers to business profiles to see city distribution
SELECT 
  bp.city,
  COUNT(*) as total_offers,
  COUNT(CASE WHEN bo.status = 'approved' THEN 1 END) as approved_offers,
  COUNT(CASE WHEN bo.offer_end_date < CURRENT_DATE THEN 1 END) as expired_offers,
  COUNT(CASE WHEN bo.offer_end_date >= CURRENT_DATE OR bo.offer_end_date IS NULL THEN 1 END) as active_offers
FROM business_offers bo
INNER JOIN business_profiles bp ON bp.id = bo.business_id
GROUP BY bp.city
ORDER BY bp.city;

-- ============================================================================

-- 3. Check what the view definition actually is
SELECT view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'business_offers_chat_eligible';

-- ============================================================================

-- 4. Sample: Show which cities have offers in the view
SELECT 
  bp.city,
  bo.offer_name,
  bo.offer_end_date,
  bo.status,
  CASE 
    WHEN bo.offer_end_date < CURRENT_DATE THEN 'EXPIRED'
    WHEN bo.offer_end_date >= CURRENT_DATE THEN 'ACTIVE'
    ELSE 'NO_END_DATE'
  END as offer_status
FROM business_offers_chat_eligible bo
INNER JOIN business_profiles bp ON bp.id = bo.business_id
ORDER BY bp.city, bo.offer_end_date DESC
LIMIT 20;
