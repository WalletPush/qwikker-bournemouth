-- Check for expired trials (businesses past their 90-day free trial)

SELECT 
  bp.business_name,
  bp.status,
  bp.approved_at,
  bs.free_trial_start_date,
  bs.free_trial_end_date,
  bs.is_in_free_trial,
  bs.status as subscription_status,
  EXTRACT(DAY FROM (NOW() - bs.free_trial_end_date)) AS days_expired,
  CASE 
    WHEN bs.free_trial_end_date < NOW() THEN '🔴 EXPIRED'
    WHEN bs.free_trial_end_date < NOW() + INTERVAL '7 days' THEN '⚠️ EXPIRING SOON (< 7 days)'
    WHEN bs.free_trial_end_date < NOW() + INTERVAL '30 days' THEN '⏰ EXPIRING SOON (< 30 days)'
    ELSE '✅ Active'
  END as trial_status
FROM business_profiles bp
JOIN business_subscriptions bs ON bs.business_id = bp.id
WHERE bs.is_in_free_trial = true
ORDER BY bs.free_trial_end_date ASC;

-- Summary counts
SELECT 
  COUNT(*) FILTER (WHERE bs.free_trial_end_date < NOW()) as expired_count,
  COUNT(*) FILTER (WHERE bs.free_trial_end_date >= NOW() AND bs.free_trial_end_date < NOW() + INTERVAL '7 days') as expiring_soon_7_days,
  COUNT(*) FILTER (WHERE bs.free_trial_end_date >= NOW() AND bs.free_trial_end_date < NOW() + INTERVAL '30 days') as expiring_soon_30_days,
  COUNT(*) FILTER (WHERE bs.free_trial_end_date >= NOW()) as active_count,
  COUNT(*) as total_trials
FROM business_subscriptions bs
WHERE bs.is_in_free_trial = true;

