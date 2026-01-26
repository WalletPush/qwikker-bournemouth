-- Compare Bournemouth and London webhook configurations
SELECT 
  city,
  CASE 
    WHEN ghl_webhook_url IS NOT NULL AND ghl_webhook_url != '' AND ghl_webhook_url NOT LIKE '%PLACEHOLDER%' 
    THEN '✅ REAL' 
    WHEN ghl_webhook_url LIKE '%PLACEHOLDER%' 
    THEN '⚠️ PLACEHOLDER'
    ELSE '❌ NULL' 
  END as business_crm_webhook,
  
  CASE 
    WHEN ghl_pass_creation_webhook_url IS NOT NULL AND ghl_pass_creation_webhook_url != '' 
    THEN '✅ CONFIGURED' 
    ELSE '❌ NULL' 
  END as pass_creation_webhook,
  
  CASE 
    WHEN ghl_update_webhook_url IS NOT NULL AND ghl_update_webhook_url != '' 
    THEN '✅ CONFIGURED' 
    ELSE '❌ NULL (optional)' 
  END as update_webhook
  
FROM franchise_crm_configs 
WHERE city IN ('bournemouth', 'london')
ORDER BY city;
