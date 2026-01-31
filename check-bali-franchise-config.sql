-- Check Bali franchise config (simplified - get all columns)
SELECT *
FROM franchise_crm_configs
WHERE city = 'bali';

-- If this returns 0 rows, Bali is not registered!
