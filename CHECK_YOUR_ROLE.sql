-- =====================================================
-- CHECK: Do YOU have a role in business_user_roles?
-- =====================================================

-- 1. Check if YOU have any roles
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ You have ' || COUNT(*) || ' role(s)'
    ELSE '❌ You have NO roles - this is the problem!'
  END as "Your Status"
FROM business_user_roles
WHERE user_id = auth.uid();

-- 2. Show YOUR roles (if any)
SELECT 
  bp.business_name,
  bur.role,
  bur.created_at
FROM business_user_roles bur
JOIN business_profiles bp ON bp.id = bur.business_id
WHERE bur.user_id = auth.uid();

-- 3. Show businesses YOU own (via business_profiles.user_id)
SELECT 
  bp.id,
  bp.business_name,
  bp.plan,
  CASE 
    WHEN bur.id IS NOT NULL THEN '✅ Has role in business_user_roles'
    ELSE '❌ MISSING role - needs backfill!'
  END as "Role Status"
FROM business_profiles bp
LEFT JOIN business_user_roles bur ON bur.business_id = bp.id AND bur.user_id = bp.user_id
WHERE bp.user_id = auth.uid();
