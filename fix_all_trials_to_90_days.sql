-- Fix ALL businesses: Set trial to 90 days from APPROVAL DATE
-- This updates all existing free trials to be approval-based (90 days)

UPDATE business_subscriptions bs
SET 
  free_trial_end_date = bp.approved_at + INTERVAL '90 days',
  updated_at = NOW()
FROM business_profiles bp
WHERE 
  bs.business_id = bp.id
  AND bs.is_in_free_trial = true
  AND bp.approved_at IS NOT NULL;

-- Verify the changes
SELECT 
  bp.business_name,
  bp.created_at as signup_date,
  bp.approved_at as approval_date,
  bs.free_trial_start_date,
  bs.free_trial_end_date,
  EXTRACT(DAY FROM (bs.free_trial_end_date - bs.free_trial_start_date)) AS trial_length_days,
  EXTRACT(DAY FROM (bs.free_trial_end_date - NOW())) AS days_remaining
FROM business_profiles bp
JOIN business_subscriptions bs ON bs.business_id = bp.id
WHERE bs.is_in_free_trial = true
ORDER BY bp.business_name;

