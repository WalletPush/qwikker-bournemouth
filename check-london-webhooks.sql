-- Check London's actual webhook URLs (not masked)
SELECT 
  city,
  ghl_webhook_url,
  ghl_pass_creation_webhook_url,
  ghl_update_webhook_url
FROM franchise_crm_configs 
WHERE city = 'london';
