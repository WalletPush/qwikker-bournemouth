-- ============================================================================
-- ADD PASS CREATION WEBHOOK FOR MULTI-TENANT USER ONBOARDING
-- ============================================================================
-- This migration adds a dedicated webhook URL for pass creation events,
-- separate from business CRM sync webhooks, enabling proper multi-tenant
-- tracking of user wallet pass installations.
--
-- WEBHOOK TYPES EXPLAINED:
-- 1. ghl_pass_creation_webhook_url (NEW) - User flow: Wallet pass installations
-- 2. ghl_webhook_url (EXISTING) - Business flow: Business signups/updates
-- 3. ghl_update_webhook_url (EXISTING) - Business flow: Profile updates (optional)
-- ============================================================================

-- Add the new column for pass creation webhook
ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS ghl_pass_creation_webhook_url TEXT;

-- Add helpful comments to clarify webhook purposes
COMMENT ON COLUMN franchise_crm_configs.ghl_pass_creation_webhook_url IS 
  'Webhook URL triggered when users install their wallet pass (user onboarding flow). 
   Example: When someone fills out /join form and creates their pass.
   This is SEPARATE from business CRM sync webhooks.';

COMMENT ON COLUMN franchise_crm_configs.ghl_webhook_url IS 
  'Webhook URL for business CRM sync (business onboarding flow).
   Example: When businesses sign up or update their profiles.
   This is SEPARATE from user pass creation webhooks.';

COMMENT ON COLUMN franchise_crm_configs.ghl_update_webhook_url IS 
  'Optional separate webhook for business profile updates.
   Falls back to ghl_webhook_url if not set.
   This is SEPARATE from user pass creation webhooks.';

-- ============================================================================
-- SECURITY NOTE: 
-- Webhook URLs contain sensitive endpoint information and should NOT be 
-- committed to the repository. Configure them via:
-- 1. Admin Setup Wizard (recommended): visit {city}.qwikker.com/admin
-- 2. Direct SQL: Run UPDATE statements manually on your database
-- 3. Supabase Dashboard: Edit the franchise_crm_configs table directly
-- ============================================================================

-- Example UPDATE statement (DO NOT COMMIT ACTUAL URLs):
-- UPDATE franchise_crm_configs
-- SET ghl_pass_creation_webhook_url = 'YOUR_GHL_WEBHOOK_URL_HERE'
-- WHERE city = 'your_city';
