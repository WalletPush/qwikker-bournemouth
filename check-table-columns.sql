-- Show ALL columns that exist in franchise_crm_configs table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'franchise_crm_configs'
  AND table_schema = 'public'
ORDER BY ordinal_position;
