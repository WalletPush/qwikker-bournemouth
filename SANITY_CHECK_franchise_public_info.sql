-- ============================================
-- SANITY CHECK: franchise_public_info view
-- ============================================

-- 1️⃣ Check if view exists
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'franchise_public_info';

-- Expected: 1 row with table_type = 'VIEW'

-- 2️⃣ Show all columns in the view (verify no secrets exposed)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'franchise_public_info'
ORDER BY ordinal_position;

-- Expected columns (SAFE):
-- - city
-- - display_name
-- - subdomain
-- - status
-- - country_name
-- - timezone
-- - currency_symbol

-- Should NOT see these (SECRETS):
-- - ghl_webhook_url
-- - walletpush_api_key
-- - slack_webhook_url
-- - any other API keys

-- 3️⃣ Show all data from the view
SELECT * FROM franchise_public_info;

-- Expected: All your franchises with ONLY safe public data

-- 4️⃣ Show only ACTIVE cities (what the homepage will display)
SELECT 
  city,
  display_name,
  subdomain,
  country_name,
  status
FROM franchise_public_info
WHERE status = 'active'
ORDER BY display_name;

-- Expected: Only cities with status='active'
-- These are the cities that will show on the new homepage

-- 5️⃣ Test the exact query the homepage uses
SELECT city, display_name, subdomain, country_name
FROM franchise_public_info
WHERE status = 'active'
ORDER BY display_name;

-- This is EXACTLY what the new homepage fetches
-- Verify the output looks correct
