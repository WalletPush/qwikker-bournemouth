-- Add GHL sync tracking fields to business_profiles table
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS last_ghl_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS referral_source TEXT,
ADD COLUMN IF NOT EXISTS goals TEXT;

-- Create index for GHL contact ID lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_ghl_contact_id ON public.business_profiles(ghl_contact_id);

-- Create index for GHL sync status
CREATE INDEX IF NOT EXISTS idx_business_profiles_last_ghl_sync ON public.business_profiles(last_ghl_sync);

-- Add comment explaining the fields
COMMENT ON COLUMN public.business_profiles.last_ghl_sync IS 'Timestamp of last successful sync with GoHighLevel CRM';
COMMENT ON COLUMN public.business_profiles.ghl_contact_id IS 'GoHighLevel contact ID for bidirectional sync';
COMMENT ON COLUMN public.business_profiles.website IS 'Business website URL';
COMMENT ON COLUMN public.business_profiles.instagram IS 'Instagram handle or URL';
COMMENT ON COLUMN public.business_profiles.facebook IS 'Facebook page URL';
COMMENT ON COLUMN public.business_profiles.referral_source IS 'How they heard about Qwikker';
COMMENT ON COLUMN public.business_profiles.goals IS 'Business goals and objectives';
