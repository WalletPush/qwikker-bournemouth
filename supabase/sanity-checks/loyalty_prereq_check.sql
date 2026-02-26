-- Loyalty System V1 -- Pre-Build Sanity Check
-- Run this in Supabase SQL Editor BEFORE creating the loyalty migration.
-- SELECT-only. Zero writes. Zero risk.
-- Single query -- all results in one table.

with

-- 1. business_profiles columns
bp_columns as (
  select
    '01_business_profiles' as section,
    column_name as check_item,
    case
      when column_name = 'id' and data_type = 'uuid' then 'OK'
      when column_name = 'user_id' and data_type = 'uuid' then 'OK'
      when column_name = 'slug' and data_type = 'text' then 'OK'
      when column_name = 'city' and data_type = 'text' then 'OK'
      when column_name = 'status' and data_type = 'text' then 'OK'
      when column_name = 'features' and data_type = 'jsonb' then 'OK'
      when column_name = 'business_name' and data_type = 'text' then 'OK'
      when column_name = 'logo' and data_type = 'text' then 'OK'
      else 'CHECK -- type is ' || data_type
    end as status,
    data_type as detail
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'business_profiles'
    and column_name in ('id', 'user_id', 'slug', 'city', 'status', 'features', 'business_name', 'logo')
),

-- 2. app_users columns
au_columns as (
  select
    '02_app_users' as section,
    column_name as check_item,
    case
      when column_name = 'id' and data_type = 'uuid' then 'OK'
      when column_name = 'user_id' and data_type = 'uuid' then 'OK'
      when column_name = 'wallet_pass_id' and data_type = 'text' then 'OK'
      when column_name = 'city' and data_type = 'text' then 'OK'
      when column_name = 'wallet_pass_status' and data_type = 'text' then 'OK'
      when column_name = 'name' and data_type = 'text' then 'OK'
      when column_name = 'first_name' and data_type = 'text' then 'OK'
      when column_name = 'last_name' and data_type = 'text' then 'OK'
      when column_name = 'email' and data_type = 'text' then 'OK'
      when column_name = 'pass_type_identifier' and data_type = 'text' then 'OK (main pass only)'
      else 'CHECK -- type is ' || data_type
    end as status,
    data_type as detail
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'app_users'
    and column_name in (
      'id', 'user_id', 'wallet_pass_id', 'city', 'wallet_pass_status',
      'name', 'first_name', 'last_name', 'email', 'pass_type_identifier'
    )
),

-- 3. date_of_birth must NOT exist
dob_check as (
  select
    '03_collision' as section,
    'date_of_birth on app_users' as check_item,
    case
      when count(*) = 0 then 'OK -- does not exist (safe to add)'
      else 'CONFLICT -- already exists!'
    end as status,
    '' as detail
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'app_users'
    and column_name = 'date_of_birth'
),

-- 4. loyalty tables must NOT exist
loyalty_tables_check as (
  select
    '04_collision' as section,
    'loyalty_* tables' as check_item,
    case
      when count(*) = 0 then 'OK -- no loyalty tables exist (safe to create)'
      else 'CONFLICT -- ' || count(*) || ' loyalty table(s) already exist!'
    end as status,
    coalesce(string_agg(table_name, ', '), 'none') as detail
  from information_schema.tables
  where table_schema = 'public'
    and table_name like 'loyalty_%'
),

-- 5. public_id column must NOT exist anywhere
public_id_check as (
  select
    '05_collision' as section,
    'public_id column' as check_item,
    case
      when count(*) = 0 then 'OK -- no public_id columns exist (safe to add)'
      else 'CONFLICT -- public_id exists on ' || string_agg(table_name, ', ')
    end as status,
    '' as detail
  from information_schema.columns
  where table_schema = 'public'
    and column_name = 'public_id'
),

-- 6. subscription_tiers has spotlight
spotlight_check as (
  select
    '06_subscriptions' as section,
    'spotlight tier exists' as check_item,
    case
      when count(*) > 0 then 'OK -- spotlight tier found'
      else 'MISSING -- no spotlight tier!'
    end as status,
    '' as detail
  from subscription_tiers
  where tier_name = 'spotlight'
),

