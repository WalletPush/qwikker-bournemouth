-- Check what business_offers_chat_eligible view actually does
SELECT 
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'business_offers_chat_eligible';

-- ============================================================================

-- Check if expired offers are leaking through
SELECT 
  COUNT(*) as total_offers,
  COUNT(CASE WHEN offer_end_date < CURRENT_DATE THEN 1 END) as expired_offers
FROM business_offers_chat_eligible
WHERE offer_end_date IS NOT NULL;

-- ============================================================================

-- Show sample expired offers in the view
SELECT 
  offer_name,
  business_id,
  offer_end_date,
  status,
  CURRENT_DATE as today,
  (CURRENT_DATE - offer_end_date) as days_expired
FROM business_offers_chat_eligible
WHERE offer_end_date < CURRENT_DATE
ORDER BY offer_end_date DESC
LIMIT 10;

-- ============================================================================

-- Check what columns are actually in the view
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'business_offers_chat_eligible'
ORDER BY ordinal_position;
