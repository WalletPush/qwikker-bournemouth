-- ============================================================================
-- Broaden Tier 2 (claimed-free) chat eligibility + allow plan='free'
-- ============================================================================
-- BUG (Zanzibar, Aug 10 2026): claimed businesses invisible to AI chat.
-- Applied manually to prod SQL editor the same night; kept here for repo history.
--
-- Causes:
-- 1) T1 requires status=approved; admin Starter left claimed_free
-- 2) T2 required menu_preview >= 1 — free claims often have offer/desc only
-- 3) profiles_plan_check blocked plan='free' (legacy constraint name)
--
-- Fix: broaden T2 WHERE; allow plan free|starter|featured|spotlight|pro.
-- ============================================================================

-- Allow Free Listing plan label (prod still had profiles_plan_check without 'free')
alter table public.business_profiles
  drop constraint if exists profiles_plan_check;
alter table public.business_profiles
  drop constraint if exists business_profiles_plan_check;
alter table public.business_profiles
  add constraint business_profiles_plan_check
  check (plan in ('free', 'starter', 'featured', 'spotlight', 'pro'));

drop view if exists public.business_profiles_lite_eligible;

create view public.business_profiles_lite_eligible as
select
  bp.id,
  bp.business_name,
  bp.business_tagline,
  bp.business_description,
  bp.system_category,
  bp.display_category,
  bp.google_primary_type,
  bp.google_types,
  bp.business_town,
  bp.business_address,
  bp.phone,
  bp.website_url,
  bp.google_place_id,
  bp.latitude,
  bp.longitude,
  bp.rating,
  bp.review_count,
  bp.city,
  bp.status,
  bp.business_hours,
  bp.business_hours_structured,
  bp.menu_preview,
  case
    when bp.menu_preview is null then 0
    else jsonb_array_length(bp.menu_preview)
  end as featured_items_count,
  (
    select count(*)::integer
    from public.business_offers o
    where o.business_id = bp.id
      and o.status = 'approved'
      and (o.offer_end_date is null or o.offer_end_date >= now())
  ) as approved_offers_count
from public.business_profiles bp
where
  bp.status = 'claimed_free'
  and bp.city is not null
  and bp.latitude is not null
  and bp.longitude is not null
  and (
    (bp.menu_preview is not null and jsonb_array_length(bp.menu_preview) >= 1)
    or exists (
      select 1
      from public.business_offers o
      where o.business_id = bp.id
        and o.status = 'approved'
        and (o.offer_end_date is null or o.offer_end_date >= now())
    )
    or (
      bp.business_description is not null
      and length(trim(bp.business_description)) >= 40
    )
  );

comment on view public.business_profiles_lite_eligible is
  'Tier 2: Claimed-free businesses visible in chat (text). Eligible if they have featured items, a live approved offer, or a real description. Status=claimed_free is the gate (no business_tier=free_tier requirement).';

grant select on public.business_profiles_lite_eligible to authenticated, anon, service_role;
