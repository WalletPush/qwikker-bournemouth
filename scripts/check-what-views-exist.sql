-- Check what views actually exist in the database
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE '%offer%'
ORDER BY table_name;
