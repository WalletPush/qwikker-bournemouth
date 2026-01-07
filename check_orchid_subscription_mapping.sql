-- Check Orchid & Ivy subscription mapping issue

SELECT 
  bp.business_name,
  bp.id as business_id,
  bp.user_id,
  bp.status,
  bp.created_at,
  bs.business_id as subscription_business_id,
  bs.is_in_free_trial,
  bs.free_trial_start_date,
  bs.free_trial_end_date,
  CASE 
    WHEN bs.business_id = bp.user_id THEN '✅ Matched by user_id'
    WHEN bs.business_id = bp.id THEN '⚠️ Matched by profile.id (LEGACY)'
    WHEN bs.business_id IS NULL THEN '❌ NO SUBSCRIPTION FOUND'
    ELSE '❌ ORPHANED SUBSCRIPTION'
  END as match_status
FROM business_profiles bp
LEFT JOIN business_subscriptions bs ON (bs.business_id = bp.user_id OR bs.business_id = bp.id)
WHERE bp.business_name LIKE '%Orchid%'
ORDER BY bp.created_at DESC;

-- Also check what subscriptions exist for this business's IDs
SELECT 
  'Subscriptions that might belong to Orchid & Ivy:' as info,
  bs.*
FROM business_subscriptions bs
WHERE bs.business_id IN (
  SELECT id FROM business_profiles WHERE business_name LIKE '%Orchid%'
  UNION
  SELECT user_id FROM business_profiles WHERE business_name LIKE '%Orchid%' AND user_id IS NOT NULL
);

