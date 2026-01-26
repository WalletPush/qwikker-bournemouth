-- Check franchise_crm_configs structure and Bournemouth data (secrets masked)
SELECT 
  city,
  display_name,
  subdomain,
  owner_name,
  owner_email,
  owner_phone,
  contact_address,
  timezone,
  status,
  
  -- Resend (Email)
  CASE WHEN resend_api_key IS NOT NULL AND resend_api_key != '' THEN '✅ SET' ELSE '❌ EMPTY' END as resend_api_key_status,
  resend_from_email,
  resend_from_name,
  
  -- AI Services
  CASE WHEN openai_api_key IS NOT NULL AND openai_api_key != '' THEN '✅ SET' ELSE '❌ EMPTY' END as openai_api_key_status,
  CASE WHEN anthropic_api_key IS NOT NULL AND anthropic_api_key != '' THEN '✅ SET' ELSE '❌ EMPTY' END as anthropic_api_key_status,
  
  -- Google Places
  CASE WHEN google_places_api_key IS NOT NULL AND google_places_api_key != '' THEN '✅ SET' ELSE '❌ EMPTY' END as google_places_api_key_status,
  CASE WHEN google_places_public_key IS NOT NULL AND google_places_public_key != '' THEN '✅ SET' ELSE '❌ EMPTY' END as google_places_public_key_status,
  CASE WHEN google_places_server_key IS NOT NULL AND google_places_server_key != '' THEN '✅ SET' ELSE '❌ EMPTY' END as google_places_server_key_status,
  google_places_country,
  city_center_lat,
  city_center_lng,
  onboarding_search_radius_m,
  import_search_radius_m,
  import_max_radius_m,
  
  -- GHL Webhooks
  CASE WHEN ghl_webhook_url IS NOT NULL AND ghl_webhook_url != '' THEN '✅ SET' ELSE '❌ EMPTY' END as ghl_webhook_url_status,
  CASE WHEN ghl_pass_creation_webhook_url IS NOT NULL AND ghl_pass_creation_webhook_url != '' THEN '✅ SET' ELSE '❌ EMPTY' END as ghl_pass_creation_webhook_url_status,
  CASE WHEN ghl_update_webhook_url IS NOT NULL AND ghl_update_webhook_url != '' THEN '✅ SET' ELSE '❌ EMPTY' END as ghl_update_webhook_url_status,
  CASE WHEN ghl_api_key IS NOT NULL AND ghl_api_key != '' THEN '✅ SET' ELSE '❌ EMPTY' END as ghl_api_key_status,
  CASE WHEN ghl_location_id IS NOT NULL AND ghl_location_id != '' THEN '✅ SET' ELSE '❌ EMPTY' END as ghl_location_id_status,
  
  -- WalletPush
  CASE WHEN walletpush_api_key IS NOT NULL AND walletpush_api_key != '' THEN '✅ SET' ELSE '❌ EMPTY' END as walletpush_api_key_status,
  walletpush_template_id,
  walletpush_endpoint_url,
  
  -- Slack
  CASE WHEN slack_webhook_url IS NOT NULL AND slack_webhook_url != '' THEN '✅ SET' ELSE '❌ EMPTY' END as slack_webhook_url_status,
  slack_channel,
  
  -- Stripe
  stripe_account_id,
  stripe_publishable_key,
  CASE WHEN stripe_webhook_secret IS NOT NULL AND stripe_webhook_secret != '' THEN '✅ SET' ELSE '❌ EMPTY' END as stripe_webhook_secret_status,
  stripe_onboarding_completed,
  
  -- Business Info
  business_registration,
  business_address,
  billing_email,
  
  -- SMS
  sms_enabled,
  sms_provider,
  sms_verified,
  sms_test_mode,
  sms_country_code,
  sms_default_calling_code,
  CASE WHEN twilio_account_sid IS NOT NULL AND twilio_account_sid != '' THEN '✅ SET' ELSE '❌ EMPTY' END as twilio_account_sid_status,
  CASE WHEN twilio_auth_token IS NOT NULL AND twilio_auth_token != '' THEN '✅ SET' ELSE '❌ EMPTY' END as twilio_auth_token_status,
  CASE WHEN twilio_messaging_service_sid IS NOT NULL AND twilio_messaging_service_sid != '' THEN '✅ SET' ELSE '❌ EMPTY' END as twilio_messaging_service_sid_status,
  twilio_from_number,
  sms_last_error,
  sms_last_verified_at,
  
  -- Founding Member
  founding_member_enabled,
  founding_member_total_spots,
  founding_member_trial_days,
  founding_member_discount_percent,
  
  -- Currency/Billing
  currency,
  currency_symbol,
  tax_rate,
  tax_name,
  
  -- Atlas (Map)
  atlas_enabled,
  atlas_provider,
  CASE WHEN mapbox_public_token IS NOT NULL AND mapbox_public_token != '' THEN '✅ SET' ELSE '❌ EMPTY' END as mapbox_public_token_status,
  mapbox_style_url,
  atlas_default_zoom,
  atlas_pitch,
  atlas_bearing,
  atlas_max_results,
  atlas_min_rating,
  atlas_mode,
  
  -- Timestamps
  created_at,
  updated_at
  
FROM franchise_crm_configs
WHERE city = 'bournemouth'
\gx
