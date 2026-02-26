-- Loyalty System V1 -- Post-Migration Sanity Check
-- Run this in Supabase SQL Editor AFTER running the loyalty migration.
-- SELECT-only. Zero writes. Zero risk.
-- Single query -- all results in one table.

with

-- 1. Check all 5 loyalty tables exist
tables_exist as (
  select
    '01_tables_exist' as section,
    t.expected as check_item,
    case when i.table_name is not null then 'OK' else 'MISSING' end as status,
    coalesce(i.table_name, 'NOT FOUND') as detail
  from (
    values
      ('loyalty_programs'),
      ('loyalty_pass_requests'),
      ('loyalty_memberships'),
      ('loyalty_earn_events'),
      ('loyalty_redemptions')
  ) as t(expected)
  left join information_schema.tables i
    on i.table_schema = 'public'
    and i.table_name = t.expected
),

-- 2. Check loyalty_programs columns
lp_columns as (
  select
    '02_loyalty_programs_cols' as section,
    t.col as check_item,
    case when c.column_name is not null then 'OK' else 'MISSING' end as status,
    coalesce(c.data_type || coalesce(' ' || c.character_maximum_length::text, ''), 'NOT FOUND') as detail
  from (
    values
      ('id'), ('business_id'), ('public_id'), ('program_name'), ('type'),
      ('reward_threshold'), ('reward_description'), ('stamp_label'), ('earn_mode'),
      ('stamp_icon'), ('earn_instructions'), ('redeem_instructions'),
      ('primary_color'), ('background_color'), ('logo_url'), ('logo_description'),
      ('strip_image_url'), ('strip_image_description'), ('terms_and_conditions'),
      ('status'), ('walletpush_template_id'), ('walletpush_api_key'),
      ('walletpush_pass_type_id'), ('counter_qr_token'), ('previous_counter_qr_token'),
      ('counter_qr_token_rotated_at'), ('timezone'), ('max_earns_per_day'),
      ('min_gap_minutes'), ('birthday_bonus_enabled'), ('birthday_bonus_reward'),
      ('birthday_bonus_valid_days'), ('premium_flags'), ('city'),
      ('created_at'), ('updated_at')
  ) as t(col)
  left join information_schema.columns c
    on c.table_schema = 'public'
    and c.table_name = 'loyalty_programs'
    and c.column_name = t.col
),

-- 3. Check loyalty_pass_requests columns
lpr_columns as (
  select
    '03_pass_requests_cols' as section,
    t.col as check_item,
    case when c.column_name is not null then 'OK' else 'MISSING' end as status,
    coalesce(c.data_type, 'NOT FOUND') as detail
  from (
    values
      ('id'), ('business_id'), ('design_spec_json'), ('status'),
      ('rejection_reason'), ('walletpush_template_id'), ('walletpush_api_key'),
      ('walletpush_pass_type_id'), ('reviewed_by_admin_id'), ('created_at')
  ) as t(col)
  left join information_schema.columns c
    on c.table_schema = 'public'
    and c.table_name = 'loyalty_pass_requests'
    and c.column_name = t.col
),

-- 4. Check loyalty_memberships columns
lm_columns as (
  select
    '04_memberships_cols' as section,
    t.col as check_item,
    case when c.column_name is not null then 'OK' else 'MISSING' end as status,
    coalesce(c.data_type, 'NOT FOUND') as detail
  from (
    values
      ('id'), ('program_id'), ('user_wallet_pass_id'), ('stamps_balance'),
      ('points_balance'), ('total_earned'), ('total_redeemed'), ('last_earned_at'),
      ('earned_today_count'), ('earned_today_date'), ('joined_at'),
      ('walletpush_serial'), ('status'), ('last_active_at'),
      ('birthday_bonus_redeemed_year'), ('created_at')
  ) as t(col)
  left join information_schema.columns c
    on c.table_schema = 'public'
    and c.table_name = 'loyalty_memberships'
    and c.column_name = t.col
),

-- 5. Check loyalty_earn_events columns
lee_columns as (
  select
    '05_earn_events_cols' as section,
    t.col as check_item,
    case when c.column_name is not null then 'OK' else 'MISSING' end as status,
    coalesce(c.data_type, 'NOT FOUND') as detail
  from (
    values
      ('id'), ('membership_id'), ('business_id'), ('user_wallet_pass_id'),
      ('earned_at'), ('method'), ('ip_hash'), ('geo_hash'),
      ('valid'), ('reason_if_invalid')
  ) as t(col)
  left join information_schema.columns c
    on c.table_schema = 'public'
    and c.table_name = 'loyalty_earn_events'
    and c.column_name = t.col
),

-- 6. Check loyalty_redemptions columns
lr_columns as (
  select
    '06_redemptions_cols' as section,
    t.col as check_item,
    case when c.column_name is not null then 'OK' else 'MISSING' end as status,
    coalesce(c.data_type, 'NOT FOUND') as detail
  from (
    values
      ('id'), ('membership_id'), ('business_id'), ('user_wallet_pass_id'),
      ('reward_description'), ('status'), ('consumed_at'), ('display_expires_at'),
      ('stamps_deducted'), ('flagged_at'), ('flagged_reason'), ('created_at')
  ) as t(col)
  left join information_schema.columns c
    on c.table_schema = 'public'
    and c.table_name = 'loyalty_redemptions'
    and c.column_name = t.col
),

-- 7. Check date_of_birth was added to app_users
dob_check as (
  select
    '07_app_users_dob' as section,
    'date_of_birth' as check_item,
    case when c.column_name is not null then 'OK' else 'MISSING' end as status,
    coalesce(c.data_type, 'NOT FOUND') as detail
  from (values (1)) as v(x)
  left join information_schema.columns c
    on c.table_schema = 'public'
    and c.table_name = 'app_users'
    and c.column_name = 'date_of_birth'
),

