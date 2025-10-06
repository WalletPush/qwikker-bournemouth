-- Add GHL contact ID to app_users table for proper user tracking
-- This allows us to sync wallet pass updates with GHL contact records

-- Add ghl_contact_id field to app_users table
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT;

-- Create index for GHL contact ID lookups
CREATE INDEX IF NOT EXISTS idx_app_users_ghl_contact_id ON public.app_users(ghl_contact_id);

-- Add comment explaining the field
COMMENT ON COLUMN public.app_users.ghl_contact_id IS 'GoHighLevel contact ID for wallet pass users - used for WalletPush webhook updates';
