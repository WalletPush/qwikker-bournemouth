-- Check Bournemouth's actual configuration (secrets masked, showing what's essential)
SELECT 
  '=== BASIC INFO ===' as section,
  city,
  display_name,
  subdomain,
  owner_name,
  owner_email,
  owner_phone,
  timezone,
  status,
  created_at::date as created_date
FROM franchise_crm_configs WHERE city = 'bournemouth'
UNION ALL
SELECT 
  '=== RESEND (EMAIL) ===' as section,
  CASE WHEN resend_api_key IS NOT NULL AND resend_api_key != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  resend_from_email,
  resend_from_name,
  null, null, null, null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'
UNION ALL
SELECT 
  '=== AI SERVICES ===' as section,
  CASE WHEN openai_api_key IS NOT NULL AND openai_api_key != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  CASE WHEN anthropic_api_key IS NOT NULL AND anthropic_api_key != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  null, null, null, null, null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'
UNION ALL
SELECT 
  '=== GHL WEBHOOKS ===' as section,
  CASE WHEN ghl_webhook_url IS NOT NULL AND ghl_webhook_url != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  CASE WHEN ghl_pass_creation_webhook_url IS NOT NULL AND ghl_pass_creation_webhook_url != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  CASE WHEN ghl_update_webhook_url IS NOT NULL AND ghl_update_webhook_url != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  CASE WHEN ghl_api_key IS NOT NULL AND ghl_api_key != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  CASE WHEN ghl_location_id IS NOT NULL AND ghl_location_id != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  null, null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'
UNION ALL
SELECT 
  '=== WALLETPUSH ===' as section,
  CASE WHEN walletpush_api_key IS NOT NULL AND walletpush_api_key != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  walletpush_template_id,
  walletpush_endpoint_url,
  null, null, null, null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'
UNION ALL
SELECT 
  '=== SLACK ===' as section,
  CASE WHEN slack_webhook_url IS NOT NULL AND slack_webhook_url != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  slack_channel,
  null, null, null, null, null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'
UNION ALL
SELECT 
  '=== STRIPE ===' as section,
  stripe_account_id,
  stripe_publishable_key,
  CASE WHEN stripe_webhook_secret IS NOT NULL AND stripe_webhook_secret != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  stripe_onboarding_completed::text,
  null, null, null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'
UNION ALL
SELECT 
  '=== GOOGLE PLACES ===' as section,
  CASE WHEN google_places_api_key IS NOT NULL AND google_places_api_key != '' THEN '✅ CONFIGURED (legacy)' ELSE '❌ NOT SET' END,
  CASE WHEN google_places_public_key IS NOT NULL AND google_places_public_key != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  CASE WHEN google_places_server_key IS NOT NULL AND google_places_server_key != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  google_places_country,
  city_center_lat::text,
  city_center_lng::text,
  onboarding_search_radius_m::text || 'm',
  import_search_radius_m::text || 'm',
  import_max_radius_m::text || 'm'
FROM franchise_crm_configs WHERE city = 'bournemouth'
UNION ALL
SELECT 
  '=== FOUNDING MEMBER ===' as section,
  founding_member_enabled::text,
  founding_member_total_spots::text || ' spots',
  founding_member_trial_days::text || ' days',
  founding_member_discount_percent::text || '% discount',
  null, null, null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'
UNION ALL
SELECT 
  '=== CURRENCY/BILLING ===' as section,
  currency,
  currency_symbol,
  tax_rate::text,
  tax_name,
  CASE WHEN pricing_cards IS NOT NULL THEN '✅ JSONB SET' ELSE '❌ NOT SET' END,
  null, null, null, null
FROM franchise_crm_configs WHERE city = 'bournemouth'
UNION ALL
SELECT 
  '=== SMS (TWILIO) ===' as section,
  sms_enabled::text,
  sms_provider,
  sms_verified::text,
  sms_test_mode::text,
  sms_country_code,
  sms_default_calling_code,
  CASE WHEN twilio_account_sid IS NOT NULL AND twilio_account_sid != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  CASE WHEN twilio_auth_token IS NOT NULL AND twilio_auth_token != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  CASE WHEN twilio_messaging_service_sid IS NOT NULL AND twilio_messaging_service_sid != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END
FROM franchise_crm_configs WHERE city = 'bournemouth'
UNION ALL
SELECT 
  '=== ATLAS (MAP) ===' as section,
  atlas_enabled::text,
  atlas_provider,
  CASE WHEN mapbox_public_token IS NOT NULL AND mapbox_public_token != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  atlas_default_zoom::text,
  atlas_pitch::text,
  atlas_max_results::text,
  atlas_min_rating::text,
  atlas_mode,
  null
FROM franchise_crm_configs WHERE city = 'bournemouth';
