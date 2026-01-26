-- Check if London exists and what fields it has
SELECT 
  city,
  display_name,
  subdomain,
  owner_name,
  owner_email,
  CASE WHEN ghl_webhook_url IS NOT NULL AND ghl_webhook_url != '' THEN '✅ SET' ELSE '❌ NULL/EMPTY' END as ghl_webhook_url_status,
  status,
  created_at
FROM franchise_crm_configs 
WHERE city = 'london';

-- If no rows, London doesn't exist yet
