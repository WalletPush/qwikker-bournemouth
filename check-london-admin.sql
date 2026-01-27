-- Check if London has an admin account
SELECT 
  id, 
  username, 
  email, 
  full_name,
  city, 
  is_active,
  created_at
FROM franchise_admins 
WHERE city = 'london';

-- If no admin exists, you'll need to create one via Bournemouth HQ
-- Go to: bournemouth.qwikker.com/admin/settings or wherever admin management is
