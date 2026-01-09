-- Check what parts of the free tier migration have already been applied

-- 1. Check franchise_crm_configs columns (WE KNOW THESE EXIST)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'franchise_crm_configs'
  AND column_name IN (
    'google_places_api_key',
    'founding_member_enabled',
    'founding_member_total_spots',
    'founding_member_trial_days',
    'founding_member_discount_percent'
  )
ORDER BY column_name;

-- 2. Check if claim_requests table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'claim_requests'
) as claim_requests_exists;

-- 3. Check business_profiles for new columns
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'business_profiles'
  AND column_name IN (
    'owner_user_id',
    'status',
    'visibility',
    'founding_member',
    'founding_member_discount',
    'trial_start_date',
    'trial_end_date',
    'google_place_id',
    'auto_imported',
    'claimed_at'
  )
ORDER BY column_name;

-- 4. Check status constraint on business_profiles
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'business_profiles'::regclass
  AND conname LIKE '%status%';

-- 5. Check what status values are currently in business_profiles
SELECT 
  status,
  COUNT(*) as count
FROM business_profiles
GROUP BY status
ORDER BY count DESC;


