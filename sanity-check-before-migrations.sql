-- ============================================================================
-- PRE-FLIGHT SANITY CHECK — run BEFORE applying:
--   1) 20260722120000_add_menu_preview_to_chat_views.sql
--   2) 20260722140000_add_contact_methods_to_business_profiles.sql
-- 100% READ-ONLY. Nothing here changes data or schema.
-- Read each section's "expected" note; if anything differs, DON'T run the migration.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. menu_preview must exist AND be jsonb.
--    The new views call jsonb_array_length(menu_preview) — that ERRORS if the
--    column is missing or not jsonb.
--    EXPECTED: one row, data_type = 'jsonb'.
-- ----------------------------------------------------------------------------
select 'menu_preview type' as check, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'business_profiles'
  and column_name = 'menu_preview';


-- ----------------------------------------------------------------------------
-- 2. Every column the NEW views reference must exist on business_profiles.
--    EXPECTED: every row says '✓ present'. Any '❌ MISSING' = the view rebuild
--    would fail — stop and tell me.
-- ----------------------------------------------------------------------------
with needed(col) as (
  values
    ('id'),('business_name'),('business_tagline'),('system_category'),('display_category'),
    ('google_primary_type'),('google_types'),('business_town'),('business_address'),('phone'),
    ('website_url'),('google_place_id'),('google_reviews_highlights'),('latitude'),('longitude'),
    ('rating'),('review_count'),('city'),('business_hours'),('business_hours_structured'),
    ('status'),('menu_preview'),('auto_imported'),('business_tier'),('admin_chat_fallback_approved'),
    ('logo'),('business_images'),('additional_notes'),('visibility'),('owner_user_id'),
    ('claimed_at'),('created_at'),('updated_at')
)
select
  n.col as required_column,
  case when c.column_name is null then '❌ MISSING' else '✓ present' end as status
from needed n
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'business_profiles'
 and c.column_name = n.col
order by status, required_column;


-- ----------------------------------------------------------------------------
-- 3. Supporting tables the Tier 1 view joins must exist.
--    EXPECTED: both rows present.
-- ----------------------------------------------------------------------------
select 'join table' as check, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('business_subscriptions', 'subscription_tiers')
order by table_name;


-- ----------------------------------------------------------------------------
-- 4. Current state of the three chat views — do they already expose menu_preview?
--    EXPECTED (BEFORE migration #1):
--      lite_eligible       -> has_menu_preview = true,  has_featured_count = true
--      chat_eligible       -> false, false   (this migration adds it)
--      ai_fallback_pool    -> false, false   (this migration adds it)
--    (If chat_eligible/ai_fallback already show true, the migration was already run.)
-- ----------------------------------------------------------------------------
select
  table_name,
  bool_or(column_name = 'menu_preview')        as has_menu_preview,
  bool_or(column_name = 'featured_items_count') as has_featured_items_count
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'business_profiles_chat_eligible',
    'business_profiles_lite_eligible',
    'business_profiles_ai_fallback_pool'
  )
group by table_name
order by table_name;


-- ----------------------------------------------------------------------------
-- 5. Does anything DEPEND on the view we DROP (ai_fallback_pool) or on
--    chat_eligible? A dependent view/rule would make `drop view` fail.
--    EXPECTED: 0 rows. (Functions like the KB search RPC do NOT show here and
--    are unaffected — chat_eligible is replaced in place, not dropped.)
-- ----------------------------------------------------------------------------
select distinct
  dep_ns.nspname   as dependent_schema,
  dep_obj.relname  as dependent_object,
  src.relname      as depends_on
from pg_depend d
join pg_rewrite rw   on d.objid = rw.oid
join pg_class dep_obj on rw.ev_class = dep_obj.oid
join pg_class src     on d.refobjid = src.oid
join pg_namespace dep_ns on dep_obj.relnamespace = dep_ns.oid
where src.relname in ('business_profiles_ai_fallback_pool', 'business_profiles_chat_eligible')
  and dep_obj.relname <> src.relname
order by 1, 2;


-- ----------------------------------------------------------------------------
-- 6. Migration #2 pre-check: contact_methods and the social/phone columns it uses.
--    EXPECTED:
--      contact_methods -> NOT present (the migration adds it; harmless if already there)
--      instagram_handle, facebook_url, phone -> present
-- ----------------------------------------------------------------------------
with needed(col) as (
  values ('contact_methods'), ('instagram_handle'), ('facebook_url'), ('phone')
)
select
  n.col as column_name,
  case when c.column_name is null then 'not present' else 'present' end as state
from needed n
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'business_profiles'
 and c.column_name = n.col
order by n.col;


-- ----------------------------------------------------------------------------
-- 7. Impact preview — how many businesses benefit from migration #1.
--    Shows current Tier 3 pool size and how many unclaimed listings already have
--    featured items that will become AI-searchable once the view is updated.
-- ----------------------------------------------------------------------------
select
  (select count(*) from business_profiles_ai_fallback_pool)                    as tier3_pool_now,
  (select count(*) from business_profiles
     where status = 'unclaimed' and auto_imported = true
       and coalesce(jsonb_array_length(menu_preview), 0) > 0)                   as unclaimed_with_items,
  (select count(*) from business_profiles
     where status = 'unclaimed' and auto_imported = true
       and admin_chat_fallback_approved = true
       and coalesce(jsonb_array_length(menu_preview), 0) > 0)                   as ai_eligible_with_items;