-- 8. Check RLS is enabled on all 5 tables
rls_check as (
  select
    '08_rls_enabled' as section,
    t.expected as check_item,
    case when c.rowsecurity then 'OK' else 'RLS DISABLED' end as status,
    case when c.rowsecurity then 'enabled' else 'DISABLED' end as detail
  from (
    values
      ('loyalty_programs'),
      ('loyalty_pass_requests'),
      ('loyalty_memberships'),
      ('loyalty_earn_events'),
      ('loyalty_redemptions')
  ) as t(expected)
  left join pg_tables c
    on c.schemaname = 'public'
    and c.tablename = t.expected
),

-- 9. Check RLS policies exist (count per table)
rls_policies as (
  select
    '09_rls_policies' as section,
    t.expected as check_item,
    case
      when t.expected = 'loyalty_programs' and count(p.policyname) >= 3 then 'OK (' || count(p.policyname) || ' policies)'
      when t.expected = 'loyalty_pass_requests' and count(p.policyname) >= 2 then 'OK (' || count(p.policyname) || ' policies)'
      when t.expected = 'loyalty_memberships' and count(p.policyname) >= 1 then 'OK (' || count(p.policyname) || ' policies)'
      when t.expected = 'loyalty_earn_events' and count(p.policyname) >= 1 then 'OK (' || count(p.policyname) || ' policies)'
      when t.expected = 'loyalty_redemptions' and count(p.policyname) >= 2 then 'OK (' || count(p.policyname) || ' policies)'
      else 'MISSING (' || count(p.policyname) || ' found)'
    end as status,
    string_agg(p.policyname, ', ' order by p.policyname) as detail
  from (
    values
      ('loyalty_programs'),
      ('loyalty_pass_requests'),
      ('loyalty_memberships'),
      ('loyalty_earn_events'),
      ('loyalty_redemptions')
  ) as t(expected)
  left join pg_policies p
    on p.schemaname = 'public'
    and p.tablename = t.expected
  group by t.expected
),

-- 10. Check unique constraints
unique_constraints as (
  select
    '10_unique_constraints' as section,
    t.expected as check_item,
    case when tc.constraint_name is not null then 'OK' else 'MISSING' end as status,
    coalesce(tc.constraint_name, 'NOT FOUND') as detail
  from (
    values
      ('loyalty_programs_business_id_unique'),
      ('loyalty_programs_public_id_unique'),
      ('loyalty_memberships_program_user_unique')
  ) as t(expected)
  left join information_schema.table_constraints tc
    on tc.constraint_schema = 'public'
    and tc.constraint_name = t.expected
    and tc.constraint_type = 'UNIQUE'
),

-- 11. Check indexes exist
indexes_check as (
  select
    '11_indexes' as section,
    t.expected as check_item,
    case when i.indexname is not null then 'OK' else 'MISSING' end as status,
    coalesce(i.indexname, 'NOT FOUND') as detail
  from (
    values
      ('idx_loyalty_programs_city_status'),
      ('idx_loyalty_pass_requests_status'),
      ('idx_loyalty_pass_requests_business'),
      ('idx_loyalty_memberships_user'),
      ('idx_loyalty_memberships_program_status'),
      ('idx_loyalty_earn_events_membership_time'),
      ('idx_loyalty_earn_events_business_time'),
      ('idx_loyalty_earn_events_ip'),
      ('idx_loyalty_redemptions_membership'),
      ('idx_loyalty_redemptions_business')
  ) as t(expected)
  left join pg_indexes i
    on i.schemaname = 'public'
    and i.indexname = t.expected
),

-- 12. Check foreign keys
fk_check as (
  select
    '12_foreign_keys' as section,
    tc.table_name || '.' || kcu.column_name as check_item,
    'OK' as status,
    ccu.table_name || '(' || ccu.column_name || ')' as detail
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
    and kcu.table_schema = tc.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
    and ccu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and tc.table_name in (
      'loyalty_programs', 'loyalty_pass_requests',
      'loyalty_memberships', 'loyalty_earn_events', 'loyalty_redemptions'
    )
),

-- 13. Check table comments exist
comments_check as (
  select
    '13_table_comments' as section,
    c.relname as check_item,
    case when d.description is not null then 'OK' else 'NO COMMENT' end as status,
    left(coalesce(d.description, 'none'), 80) as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_description d on d.objoid = c.oid and d.objsubid = 0
  where n.nspname = 'public'
    and c.relname in (
      'loyalty_programs', 'loyalty_pass_requests',
      'loyalty_memberships', 'loyalty_earn_events', 'loyalty_redemptions'
    )
    and c.relkind = 'r'
),

-- 14. Summary counts
summary as (
  select
    '14_summary' as section,
    'total_loyalty_tables' as check_item,
    count(*)::text || ' tables' as status,
    string_agg(table_name, ', ' order by table_name) as detail
  from information_schema.tables
  where table_schema = 'public'
    and table_name like 'loyalty_%'
)

-- Combine all checks
select section, check_item, status, detail from tables_exist
union all select * from lp_columns
union all select * from lpr_columns
union all select * from lm_columns
union all select * from lee_columns
union all select * from lr_columns
union all select * from dob_check
union all select * from rls_check
union all select * from rls_policies
union all select * from unique_constraints
union all select * from indexes_check
union all select * from fk_check
union all select * from comments_check
union all select * from summary
order by section, check_item;
