-- Check what columns already exist in business_profiles
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'business_profiles'
  AND column_name IN ('status', 'owner_user_id', 'visibility', 'google_place_id')
ORDER BY column_name;

-- Check existing status constraint if it exists
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'business_profiles'::regclass
  AND conname LIKE '%status%';

-- Check what status values are currently in use
SELECT 
  status,
  COUNT(*) as count
FROM business_profiles
GROUP BY status
ORDER BY count DESC;


