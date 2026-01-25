-- Check which cities will show CityLandingPage vs fall through to global homepage
-- 
-- Logic from app/page.tsx:
-- - City landing page shows for BOTH 'pending_setup' AND 'active'
-- - User perspective: Both are "LIVE" (can view page, install pass)
-- - Database perspective: pending_setup = admin configuring, active = setup complete
-- - Graceful errors if services incomplete (WalletPush not configured yet)

SELECT 
  city,
  display_name,
  subdomain,
  status,
  country_name,
  CASE 
    WHEN status IN ('active', 'pending_setup') THEN '✅ LIVE (shows city landing page)'
    WHEN status = 'coming_soon' THEN '🔜 COMING SOON (shows on homepage, not launched yet)'
    ELSE '❌ UNKNOWN STATUS'
  END as user_facing_status,
  CASE
    WHEN status = 'active' THEN 'Admin completed setup wizard'
    WHEN status = 'pending_setup' THEN 'Admin configuring (users can still try to install pass)'
    WHEN status = 'coming_soon' THEN 'Not launched by HQ yet'
    ELSE 'Unknown'
  END as internal_status_meaning,
  CONCAT('http://', subdomain, '.localhost:3000') as test_url_local,
  CONCAT('https://', subdomain, '.qwikker.com') as test_url_production
FROM franchise_public_info
ORDER BY 
  CASE 
    WHEN status = 'active' THEN 1
    WHEN status = 'pending_setup' THEN 2
    WHEN status = 'coming_soon' THEN 3
    ELSE 4
  END,
  country_name,
  display_name;

-- Summary count
SELECT 
  status,
  COUNT(*) as count,
  CASE 
    WHEN status IN ('active', 'pending_setup') THEN '✅ LIVE to users'
    WHEN status = 'coming_soon' THEN '🔜 Coming soon'
    ELSE '❌ Unknown'
  END as user_facing_label
FROM franchise_public_info
GROUP BY status
ORDER BY status;
