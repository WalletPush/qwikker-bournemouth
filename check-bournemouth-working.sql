-- Bournemouth Configuration Status (Pure SQL - works anywhere)
-- Shows what's actually configured and being used

-- Basic Info
SELECT 
  '🏢 BASIC INFO' as "════════════════════",
  city as "City",
  display_name as "Display Name",
  owner_name as "Owner",
  owner_email as "Email",
  timezone as "Timezone",
  status as "Status"
FROM franchise_crm_configs WHERE city = 'bournemouth'

UNION ALL

-- Email Service
SELECT 
  '📧 EMAIL (Resend)',
  CASE WHEN resend_api_key IS NOT NULL AND resend_api_key != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  resend_from_email,
  resend_from_name,
  null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'

UNION ALL

-- AI Services
SELECT 
  '🤖 AI SERVICES',
  CASE WHEN openai_api_key IS NOT NULL AND openai_api_key != '' THEN '✅ OpenAI' ELSE '❌ No OpenAI' END,
  CASE WHEN anthropic_api_key IS NOT NULL AND anthropic_api_key != '' THEN '✅ Anthropic' ELSE '❌ No Anthropic' END,
  null, null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'

UNION ALL

-- GHL Webhooks
SELECT 
  '🔗 GHL WEBHOOKS',
  CASE WHEN ghl_webhook_url IS NOT NULL AND ghl_webhook_url != '' THEN '✅ Business CRM' ELSE '❌ Business CRM' END,
  CASE WHEN ghl_pass_creation_webhook_url IS NOT NULL AND ghl_pass_creation_webhook_url != '' THEN '✅ Pass Creation' ELSE '❌ Pass Creation' END,
  CASE WHEN ghl_update_webhook_url IS NOT NULL AND ghl_update_webhook_url != '' THEN '✅ Updates' ELSE '❌ Updates' END,
  null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'

UNION ALL

-- WalletPush
SELECT 
  '📱 WALLETPUSH',
  CASE WHEN walletpush_api_key IS NOT NULL AND walletpush_api_key != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  walletpush_template_id,
  walletpush_endpoint_url,
  null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'

UNION ALL

-- Slack
SELECT 
  '💬 SLACK',
  CASE WHEN slack_webhook_url IS NOT NULL AND slack_webhook_url != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  slack_channel,
  null, null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'

UNION ALL

-- Google Places
SELECT 
  '🗺️ GOOGLE PLACES',
  CASE WHEN google_places_server_key IS NOT NULL AND google_places_server_key != '' THEN '✅ Server Key' ELSE '❌ Server Key' END,
  CASE WHEN google_places_public_key IS NOT NULL AND google_places_public_key != '' THEN '✅ Public Key' ELSE '❌ Public Key' END,
  'Country: ' || COALESCE(google_places_country, 'not set'),
  CASE WHEN city_center_lat IS NOT NULL THEN 'Lat: ' || city_center_lat::text ELSE 'No center' END,
  CASE WHEN city_center_lng IS NOT NULL THEN 'Lng: ' || city_center_lng::text ELSE 'No center' END,
  null
FROM franchise_crm_configs WHERE city = 'bournemouth'

UNION ALL

-- Search Radii
SELECT 
  '📍 SEARCH RADII',
  CASE WHEN onboarding_search_radius_m IS NOT NULL THEN 'Onboarding: ' || onboarding_search_radius_m::text || 'm' ELSE 'Not set' END,
  CASE WHEN import_search_radius_m IS NOT NULL THEN 'Import: ' || import_search_radius_m::text || 'm' ELSE 'Not set' END,
  CASE WHEN import_max_radius_m IS NOT NULL THEN 'Max: ' || import_max_radius_m::text || 'm' ELSE 'Not set' END,
  null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'

UNION ALL

-- Founding Member
SELECT 
  '🎖️ FOUNDING MEMBER',
  CASE WHEN founding_member_enabled THEN '✅ ENABLED' ELSE '❌ DISABLED' END,
  founding_member_total_spots::text || ' spots',
  founding_member_trial_days::text || ' days trial',
  founding_member_discount_percent::text || '% lifetime discount',
  null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'

UNION ALL

-- Currency
SELECT 
  '💰 CURRENCY & TAX',
  currency,
  currency_symbol,
  (tax_rate * 100)::text || '%',
  tax_name,
  null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'

UNION ALL

-- Stripe (Optional)
SELECT 
  '💳 STRIPE (Optional)',
  CASE WHEN stripe_account_id IS NOT NULL AND stripe_account_id != '' THEN '✅ Connected: ' || stripe_account_id ELSE '❌ NOT CONNECTED' END,
  CASE WHEN stripe_onboarding_completed THEN '✅ Onboarding Done' ELSE '❌ Onboarding Pending' END,
  null, null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'

UNION ALL

-- SMS (Optional)
SELECT 
  '📲 SMS/TWILIO (Optional)',
  CASE WHEN sms_enabled THEN '✅ ENABLED' ELSE '❌ DISABLED' END,
  sms_provider,
  CASE WHEN sms_verified THEN '✅ Verified' ELSE '❌ Not Verified' END,
  CASE WHEN twilio_account_sid IS NOT NULL AND twilio_account_sid != '' THEN '✅ Has Credentials' ELSE '❌ No Credentials' END,
  null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'

UNION ALL

-- Atlas (Optional)
SELECT 
  '🗺️ ATLAS MAP (Optional)',
  CASE WHEN atlas_enabled THEN '✅ ENABLED' ELSE '❌ DISABLED' END,
  atlas_provider,
  CASE WHEN mapbox_public_token IS NOT NULL AND mapbox_public_token != '' THEN '✅ Has Token' ELSE '❌ No Token' END,
  null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth';
