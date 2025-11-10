-- Check all user tracking tables and their structure

-- 1. Check user_business_visits table structure
SELECT 'user_business_visits' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_business_visits' 
ORDER BY ordinal_position;

-- 2. Check user_secret_unlocks table structure  
SELECT 'user_secret_unlocks' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_secret_unlocks' 
ORDER BY ordinal_position;

-- 3. Check user_offer_claims table structure
SELECT 'user_offer_claims' as table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;

-- 4. Check if these tables have any data
SELECT 'user_business_visits' as table_name, COUNT(*) as record_count FROM public.user_business_visits
UNION ALL
SELECT 'user_secret_unlocks' as table_name, COUNT(*) as record_count FROM public.user_secret_unlocks  
UNION ALL
SELECT 'user_offer_claims' as table_name, COUNT(*) as record_count FROM public.user_offer_claims;

-- 5. Show sample data from each table (if any exists)
SELECT 'user_business_visits sample:' as info;
SELECT * FROM public.user_business_visits LIMIT 3;

SELECT 'user_secret_unlocks sample:' as info;
SELECT * FROM public.user_secret_unlocks LIMIT 3;

SELECT 'user_offer_claims sample:' as info;
SELECT * FROM public.user_offer_claims LIMIT 3;

-- 6. Check what business IDs we have available for testing
SELECT 'Available businesses:' as info;
SELECT id, business_name, status FROM public.business_profiles WHERE status = 'approved' LIMIT 5;
