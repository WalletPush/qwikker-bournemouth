-- Check Scizzors' subscription data to see why dashboard is falling back

SELECT 
  bp.business_name,
  bp.created_at as signup_date,
  bp.approved_at as approval_date,
  bs.is_in_free_trial,
  bs.free_trial_start_date,
  bs.free_trial_end_date,
  bs.status as subscription_status,
  EXTRACT(DAY FROM (bs.free_trial_end_date - bs.free_trial_start_date)) AS trial_length_days,
  EXTRACT(DAY FROM (bs.free_trial_end_date - NOW())) AS days_remaining
FROM business_profiles bp
LEFT JOIN business_subscriptions bs ON bs.business_id = bp.id
WHERE bp.business_name = 'Scizzors'
ORDER BY bs.created_at DESC
LIMIT 1;

