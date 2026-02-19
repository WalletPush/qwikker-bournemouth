-- Atlas Data Integrity Sanity Check
-- Run this in Supabase SQL Editor to verify business data for Atlas
-- Atlas uses the same three-tier view system as chat:
--   Tier 1: business_profiles_chat_eligible (paid/trial)
--   Tier 2: business_profiles_lite_eligible (claimed-free with menu items)
--   Tier 3: business_profiles_ai_fallback_pool (admin-approved unclaimed)

-- 1. Tier counts per city (what Atlas can actually show)
select 'tier_1_paid' as tier, city, count(*) as count
from business_profiles_chat_eligible
group by city
union all
select 'tier_2_lite' as tier, city, count(*) as count
from business_profiles_lite_eligible
group by city
union all
select 'tier_3_fallback' as tier, city, count(*) as count
from business_profiles_ai_fallback_pool
group by city
order by city, tier;

-- 2. All businesses breakdown: tier + status distribution (from raw table)
select
  city,
  business_tier,
  status,
  count(*) as count,
  count(*) filter (where latitude is not null and longitude is not null) as has_coords,
  count(*) filter (where admin_chat_fallback_approved = true) as fallback_approved
from business_profiles
group by city, business_tier, status
order by city, count desc;

-- 3. Businesses with coords but NOT in any tier view (invisible to Atlas)
select
  bp.id,
  bp.business_name,
  bp.business_tier,
  bp.status,
  bp.city,
  bp.rating,
  bp.admin_chat_fallback_approved
from business_profiles bp
where bp.latitude is not null
  and bp.longitude is not null
  and bp.id not in (select id from business_profiles_chat_eligible)
  and bp.id not in (select id from business_profiles_lite_eligible)
  and bp.id not in (select id from business_profiles_ai_fallback_pool)
order by bp.city, bp.business_name
limit 30;

-- 4. Verify "greek" search would match in Tier 3 fallback
select
  id,
  business_name,
  display_category,
  system_category,
  google_primary_type,
  rating,
  city
from business_profiles_ai_fallback_pool
where city = 'bournemouth'
  and (
    display_category ilike '%greek%'
    or system_category ilike '%greek%'
    or google_primary_type ilike '%greek%'
    or business_name ilike '%greek%'
  );

-- 5. Auto-imported businesses missing coords (should be 0)
select count(*) as missing_coords
from business_profiles
where auto_imported = true
  and (latitude is null or longitude is null);

-- 6. Rating distribution across all tier views
select 'tier_1' as source, min(rating) as min_r, max(rating) as max_r, avg(rating)::numeric(3,1) as avg_r, count(*) as n
from business_profiles_chat_eligible
union all
select 'tier_2', min(rating), max(rating), avg(rating)::numeric(3,1), count(*)
from business_profiles_lite_eligible
union all
select 'tier_3', min(rating), max(rating), avg(rating)::numeric(3,1), count(*)
from business_profiles_ai_fallback_pool;