-- 7. business_subscriptions columns
bs_columns as (
  select
    '07_subscriptions' as section,
    column_name as check_item,
    'OK' as status,
    data_type as detail
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'business_subscriptions'
    and column_name in ('business_id', 'is_in_free_trial', 'free_trial_end_date', 'tier_id')
),

-- 8. franchise_crm_configs WalletPush credentials
wp_creds as (
  select
    '08_walletpush_creds' as section,
    city as check_item,
    case
      when walletpush_api_key is not null and walletpush_template_id is not null then 'OK -- both present'
      when walletpush_api_key is null and walletpush_template_id is null then 'MISSING -- no WP credentials'
      when walletpush_api_key is null then 'PARTIAL -- api_key missing'
      else 'PARTIAL -- template_id missing'
    end as status,
    coalesce(status, 'unknown') as detail
  from franchise_crm_configs
),

-- 9. RLS enabled on key tables
rls_check as (
  select
    '09_rls' as section,
    tablename as check_item,
    case when rowsecurity then 'OK -- RLS enabled' else 'WARNING -- RLS disabled!' end as status,
    '' as detail
  from pg_tables
  where schemaname = 'public'
    and tablename in ('business_profiles', 'app_users', 'business_subscriptions', 'franchise_crm_configs')
),

-- 10. Key indexes
index_check as (
  select
    '10_indexes' as section,
    indexname as check_item,
    'OK -- exists' as status,
    tablename as detail
  from pg_indexes
  where schemaname = 'public'
    and indexname in (
      'idx_business_profiles_slug',
      'idx_business_profiles_city',
      'business_profiles_pkey',
      'app_users_pkey'
    )
),

-- 11. Data counts
data_counts as (
  select '11_data_counts' as section, 'business_profiles' as check_item, count(*)::text as status, '' as detail from business_profiles
  union all
  select '11_data_counts', 'app_users', count(*)::text, '' from app_users
  union all
  select '11_data_counts', 'business_subscriptions', count(*)::text, '' from business_subscriptions
  union all
  select '11_data_counts', 'franchise_crm_configs', count(*)::text, '' from franchise_crm_configs
  union all
  select '11_data_counts', 'subscription_tiers', count(*)::text, '' from subscription_tiers
),

-- 12. Spotlight businesses per city (potential loyalty creators)
spotlight_biz as (
  select
    '12_spotlight_businesses' as section,
    bp.city as check_item,
    count(*)::text as status,
    string_agg(bp.business_name, ', ' order by bp.business_name) as detail
  from business_profiles bp
  join business_subscriptions bs on bs.business_id = bp.id
  join subscription_tiers st on st.id = bs.tier_id
  where st.tier_name = 'spotlight'
    and bp.status = 'approved'
  group by bp.city
),

-- 13. Active users with wallet passes per city (potential loyalty members)
active_users as (
  select
    '13_active_pass_users' as section,
    city as check_item,
    count(*)::text as status,
    '' as detail
  from app_users
  where wallet_pass_id is not null
    and wallet_pass_status = 'active'
  group by city
),

-- 14. Businesses with loyalty_cards=true (ready for loyalty)
loyalty_ready as (
  select
    '14_loyalty_flag_true' as section,
    bp.business_name || ' (' || bp.city || ')' as check_item,
    coalesce(st.tier_name, 'no subscription') as status,
    case
      when st.tier_name = 'spotlight' then 'READY -- will see loyalty form on launch'
      when st.tier_name is not null then 'BLOCKED -- needs spotlight upgrade'
      else 'BLOCKED -- no subscription'
    end as detail
  from business_profiles bp
  left join business_subscriptions bs on bs.business_id = bp.id
  left join subscription_tiers st on st.id = bs.tier_id
  where bp.features->>'loyalty_cards' = 'true'
)

-- Combine all results
select section, check_item, status, detail from bp_columns
union all select * from au_columns
union all select * from dob_check
union all select * from loyalty_tables_check
union all select * from public_id_check
union all select * from spotlight_check
union all select * from bs_columns
union all select * from wp_creds
union all select * from rls_check
union all select * from index_check
union all select * from data_counts
union all select * from spotlight_biz
union all select * from active_users
union all select * from loyalty_ready
order by section, check_item;
