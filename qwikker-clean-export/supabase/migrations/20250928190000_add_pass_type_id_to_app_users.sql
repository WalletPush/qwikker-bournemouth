-- Add pass_type_identifier column to app_users table
-- This stores the WalletPush Pass Type ID needed for direct API calls

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS pass_type_identifier TEXT;

COMMENT ON COLUMN public.app_users.pass_type_identifier IS 'WalletPush Pass Type ID (e.g., pass.com.qwikker.bournemouth) for direct API calls';

CREATE INDEX IF NOT EXISTS idx_app_users_pass_type_identifier ON public.app_users(pass_type_identifier);
