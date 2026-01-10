-- Check if resend columns exist in franchise_crm_configs
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'franchise_crm_configs'
  AND column_name LIKE '%resend%'
ORDER BY column_name;
