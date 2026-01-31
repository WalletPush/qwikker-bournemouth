-- ============================================================================
-- Debug HQ API Response
-- ============================================================================
-- Run these queries to see exactly what the API should be returning
-- ============================================================================

-- 1. Check franchise config for Bournemouth (what franchise_crm_configs returns)
SELECT 
  id,
  city,
  subdomain,
  status
FROM franchise_crm_configs 
WHERE city = 'bournemouth';

-- 2. Check city_admins for Bournemouth (what city_admins query returns)
SELECT 
  id,
  city,
  username,
  email,
  full_name,
  is_active,
  last_login,
  created_at
FROM city_admins 
WHERE city = 'bournemouth';

-- 3. Check if there's a case sensitivity issue
SELECT city FROM franchise_crm_configs;
SELECT city FROM city_admins;

-- 4. Check if cities match exactly
SELECT 
  'franchise_config' as source,
  city
FROM franchise_crm_configs
UNION ALL
SELECT 
  'city_admins' as source,
  city
FROM city_admins;
