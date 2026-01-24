-- Create safe public view for franchise information
-- This view exposes only non-sensitive franchise data for public consumption
-- Date: 2026-01-25

CREATE OR REPLACE VIEW franchise_public_info AS
SELECT 
  city,
  display_name,
  subdomain,
  status,
  country_name,
  timezone,
  currency_symbol
FROM franchise_crm_configs
WHERE status IN ('active', 'pending_setup');

-- Grant access to anon and authenticated roles
GRANT SELECT ON franchise_public_info TO anon, authenticated;

COMMENT ON VIEW franchise_public_info IS 'Public-safe view of franchise information. Excludes all API keys, secrets, and sensitive configuration.';
