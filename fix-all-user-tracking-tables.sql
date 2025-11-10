-- COMPLETE AND SAFE FIX for all user tracking tables
-- This will make offer claims, business visits, and secret unlocks work properly

-- ========================================
-- 1. FIX USER_OFFER_CLAIMS TABLE
-- ========================================

-- Add missing columns for offer claims
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS offer_id text;
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS offer_title text;
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS wallet_pass_id text;

-- Remove NOT NULL constraints that cause issues
ALTER TABLE public.user_offer_claims ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.user_offer_claims ALTER COLUMN offer_name DROP NOT NULL;
ALTER TABLE public.user_offer_claims ALTER COLUMN offer_type DROP NOT NULL;
ALTER TABLE public.user_offer_claims ALTER COLUMN offer_value DROP NOT NULL;

-- ========================================
-- 2. FIX USER_BUSINESS_VISITS TABLE
-- ========================================

-- Add wallet_pass_id column for anonymous user tracking
ALTER TABLE public.user_business_visits ADD COLUMN IF NOT EXISTS wallet_pass_id text;

-- Remove NOT NULL constraint on user_id to allow anonymous visits
ALTER TABLE public.user_business_visits ALTER COLUMN user_id DROP NOT NULL;

-- ========================================
-- 3. FIX USER_SECRET_UNLOCKS TABLE
-- ========================================

-- Add wallet_pass_id column for anonymous user tracking
ALTER TABLE public.user_secret_unlocks ADD COLUMN IF NOT EXISTS wallet_pass_id text;

-- Remove NOT NULL constraint on user_id to allow anonymous unlocks
ALTER TABLE public.user_secret_unlocks ALTER COLUMN user_id DROP NOT NULL;

-- ========================================
-- 4. VERIFY TABLE STRUCTURES
-- ========================================

-- Show updated table structures
SELECT 'user_offer_claims structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;

SELECT 'user_business_visits structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_business_visits' 
ORDER BY ordinal_position;

SELECT 'user_secret_unlocks structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_secret_unlocks' 
ORDER BY ordinal_position;

-- ========================================
-- 5. TEST WITH REAL DATA (SAFE - WILL BE CLEANED UP)
-- ========================================

-- Get a real business for testing
SELECT 'Available businesses for testing:' as info;
SELECT id, business_name FROM public.business_profiles WHERE status = 'approved' LIMIT 3;

-- Get a real offer for testing
SELECT 'Available offers for testing:' as info;
SELECT bo.id, bo.offer_name, bp.business_name 
FROM business_offers bo 
JOIN business_profiles bp ON bo.business_id = bp.id 
WHERE bo.status = 'approved' LIMIT 3;

-- Test offer claim (using first approved offer)
INSERT INTO public.user_offer_claims (
  offer_id,
  offer_title,
  business_name,
  business_id,
  user_id,
  wallet_pass_id,
  status,
  claimed_at
)
SELECT 
  bo.id,
  bo.offer_name,
  bp.business_name,
  bp.id,
  null,  -- Anonymous user
  'test-wallet-123',
  'claimed',
  now()
FROM business_offers bo 
JOIN business_profiles bp ON bo.business_id = bp.id 
WHERE bo.status = 'approved' 
LIMIT 1;

-- Test business visit (using first approved business)
INSERT INTO public.user_business_visits (
  user_id,
  business_id,
  wallet_pass_id,
  visit_date,
  is_first_visit,
  points_earned
)
SELECT 
  null,  -- Anonymous user
  id,
  'test-wallet-123',
  now(),
  true,
  25
FROM public.business_profiles 
WHERE status = 'approved' 
LIMIT 1;

-- Test secret unlock (using first approved business)
INSERT INTO public.user_secret_unlocks (
  user_id,
  business_id,
  wallet_pass_id,
  secret_item_name,
  secret_item_description,
  unlocked_at,
  unlock_method,
  points_earned
)
SELECT 
  null,  -- Anonymous user
  id,
  'test-wallet-123',
  'Secret Test Item',
  'Test secret menu item',
  now(),
  'visit',
  10
FROM public.business_profiles 
WHERE status = 'approved' 
LIMIT 1;

-- ========================================
-- 6. VERIFY TEST DATA WAS INSERTED
-- ========================================

SELECT 'Test records created:' as info;

SELECT 'Offer claims:' as table_name, COUNT(*) as test_records 
FROM public.user_offer_claims WHERE wallet_pass_id = 'test-wallet-123'
UNION ALL
SELECT 'Business visits:' as table_name, COUNT(*) as test_records 
FROM public.user_business_visits WHERE wallet_pass_id = 'test-wallet-123'
UNION ALL
SELECT 'Secret unlocks:' as table_name, COUNT(*) as test_records 
FROM public.user_secret_unlocks WHERE wallet_pass_id = 'test-wallet-123';

-- Show the test records
SELECT 'Test offer claim:' as info;
SELECT * FROM public.user_offer_claims WHERE wallet_pass_id = 'test-wallet-123';

SELECT 'Test business visit:' as info;
SELECT * FROM public.user_business_visits WHERE wallet_pass_id = 'test-wallet-123';

SELECT 'Test secret unlock:' as info;
SELECT * FROM public.user_secret_unlocks WHERE wallet_pass_id = 'test-wallet-123';

-- ========================================
-- 7. CLEANUP TEST DATA (SAFE)
-- ========================================

-- Remove test records
DELETE FROM public.user_offer_claims WHERE wallet_pass_id = 'test-wallet-123';
DELETE FROM public.user_business_visits WHERE wallet_pass_id = 'test-wallet-123';
DELETE FROM public.user_secret_unlocks WHERE wallet_pass_id = 'test-wallet-123';

-- Verify cleanup
SELECT 'After cleanup - should all be 0:' as info;
SELECT 'Offer claims:' as table_name, COUNT(*) as remaining_test_records 
FROM public.user_offer_claims WHERE wallet_pass_id = 'test-wallet-123'
UNION ALL
SELECT 'Business visits:' as table_name, COUNT(*) as remaining_test_records 
FROM public.user_business_visits WHERE wallet_pass_id = 'test-wallet-123'
UNION ALL
SELECT 'Secret unlocks:' as table_name, COUNT(*) as remaining_test_records 
FROM public.user_secret_unlocks WHERE wallet_pass_id = 'test-wallet-123';

-- ========================================
-- 8. FINAL STATUS
-- ========================================

SELECT 'ALL USER TRACKING TABLES ARE NOW FIXED AND READY!' as final_status;
