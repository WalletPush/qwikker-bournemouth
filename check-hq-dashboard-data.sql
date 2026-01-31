-- ============================================================================
-- HQ Dashboard Data Check
-- ============================================================================
-- Check if admins, audit logs, and Atlas are configured for Bournemouth
-- ============================================================================

-- 1) Check city_admins for Bournemouth
SELECT 
  'City Admins' as check_type,
  COUNT(*) as count
FROM city_admins
WHERE city = 'bournemouth';

SELECT 
  id,
  user_id,
  city,
  role,
  created_at
FROM city_admins
WHERE city = 'bournemouth'
ORDER BY created_at DESC
LIMIT 10;

-- 2) Check hq_audit_logs for Bournemouth
SELECT 
  'Audit Logs' as check_type,
  COUNT(*) as count
FROM hq_audit_logs
WHERE city = 'bournemouth';

SELECT 
  id,
  action,
  actor_email,
  timestamp,
  resource_type,
  metadata
FROM hq_audit_logs
WHERE city = 'bournemouth'
ORDER BY timestamp DESC
LIMIT 10;

-- 3) Check Atlas configuration for Bournemouth
SELECT 
  city,
  atlas_enabled,
  mapbox_public_token IS NOT NULL as has_mapbox_token,
  lat,
  lng
FROM franchise_crm_configs
WHERE city = 'bournemouth';

-- 4) Check if hq_audit_logs table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'hq_audit_logs';

-- 5) Check recent business imports (potential audit log entries)
SELECT 
  business_name,
  status,
  auto_imported,
  created_at
FROM business_profiles
WHERE city = 'bournemouth'
  AND auto_imported = true
ORDER BY created_at DESC
LIMIT 5;
