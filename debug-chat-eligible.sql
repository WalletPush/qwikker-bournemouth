-- ============================================
-- DEBUG: Why aren't my businesses showing in chat?
-- ============================================

-- Step 1: Check ALL businesses in Bournemouth (remove mock filter)
SELECT 
  bp.business_name,
  bp.status AS business_status,
  bp.city,
  bs.status AS subscription_status,
  bs.is_in_free_trial,
  bs.free_trial_end_date,
  bs.current_period_end,
  st.tier_name,
  st.tier_display_name,
  CASE 
    WHEN bp.status != 'approved' THEN '❌ Status not approved (' || bp.status || ')'
    WHEN bs.business_id IS NULL THEN '❌ No subscription found'
    WHEN bs.is_in_free_trial = true 
      AND bs.free_trial_end_date < NOW() THEN '❌ Trial expired'
    WHEN bs.status = 'active' 
      AND bs.current_period_end IS NOT NULL
      AND bs.current_period_end < NOW() THEN '❌ Subscription expired'
    WHEN bp.status IN ('unclaimed', 'pending_claim', 'claimed_free', 'incomplete') THEN '❌ Status excluded from chat'
    ELSE '✅ Should be chat eligible'
  END AS diagnosis
FROM business_profiles bp
LEFT JOIN business_subscriptions bs ON bs.business_id = bp.id
LEFT JOIN subscription_tiers st ON st.id = bs.tier_id
WHERE bp.city = 'bournemouth'
ORDER BY bp.created_at DESC
LIMIT 20;

-- Step 2: Check what's actually in business_profiles_chat_eligible view
SELECT 
  business_name,
  city,
  status,
  effective_tier,
  tier_priority,
  sub_tier_name,
  sub_status,
  is_in_free_trial,
  free_trial_end_date
FROM business_profiles_chat_eligible
WHERE city = 'bournemouth'
ORDER BY tier_priority, business_name
LIMIT 20;

-- Step 3: Count by status (see what's blocking them)
SELECT 
  bp.status,
  COUNT(*) as count,
  COUNT(bs.id) as with_subscription,
  COUNT(*) - COUNT(bs.id) as without_subscription
FROM business_profiles bp
LEFT JOIN business_subscriptions bs ON bs.business_id = bp.id
WHERE bp.city = 'bournemouth'
GROUP BY bp.status
ORDER BY count DESC;

-- Step 4: Check subscription_tiers table (make sure tiers exist)
SELECT id, tier_name, tier_display_name, monthly_price 
FROM subscription_tiers 
ORDER BY monthly_price DESC;
