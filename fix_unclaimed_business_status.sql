-- Fix status for unclaimed businesses that are showing as 'incomplete'
-- This should only affect auto-imported businesses or manually created test businesses

-- Update all auto-imported businesses to have 'unclaimed' status
UPDATE business_profiles
SET status = 'unclaimed'
WHERE auto_imported = true
  AND status != 'unclaimed'
  AND (owner_user_id IS NULL OR status = 'incomplete');

-- Specifically fix Urban Cuts Barbers if it exists
UPDATE business_profiles
SET status = 'unclaimed'
WHERE business_name = 'Urban Cuts Barbers'
  AND status = 'incomplete';

-- Fix The Beachside Bistro if it exists
UPDATE business_profiles
SET status = 'unclaimed'
WHERE business_name = 'The Beachside Bistro'
  AND status = 'incomplete';

-- Check results
SELECT 
  id,
  business_name,
  status,
  auto_imported,
  owner_user_id IS NULL as is_unclaimed,
  created_at
FROM business_profiles
WHERE auto_imported = true OR business_name IN ('Urban Cuts Barbers', 'The Beachside Bistro')
ORDER BY created_at DESC;

