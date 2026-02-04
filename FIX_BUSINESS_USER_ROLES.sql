-- =====================================================
-- FIX: Manually backfill business_user_roles
-- Use this if the automatic backfill didn't work
-- =====================================================

-- This will create owner roles for ALL businesses that have a user_id
-- but don't yet have a role in business_user_roles

INSERT INTO business_user_roles (business_id, user_id, role)
SELECT 
  bp.id as business_id,
  bp.user_id,
  'owner' as role
FROM business_profiles bp
WHERE bp.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM business_user_roles bur 
    WHERE bur.business_id = bp.id 
    AND bur.user_id = bp.user_id
  )
ON CONFLICT (business_id, user_id) DO NOTHING;

-- Show what was added
SELECT 
  'Backfilled ' || COUNT(*) || ' owner roles' as "Result"
FROM business_user_roles;

-- Verify YOUR user now has access
SELECT 
  bp.business_name,
  bur.role,
  au.email
FROM business_user_roles bur
JOIN business_profiles bp ON bp.id = bur.business_id
JOIN auth.users au ON au.id = bur.user_id
WHERE bur.user_id = auth.uid();
