-- ============================================================================
-- VERIFY: business_offers_chat_eligible view filters expired offers correctly
-- ============================================================================

-- 1. Check current view definition
SELECT view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'business_offers_chat_eligible';

-- 2. Count total offers in base table
SELECT 
  'Total offers in base table' as metric,
  COUNT(*) as count
FROM business_offers;

-- 3. Count offers by status in base table
SELECT 
  'By status in base table' as metric,
  status,
  COUNT(*) as count
FROM business_offers
GROUP BY status;

-- 4. Count expired vs active offers in base table
SELECT 
  CASE
    WHEN offer_end_date IS NULL THEN 'No expiry'
    WHEN offer_end_date < CURRENT_DATE THEN 'EXPIRED'
    ELSE 'Active'
  END as expiry_status,
  COUNT(*) as count
FROM business_offers
WHERE status = 'approved'
GROUP BY 
  CASE
    WHEN offer_end_date IS NULL THEN 'No expiry'
    WHEN offer_end_date < CURRENT_DATE THEN 'EXPIRED'
    ELSE 'Active'
  END;

-- 5. Check what's in the view
SELECT 
  'Total in chat_eligible view' as metric,
  COUNT(*) as count
FROM business_offers_chat_eligible;

-- 6. Check if expired offers are in the view (SHOULD BE ZERO!)
SELECT 
  'EXPIRED offers in view' as metric,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '❌ LEAKING!'
    ELSE '✅ CORRECT'
  END as status
FROM business_offers_chat_eligible
WHERE offer_end_date < CURRENT_DATE;

-- 7. Show ALL offers in the view with expiry info
SELECT 
  offer_name,
  business_id,
  offer_start_date,
  offer_end_date,
  CASE
    WHEN offer_end_date IS NULL THEN '⚠️ No expiry set'
    WHEN offer_end_date < CURRENT_DATE THEN '❌ EXPIRED'
    ELSE '✅ Active'
  END as status,
  CASE
    WHEN offer_end_date < CURRENT_DATE 
    THEN CURRENT_DATE - offer_end_date 
    ELSE NULL
  END as days_expired
FROM business_offers_chat_eligible
ORDER BY offer_end_date;

-- ============================================================================
-- Expected Results:
-- - View should filter by: offer_end_date >= CURRENT_DATE (or IS NULL)
-- - "EXPIRED offers in view" count should be 0
-- - If expired offers show in view, the view definition is WRONG
-- ============================================================================
