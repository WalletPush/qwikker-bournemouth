-- Add coming soon cities to franchise_crm_configs
-- This allows them to appear dynamically on both homepage and for-business page
-- Date: 2026-01-25

-- Insert coming soon cities (minimal required fields)
-- These will show as "coming soon" because status = 'coming_soon'

INSERT INTO franchise_crm_configs (
  city, display_name, subdomain, status, country_name, country_code,
  owner_name, owner_email, ghl_webhook_url, timezone
) VALUES
  -- United Kingdom
  ('southampton', 'Southampton', 'southampton', 'coming_soon', 'United Kingdom', 'GB', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'Europe/London'),
  ('brighton', 'Brighton', 'brighton', 'coming_soon', 'United Kingdom', 'GB', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'Europe/London'),
  ('london', 'London', 'london', 'coming_soon', 'United Kingdom', 'GB', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'Europe/London'),
  ('cornwall', 'Cornwall', 'cornwall', 'coming_soon', 'United Kingdom', 'GB', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'Europe/London'),
  ('shrewsbury', 'Shrewsbury', 'shrewsbury', 'coming_soon', 'United Kingdom', 'GB', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'Europe/London'),
  
  -- Canada
  ('calgary', 'Calgary', 'calgary', 'coming_soon', 'Canada', 'CA', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'America/Edmonton'),
  
  -- United States
  ('las-vegas', 'Las Vegas', 'lasvegas', 'coming_soon', 'United States', 'US', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'America/Los_Angeles'),
  ('dallas', 'Dallas', 'dallas', 'coming_soon', 'United States', 'US', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'America/Chicago'),
  ('nyc', 'New York City', 'nyc', 'coming_soon', 'United States', 'US', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'America/New_York'),
  
  -- United Arab Emirates
  ('dubai', 'Dubai', 'dubai', 'coming_soon', 'United Arab Emirates', 'AE', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'Asia/Dubai'),
  
  -- Spain
  ('costa-blanca', 'Costa Blanca', 'costablanca', 'coming_soon', 'Spain', 'ES', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'Europe/Madrid'),
  
  -- France
  ('paris', 'Paris', 'paris', 'coming_soon', 'France', 'FR', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'Europe/Paris'),
  
  -- Thailand
  ('bangkok', 'Bangkok', 'bangkok', 'coming_soon', 'Thailand', 'TH', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'Asia/Bangkok'),
  ('koh-samui', 'Koh Samui', 'kohsamui', 'coming_soon', 'Thailand', 'TH', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'Asia/Bangkok'),
  
  -- Indonesia
  ('bali', 'Bali', 'bali', 'coming_soon', 'Indonesia', 'ID', 'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'Asia/Jakarta')

ON CONFLICT (city) DO NOTHING;

-- Update the view to include 'coming_soon' status
DROP VIEW IF EXISTS franchise_public_info;

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
WHERE status IN ('active', 'pending_setup', 'coming_soon');

-- Grant access to anon and authenticated roles
GRANT SELECT ON franchise_public_info TO anon, authenticated;

COMMENT ON VIEW franchise_public_info IS 'Public-safe view of franchise information. Includes active, pending_setup, and coming_soon cities. Excludes all API keys, secrets, and sensitive configuration.';
