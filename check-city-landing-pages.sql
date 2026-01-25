-- Check which cities will show CityLandingPage vs fall through to global homepage
-- 
-- Logic from app/page.tsx:
-- - City must exist in franchise_public_info
-- - City must have status = 'active'
-- - Otherwise falls through to GlobalHomepagePremium

SELECT 
  city,
  display_name,
  subdomain,
  status,
  country_name,
  CASE 
    WHEN status = 'active' THEN '✅ WILL SHOW CITY LANDING PAGE (active)'
    WHEN status = 'pending_setup' THEN '✅ WILL SHOW CITY LANDING PAGE (pending_setup)'
    WHEN status = 'coming_soon' THEN '⚠️  FALLS THROUGH TO GLOBAL (coming_soon)'
    ELSE '❌ FALLS THROUGH TO GLOBAL (unknown status)'
  END as landing_page_behavior,
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
    WHEN status IN ('active', 'pending_setup') THEN '✅ Shows city landing page'
    ELSE '⚠️  Falls through to global homepage'
  END as behavior
FROM franchise_public_info
GROUP BY status
ORDER BY status;
