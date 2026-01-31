-- Check what columns city_admins actually has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'city_admins' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Then check what data exists
SELECT * FROM city_admins WHERE city = 'bournemouth';
