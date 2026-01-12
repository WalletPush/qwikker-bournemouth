-- ============================================================================
-- CLAIM FLOW VERIFICATION
-- Verify the claim flow is working and what city logic exists
-- ============================================================================

-- 1. Does claim_requests table exist and what's in it?
SELECT 
  COUNT(*) as total_claims,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
  COUNT(CASE WHEN status = 'denied' THEN 1 END) as denied
FROM claim_requests;

-- 2. What columns does claim_requests actually have?
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'claim_requests'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Sample claim data (to see structure)
SELECT 
  id,
  business_id,
  user_id,
  status,
  created_at,
  (SELECT business_name FROM business_profiles WHERE id = claim_requests.business_id) as business_name,
  (SELECT city FROM business_profiles WHERE id = claim_requests.business_id) as business_city
FROM claim_requests
ORDER BY created_at DESC
LIMIT 5;

-- 4. How many unclaimed businesses exist per city?
SELECT 
  city,
  COUNT(*) as unclaimed_count,
  COUNT(CASE WHEN status = 'unclaimed' THEN 1 END) as status_unclaimed,
  COUNT(CASE WHEN owner_user_id IS NULL THEN 1 END) as no_owner
FROM business_profiles
WHERE status = 'unclaimed' OR owner_user_id IS NULL
GROUP BY city
ORDER BY unclaimed_count DESC;

-- 5. Test: Can we search for businesses? (simulates claim search)
SELECT 
  id,
  business_name,
  city,
  status,
  business_address,
  rating,
  review_count
FROM business_profiles
WHERE status = 'unclaimed'
  AND city = 'bournemouth'
  AND business_name ILIKE '%coffee%'
LIMIT 5;

-- 6. What's the relationship between auth.users and business_profiles?
SELECT 
  bp.city,
  COUNT(DISTINCT bp.user_id) as unique_business_owners,
  COUNT(DISTINCT au.id) as users_in_auth_table,
  COUNT(*) as total_businesses
FROM business_profiles bp
LEFT JOIN auth.users au ON au.id = bp.user_id
WHERE bp.user_id IS NOT NULL
GROUP BY bp.city;

-- 7. Check if there are any businesses in cities other than bournemouth
SELECT 
  city,
  COUNT(*) as count,
  ARRAY_AGG(DISTINCT status) as statuses
FROM business_profiles
GROUP BY city
ORDER BY count DESC;

-- 8. Verify: Is the claim system actually being used?
SELECT 
  'claim_requests' as table_name,
  COUNT(*) as row_count,
  MAX(created_at) as most_recent_claim
FROM claim_requests
UNION ALL
SELECT 
  'businesses with owner_user_id' as table_name,
  COUNT(*) as row_count,
  MAX(updated_at) as most_recent
FROM business_profiles
WHERE owner_user_id IS NOT NULL;

