-- Verify London franchise setup is complete and ready for import
-- Shows essential fields needed to get London working

SELECT 
  '🏢 BASIC INFO' as category,
  display_name,
  subdomain,
  owner_name,
  owner_email,
  timezone,
  status
FROM franchise_crm_configs 
WHERE city = 'london'

UNION ALL

SELECT 
  '📧 EMAIL (Resend)',
  CASE WHEN resend_api_key IS NOT NULL AND resend_api_key != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  resend_from_email,
  resend_from_name,
  '',
  '',
  ''
FROM franchise_crm_configs 
WHERE city = 'london'

UNION ALL

SELECT 
  '🔗 GHL WEBHOOKS',
  CASE WHEN ghl_pass_creation_webhook_url IS NOT NULL AND ghl_pass_creation_webhook_url != '' 
       THEN CASE WHEN ghl_pass_creation_webhook_url LIKE '%PLACEHOLDER%' 
                 THEN '⚠️ PLACEHOLDER' 
                 ELSE '✅ CONFIGURED' 
            END
       ELSE '❌ NOT SET' 
  END as pass_webhook_status,
  CASE WHEN ghl_webhook_url IS NOT NULL AND ghl_webhook_url != '' 
       THEN CASE WHEN ghl_webhook_url LIKE '%PLACEHOLDER%' 
                 THEN '⚠️ PLACEHOLDER' 
                 ELSE '✅ CONFIGURED' 
            END
       ELSE '❌ NOT SET' 
  END as business_webhook_status,
  '',
  '',
  '',
  ''
FROM franchise_crm_configs 
WHERE city = 'london'

UNION ALL

SELECT 
  '📱 WALLETPUSH',
  CASE WHEN walletpush_api_key IS NOT NULL AND walletpush_api_key != '' THEN '✅ HAS KEY' ELSE '❌ NO KEY' END,
  walletpush_template_id,
  walletpush_endpoint_url,
  '',
  '',
  ''
FROM franchise_crm_configs 
WHERE city = 'london'

UNION ALL

SELECT 
  '🗺️ GOOGLE PLACES',
  CASE WHEN google_places_api_key IS NOT NULL AND google_places_api_key != '' THEN '✅ CONFIGURED' ELSE '❌ NOT SET' END,
  COALESCE(city_center_lat::text, 'Not set'),
  COALESCE(city_center_lng::text, 'Not set'),
  '',
  '',
  ''
FROM franchise_crm_configs 
WHERE city = 'london';

-- Show side-by-side comparison with Bournemouth
SELECT 
  '=' as divider,
  '=',
  '=',
  '=',
  '=',
  '=',
  '=';

SELECT 
  '📊 COMPARISON' as info,
  'London',
  'Bournemouth',
  '',
  '',
  '',
  '';

SELECT 
  'GHL Pass Webhook',
  CASE WHEN l.ghl_pass_creation_webhook_url IS NOT NULL AND l.ghl_pass_creation_webhook_url != '' 
       THEN CASE WHEN l.ghl_pass_creation_webhook_url LIKE '%PLACEHOLDER%' THEN '⚠️ PLACEHOLDER' ELSE '✅ SET' END
       ELSE '❌ MISSING' 
  END as london_status,
  CASE WHEN b.ghl_pass_creation_webhook_url IS NOT NULL AND b.ghl_pass_creation_webhook_url != '' THEN '✅ SET' ELSE '❌ MISSING' END as bmth_status,
  '',
  '',
  '',
  ''
FROM 
  (SELECT ghl_pass_creation_webhook_url FROM franchise_crm_configs WHERE city = 'london') l,
  (SELECT ghl_pass_creation_webhook_url FROM franchise_crm_configs WHERE city = 'bournemouth') b

UNION ALL

SELECT 
  'GHL Business Webhook',
  CASE WHEN l.ghl_webhook_url IS NOT NULL AND l.ghl_webhook_url != '' 
       THEN CASE WHEN l.ghl_webhook_url LIKE '%PLACEHOLDER%' THEN '⚠️ PLACEHOLDER' ELSE '✅ SET' END
       ELSE '❌ MISSING' 
  END,
  CASE WHEN b.ghl_webhook_url IS NOT NULL AND b.ghl_webhook_url != '' THEN '✅ SET' ELSE '❌ MISSING' END,
  '',
  '',
  '',
  ''
