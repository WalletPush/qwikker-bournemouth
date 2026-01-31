-- ============================================================================
-- Fix Bournemouth Atlas & Show Admin Data
-- ============================================================================

-- 1) Check current Atlas status for Bournemouth
SELECT 
  city,
  atlas_enabled,
  mapbox_public_token IS NOT NULL as has_token,
  lat,
  lng
FROM franchise_crm_configs
WHERE city = 'bournemouth';

-- 2) Check city_admins for Bournemouth
SELECT 
  id,
  user_id,
  city,
  role,
  email,
  created_at
FROM city_admins
WHERE city = 'bournemouth';

-- 3) If there are no city_admins, show the admin table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'city_admins' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4) Check recent audit logs
SELECT 
  id,
  action,
  actor_email,
  timestamp,
  metadata
FROM hq_audit_logs
WHERE city = 'bournemouth'
ORDER BY timestamp DESC
LIMIT 10;

-- 5) If no audit logs table, check if it exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'hq_audit_logs';
