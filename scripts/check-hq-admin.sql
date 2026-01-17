-- Check HQ Admin Account
-- Run this in Supabase SQL Editor to see your HQ admin email

SELECT 
    user_id,
    email,
    role,
    is_active,
    created_at
FROM hq_admins
WHERE is_active = true;

-- Also check auth.users to see the full user details
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE id IN (SELECT user_id FROM hq_admins WHERE is_active = true);