FROM 
  (SELECT ghl_webhook_url FROM franchise_crm_configs WHERE city = 'london') l,
  (SELECT ghl_webhook_url FROM franchise_crm_configs WHERE city = 'bournemouth') b

UNION ALL

SELECT 
  'WalletPush API Key',
  CASE WHEN l.walletpush_api_key IS NOT NULL AND l.walletpush_api_key != '' THEN '✅ SET' ELSE '❌ MISSING' END,
  CASE WHEN b.walletpush_api_key IS NOT NULL AND b.walletpush_api_key != '' THEN '✅ SET' ELSE '❌ MISSING' END,
  '',
  '',
  '',
  ''
FROM 
  (SELECT walletpush_api_key FROM franchise_crm_configs WHERE city = 'london') l,
  (SELECT walletpush_api_key FROM franchise_crm_configs WHERE city = 'bournemouth') b

UNION ALL

SELECT 
  'WalletPush Template',
  CASE WHEN l.walletpush_template_id IS NOT NULL AND l.walletpush_template_id != '' THEN '✅ SET' ELSE '❌ MISSING' END,
  CASE WHEN b.walletpush_template_id IS NOT NULL AND b.walletpush_template_id != '' THEN '✅ SET' ELSE '❌ MISSING' END,
  '',
  '',
  '',
  ''
FROM 
  (SELECT walletpush_template_id FROM franchise_crm_configs WHERE city = 'london') l,
  (SELECT walletpush_template_id FROM franchise_crm_configs WHERE city = 'bournemouth') b

UNION ALL

SELECT 
  'WalletPush Endpoint',
  CASE WHEN l.walletpush_endpoint_url IS NOT NULL AND l.walletpush_endpoint_url != '' THEN '✅ SET' ELSE '❌ MISSING' END,
  CASE WHEN b.walletpush_endpoint_url IS NOT NULL AND b.walletpush_endpoint_url != '' THEN '✅ SET' ELSE '❌ MISSING' END,
  '',
  '',
  '',
  ''
FROM 
  (SELECT walletpush_endpoint_url FROM franchise_crm_configs WHERE city = 'london') l,
  (SELECT walletpush_endpoint_url FROM franchise_crm_configs WHERE city = 'bournemouth') b

UNION ALL

SELECT 
  'Google Places Key',
  CASE WHEN l.google_places_api_key IS NOT NULL AND l.google_places_api_key != '' THEN '✅ SET' ELSE '❌ MISSING' END,
  CASE WHEN b.google_places_api_key IS NOT NULL AND b.google_places_api_key != '' THEN '✅ SET' ELSE '❌ MISSING' END,
  '',
  '',
  '',
  ''
FROM 
  (SELECT google_places_api_key FROM franchise_crm_configs WHERE city = 'london') l,
  (SELECT google_places_api_key FROM franchise_crm_configs WHERE city = 'bournemouth') b;

-- Final readiness check
SELECT 
  '=' as divider,
  '=',
  '=',
  '=',
  '=',
  '=',
  '=';

SELECT 
  '✅ READY FOR IMPORT?' as check_name,
  CASE 
    WHEN ghl_pass_creation_webhook_url IS NOT NULL AND ghl_pass_creation_webhook_url != '' 
         AND ghl_webhook_url IS NOT NULL AND ghl_webhook_url != ''
         AND walletpush_api_key IS NOT NULL AND walletpush_api_key != ''
         AND walletpush_template_id IS NOT NULL AND walletpush_template_id != ''
         AND walletpush_endpoint_url IS NOT NULL AND walletpush_endpoint_url != ''
         AND google_places_api_key IS NOT NULL AND google_places_api_key != ''
    THEN '✅ YES - All required fields configured!'
    ELSE '❌ NO - Missing required fields'
  END as status,
  '',
  '',
  '',
  '',
  ''
FROM franchise_crm_configs 
WHERE city = 'london';
