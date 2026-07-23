-- ============================================================================
-- SANITY CHECK: featured items — price capture + AI chat visibility
-- ============================================================================
-- Read-only. Run BEFORE applying 20260722120000_add_menu_preview_to_chat_views.sql
-- to confirm the diagnosis, then run again AFTER to confirm the fix.
-- Change :city below if you're not checking bournemouth.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Do the chat views already expose menu_preview? (Problem 2 root cause)
--    BEFORE fix: expect lite_eligible = yes; chat_eligible + fallback_pool = NO rows.
--    AFTER fix:  expect all three to list menu_preview + featured_items_count.
-- ----------------------------------------------------------------------------
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'business_profiles_chat_eligible',      -- tier 1 (paid/trial)
    'business_profiles_lite_eligible',      -- tier 2 (claimed_free)
    'business_profiles_ai_fallback_pool'    -- tier 3 (unclaimed, admin-approved)
  )
  and column_name in ('menu_preview', 'featured_items_count')
order by table_name, column_name;


-- ----------------------------------------------------------------------------
-- 2. Unclaimed businesses with featured items — are they AI-eligible? (the gate)
--    "has_items" = enrichment wrote featured items to the live listing.
--    "ai_eligible" = admin toggled it into the Tier 3 chat pool.
--    A business needs BOTH true to have its items surfaced by chat after the fix.
-- ----------------------------------------------------------------------------
select
  count(*)                                                              as unclaimed_total,
  count(*) filter (where coalesce(jsonb_array_length(menu_preview),0) > 0) as with_items,
  count(*) filter (where admin_chat_fallback_approved = true)          as ai_eligible,
  count(*) filter (
    where coalesce(jsonb_array_length(menu_preview),0) > 0
      and admin_chat_fallback_approved = true
  )                                                                    as items_and_eligible
from business_profiles
where lower(city) = 'bournemouth'
  and status = 'unclaimed'
  and auto_imported = true;


-- ----------------------------------------------------------------------------
-- 3. Sample the actual featured items + PRICES on unclaimed listings (Problem 1)
--    BEFORE fix: expect price to be '' / null for enrichment-published items.
--    AFTER re-enrich: expect real prices where the source showed them.
-- ----------------------------------------------------------------------------
select
  bp.business_name,
  bp.status,
  bp.admin_chat_fallback_approved                      as ai_eligible,
  coalesce(jsonb_array_length(bp.menu_preview), 0)     as item_count,
  item->>'name'                                        as item_name,
  item->>'price'                                       as item_price,   -- '' or null = no price captured
  left(coalesce(item->>'description',''), 60)          as item_desc
from business_profiles bp
cross join lateral jsonb_array_elements(coalesce(bp.menu_preview, '[]'::jsonb)) as item
where lower(bp.city) = 'bournemouth'
  and bp.status = 'unclaimed'
  and bp.auto_imported = true
  and jsonb_array_length(coalesce(bp.menu_preview, '[]'::jsonb)) > 0
order by bp.business_name
limit 40;


-- ----------------------------------------------------------------------------
-- 4. Would these items actually reach chat RIGHT NOW via the Tier 3 view?
--    BEFORE fix: this errors ("column menu_preview does not exist") OR returns
--    rows with no menu column — proving the items can't reach the AI.
--    AFTER fix: returns the businesses with their menu_preview populated.
--    (Comment this block out on the BEFORE run if the missing column errors.)
-- ----------------------------------------------------------------------------
select
  business_name,
  featured_items_count,
  menu_preview
from business_profiles_ai_fallback_pool
where lower(city) = 'bournemouth'
  and featured_items_count > 0
order by business_name
limit 20;


-- ----------------------------------------------------------------------------
-- 5. Enrichment publish audit — which businesses were published, and when.
--    Confirms the enrich→publish path actually wrote menu_preview.
-- ----------------------------------------------------------------------------
select
  bp.business_name,
  be.published_at,
  coalesce(jsonb_array_length(bp.menu_preview), 0) as live_item_count,
  jsonb_array_length(be.draft->'listing'->'featured_items') as draft_item_count
from business_enrichments be
join business_profiles bp on bp.id = be.business_id
where lower(bp.city) = 'bournemouth'
order by be.published_at desc nulls last
limit 30;
