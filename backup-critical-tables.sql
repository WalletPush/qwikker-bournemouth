-- CRITICAL TABLES SNAPSHOT (Run BEFORE Free Tier Changes)
-- Copy the output of these queries and save them somewhere safe
-- This is your "manual backup" for free tier

-- ============================================
-- 1. BACKUP business_profiles (most critical)
-- ============================================
COPY (
  SELECT * FROM business_profiles
) TO STDOUT WITH CSV HEADER;

-- Save the output as: business_profiles_backup_[DATE].csv

-- ============================================
-- 2. BACKUP business_subscriptions
-- ============================================
COPY (
  SELECT * FROM business_subscriptions
) TO STDOUT WITH CSV HEADER;

-- Save the output as: business_subscriptions_backup_[DATE].csv

-- ============================================
-- 3. BACKUP claim_requests (if exists)
-- ============================================
COPY (
  SELECT * FROM claim_requests
) TO STDOUT WITH CSV HEADER;

-- Save the output as: claim_requests_backup_[DATE].csv

-- ============================================
-- 4. BACKUP franchise_crm_configs
-- ============================================
COPY (
  SELECT * FROM franchise_crm_configs
) TO STDOUT WITH CSV HEADER;

-- Save the output as: franchise_crm_configs_backup_[DATE].csv

-- ============================================
-- QUICK COUNT CHECK (run this to verify)
-- ============================================
SELECT 
  'business_profiles' as table_name,
  COUNT(*) as row_count
FROM business_profiles
UNION ALL
SELECT 
  'business_subscriptions',
  COUNT(*)
FROM business_subscriptions
UNION ALL
SELECT 
  'auth.users',
  COUNT(*)
FROM auth.users;

-- Write down these counts! After migration, they should match.

