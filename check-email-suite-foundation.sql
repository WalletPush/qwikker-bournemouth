-- Email Suite foundation sanity check (single result set)
-- Run in Supabase SQL editor after applying:
--   supabase/migrations/20260808120000_email_suite_foundation.sql
-- Expect status = ✅ PASS for schema checks.
-- City webhook rows may show ⚠️ until you paste whsec_ in City Config.

select * from (
  -- 1) Tables exist
  select
    1 as sort_order,
    'tables' as section,
    t.table_name as check_name,
    case when c.relname is not null then '✅ PASS' else '❌ MISSING' end as status,
    null::text as detail
  from (
    values
      ('email_send_batches'),
      ('email_campaigns'),
      ('email_automations'),
      ('email_sends'),
      ('email_send_events'),
      ('email_suppressions')
  ) as t(table_name)
  left join pg_class c
    on c.relname = t.table_name
   and c.relkind = 'r'
   and c.relnamespace = 'public'::regnamespace

  union all

  -- 2) RLS enabled
  select
    2,
    'rls',
    c.relname,
    case when c.relrowsecurity then '✅ PASS' else '❌ RLS OFF' end,
    null
  from pg_class c
  where c.relnamespace = 'public'::regnamespace
    and c.relkind = 'r'
    and c.relname in (
      'email_send_batches',
      'email_campaigns',
      'email_automations',
      'email_sends',
      'email_send_events',
      'email_suppressions'
    )

  union all

  -- 3) Indexes
  select
    3,
    'indexes',
    i.index_name,
    case when ic.indexname is not null then '✅ PASS' else '❌ MISSING' end,
    null
  from (
    values
      ('email_send_batches_city_created_idx'),
      ('email_campaigns_city_created_idx'),
      ('email_sends_city_sent_idx'),
      ('email_sends_business_idx'),
      ('email_sends_resend_id_idx'),
      ('email_sends_thread_idx'),
      ('email_sends_campaign_idx'),
      ('email_send_events_send_idx'),
      ('email_send_events_resend_idx'),
      ('email_send_events_dedupe_idx'),
      ('email_suppressions_city_email_idx')
  ) as i(index_name)
  left join pg_indexes ic
    on ic.schemaname = 'public'
   and ic.indexname = i.index_name

  union all

  -- 4) email_sends columns
  select
    4,
    'email_sends_columns',
    col,
    case when exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'email_sends'
        and c.column_name = col
    ) then '✅ PASS' else '❌ MISSING' end,
    null
  from (
    values
      ('city'),
      ('business_id'),
      ('direction'),
      ('to_email'),
      ('subject'),
      ('html_body'),
      ('template_key'),
      ('category'),
      ('resend_message_id'),
      ('status'),
      ('campaign_id'),
      ('batch_id'),
      ('thread_id'),
      ('html_purge_after')
  ) as cols(col)

  union all

  -- 5) webhook secret column
  select
    5,
    'franchise_crm_configs',
    'resend_webhook_secret',
    case when exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'franchise_crm_configs'
        and c.column_name = 'resend_webhook_secret'
    ) then '✅ PASS' else '❌ MISSING' end,
    null

  union all

  -- 6) FK batches → campaigns
  select
    6,
    'constraints',
    'email_send_batches_campaign_id_fkey',
    case when exists (
      select 1 from pg_constraint where conname = 'email_send_batches_campaign_id_fkey'
    ) then '✅ PASS' else '❌ MISSING' end,
    null

  union all

  -- 7) Unique automations (city, automation_key)
  select
    7,
    'constraints',
    'email_automations unique (city, automation_key)',
    case when exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relname = 'email_automations'
        and c.contype = 'u'
        and pg_get_constraintdef(c.oid) ilike '%city%automation_key%'
    ) then '✅ PASS' else '❌ MISSING' end,
    null

  union all

  -- 8) Unique suppressions (city, email, scope)
  select
    8,
    'constraints',
    'email_suppressions unique (city, email, scope)',
    case when exists (
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relname = 'email_suppressions'
        and c.contype = 'u'
        and pg_get_constraintdef(c.oid) ilike '%city%email%scope%'
    ) then '✅ PASS' else '❌ MISSING' end,
    null

  union all

  -- 9) Per-city Resend readiness
  select
    9,
    'city_resend',
    f.city,
    case
      when f.resend_api_key is not null and f.resend_api_key <> ''
       and f.resend_from_email is not null and f.resend_from_email <> ''
      then '✅ send ready'
      else '❌ send not configured'
    end,
    case
      when f.resend_webhook_secret is not null and f.resend_webhook_secret <> ''
      then 'webhook secret saved'
      else '⚠️ webhook secret empty — paste whsec_ in City Config'
    end
  from public.franchise_crm_configs f

  union all

  -- 10) Smoke counts
  select
    10,
    'counts',
    'email_sends',
    (select count(*)::text from public.email_sends),
    'fresh install usually 0'
  union all
  select
    10,
    'counts',
    'email_send_events',
    (select count(*)::text from public.email_send_events),
    null
  union all
  select
    10,
    'counts',
    'email_campaigns',
    (select count(*)::text from public.email_campaigns),
    null
  union all
  select
    10,
    'counts',
    'email_automations',
    (select count(*)::text from public.email_automations),
    null
  union all
  select
    10,
    'counts',
    'email_suppressions',
    (select count(*)::text from public.email_suppressions),
    null
  union all
  select
    10,
    'counts',
    'automations_enabled',
    (select count(*)::text from public.email_automations where enabled = true),
    'should be 0 unless digests intentionally enabled'
) checks
order by sort_order, section, check_name;
