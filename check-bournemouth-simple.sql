-- Simple view of Bournemouth's configuration (what's actually being used)
-- Run with: psql $DATABASE_URL -f check-bournemouth-simple.sql

\echo '=== BASIC INFO ==='
SELECT 
  city, display_name, subdomain, owner_name, owner_email, 
  owner_phone, timezone, status
FROM franchise_crm_configs WHERE city = 'bournemouth';

\echo ''
\echo '=== ✅ CONFIGURED SERVICES ==='
SELECT
  CASE WHEN resend_api_key IS NOT NULL AND resend_api_key != '' THEN '✅ Resend Email' END as service,
  resend_from_email as detail
FROM franchise_crm_configs WHERE city = 'bournemouth' AND resend_api_key IS NOT NULL
UNION ALL
SELECT
  CASE WHEN openai_api_key IS NOT NULL AND openai_api_key != '' THEN '✅ OpenAI' END,
  'API Key Set'
FROM franchise_crm_configs WHERE city = 'bournemouth' AND openai_api_key IS NOT NULL
UNION ALL
SELECT
  CASE WHEN anthropic_api_key IS NOT NULL AND anthropic_api_key != '' THEN '✅ Anthropic' END,
  'API Key Set'
FROM franchise_crm_configs WHERE city = 'bournemouth' AND anthropic_api_key IS NOT NULL
UNION ALL
SELECT
  CASE WHEN ghl_webhook_url IS NOT NULL AND ghl_webhook_url != '' THEN '✅ GHL Business Webhook' END,
  'Configured'
FROM franchise_crm_configs WHERE city = 'bournemouth' AND ghl_webhook_url IS NOT NULL
UNION ALL
SELECT
  CASE WHEN ghl_pass_creation_webhook_url IS NOT NULL AND ghl_pass_creation_webhook_url != '' THEN '✅ GHL Pass Creation' END,
  'Configured'
FROM franchise_crm_configs WHERE city = 'bournemouth' AND ghl_pass_creation_webhook_url IS NOT NULL
UNION ALL
SELECT
  CASE WHEN walletpush_api_key IS NOT NULL AND walletpush_api_key != '' THEN '✅ WalletPush' END,
  walletpush_template_id
FROM franchise_crm_configs WHERE city = 'bournemouth' AND walletpush_api_key IS NOT NULL
UNION ALL
SELECT
  CASE WHEN slack_webhook_url IS NOT NULL AND slack_webhook_url != '' THEN '✅ Slack' END,
  slack_channel
FROM franchise_crm_configs WHERE city = 'bournemouth' AND slack_webhook_url IS NOT NULL
UNION ALL
SELECT
  CASE WHEN google_places_server_key IS NOT NULL AND google_places_server_key != '' THEN '✅ Google Places' END,
  'Country: ' || google_places_country
FROM franchise_crm_configs WHERE city = 'bournemouth' AND google_places_server_key IS NOT NULL;

\echo ''
\echo '=== ❌ NOT CONFIGURED ==='
SELECT
  CASE WHEN stripe_account_id IS NULL OR stripe_account_id = '' THEN '❌ Stripe Connect' END as service
FROM franchise_crm_configs WHERE city = 'bournemouth' AND (stripe_account_id IS NULL OR stripe_account_id = '')
UNION ALL
SELECT
  CASE WHEN twilio_account_sid IS NULL OR twilio_account_sid = '' THEN '❌ Twilio SMS' END
FROM franchise_crm_configs WHERE city = 'bournemouth' AND (twilio_account_sid IS NULL OR twilio_account_sid = '')
UNION ALL
SELECT
  CASE WHEN mapbox_public_token IS NULL OR mapbox_public_token = '' THEN '❌ Mapbox Atlas' END
FROM franchise_crm_configs WHERE city = 'bournemouth' AND (mapbox_public_token IS NULL OR mapbox_public_token = '');

\echo ''
\echo '=== GOOGLE PLACES CONFIG ==='
SELECT 
  city_center_lat as lat,
  city_center_lng as lng,
  onboarding_search_radius_m || 'm' as onboarding_radius,
  import_search_radius_m || 'm' as import_radius,
  import_max_radius_m || 'm' as max_radius
FROM franchise_crm_configs WHERE city = 'bournemouth';

\echo ''
\echo '=== FOUNDING MEMBER PROGRAM ==='
SELECT 
  founding_member_enabled as enabled,
  founding_member_total_spots as total_spots,
  founding_member_trial_days as trial_days,
  founding_member_discount_percent || '%' as lifetime_discount
FROM franchise_crm_configs WHERE city = 'bournemouth';

\echo ''
\echo '=== CURRENCY & TAX ==='
SELECT 
  currency,
  currency_symbol,
  (tax_rate * 100) || '%' as tax_rate,
  tax_name
FROM franchise_crm_configs WHERE city = 'bournemouth';
