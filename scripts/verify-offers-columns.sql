-- ============================================================================
-- VERIFY BUSINESS_OFFERS TABLE COLUMNS
-- Purpose: Check what date columns actually exist in business_offers table
-- ============================================================================

-- 1. Show ALL columns in business_offers table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'business_offers'
ORDER BY ordinal_position;

-- ============================================================================

-- 2. Specifically check for date-related columns
SELECT column_name
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'business_offers'
  AND (column_name LIKE '%date%' OR column_name LIKE '%valid%')
ORDER BY column_name;

-- ============================================================================

-- 3. Check what the business_offers_chat_eligible view is actually selecting
SELECT 
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'business_offers_chat_eligible';

-- ============================================================================

-- 4. Sample: Check if any expired offers are leaking through
SELECT 
  id,
  offer_name,
  offer_start_date,
  offer_end_date,
  status,
  CASE
    WHEN offer_end_date IS NOT NULL AND offer_end_date < CURRENT_DATE THEN 'EXPIRED'
    WHEN offer_start_date IS NOT NULL AND offer_start_date > CURRENT_DATE THEN 'FUTURE'
    ELSE 'ACTIVE'
  END as computed_status
FROM business_offers
WHERE status = 'approved'
ORDER BY offer_end_date DESC NULLS LAST
LIMIT 10;

-- ============================================================================

-- 5. Check if expired offers appear in business_offers_chat_eligible view
SELECT 
  offer_name,
  business_name,
  offer_end_date,
  CASE
    WHEN offer_end_date IS NOT NULL AND offer_end_date < CURRENT_DATE THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END as status_check
FROM business_offers_chat_eligible
WHERE offer_end_date IS NOT NULL 
  AND offer_end_date < CURRENT_DATE
LIMIT 10;
