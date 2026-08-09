-- Migration: media_assets + hero/offer media pointers (hardened)
-- Purpose: Canonical franchise media library. Hero/offer roles are pointers,
--   not asset_type. Soft archive. Presentation metadata (focal/fit/gravity)
--   lives on the asset; Cloudinary renders.
-- Integrity: crop bounds, ownership checks, pointer validation triggers,
--   provider detection, null-city guards, deterministic backfill, partial uniques.
-- Category selection: selected category tile image id lives in
--   franchise_crm_configs.landing_page_config.category_tiles.images[cat].media_id
--   (not a second pointer column on media_assets).
-- Date: 2026-08-09 21:00:00 UTC

-- ---------------------------------------------------------------------------
-- media_assets
-- ---------------------------------------------------------------------------
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  business_id uuid references public.business_profiles(id) on delete set null,
  offer_id uuid references public.business_offers(id) on delete set null,
  source_url text not null,
  provider text not null default 'external'
    check (provider in ('cloudinary', 'external')),
  provider_public_id text,
  asset_type text not null
    check (asset_type in ('business_photo', 'logo', 'offer_artwork', 'category_image')),
  sort_order integer not null default 0,
  -- Focal points are normalized 0–1 (Cloudinary g_xy_center), not 0–100.
  focal_x numeric(6,4) default null
    check (focal_x is null or (focal_x >= 0 and focal_x <= 1)),
  focal_y numeric(6,4) default null
    check (focal_y is null or (focal_y >= 0 and focal_y <= 1)),
  zoom numeric(6,3) not null default 1
    check (zoom >= 1 and zoom <= 5),
  fit text not null default 'cover'
    check (fit in ('cover', 'contain')),
  gravity_mode text not null default 'auto'
    check (gravity_mode in ('auto', 'centre', 'manual')),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  review_status text not null default 'approved'
    check (review_status in ('pending', 'approved', 'rejected')),
  archived_at timestamptz,
  -- Deliberately unconstrained UUIDs: franchise admins may be city_admins /
  -- service-role actions; not every actor has an auth.users row.
  archived_by uuid,
  uploaded_by uuid,
  curated_by uuid,
  category_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Manual gravity requires both focal coords
  constraint media_assets_manual_focal_check check (
    gravity_mode <> 'manual'
    or (focal_x is not null and focal_y is not null)
  ),

  -- Ownership / type shape
  constraint media_assets_ownership_check check (
    (
      asset_type in ('business_photo', 'logo')
      and business_id is not null
      and offer_id is null
      and category_key is null
    )
    or (
      asset_type = 'offer_artwork'
      and business_id is not null
      and offer_id is not null
      and category_key is null
    )
    or (
      asset_type = 'category_image'
      and category_key is not null
      and offer_id is null
    )
  )
);

comment on table public.media_assets is
  'Franchise media library. Roles (hero/offer display) are pointers on profiles/offers, not asset_type. Category selection lives in landing_page_config.';

comment on column public.media_assets.focal_x is
  'Normalized focal X in [0,1] for Cloudinary g_xy_center. Null when gravity_mode is auto/centre.';

comment on column public.media_assets.zoom is
  'Presentation zoom in [1,5]. Default 1 = no extra zoom.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_media_assets_city_business
  on public.media_assets (city, business_id)
  where status = 'active';

create index if not exists idx_media_assets_city_offer
  on public.media_assets (city, offer_id)
  where status = 'active';

create index if not exists idx_media_assets_city_category
  on public.media_assets (city, category_key)
  where asset_type = 'category_image' and status = 'active';

create index if not exists idx_media_assets_review_pending
  on public.media_assets (city, review_status)
  where review_status = 'pending' and status = 'active';

-- Partial uniques: allow re-upload after archive (archived rows excluded)
create unique index if not exists uq_media_assets_active_business_url
  on public.media_assets (business_id, source_url, asset_type)
  where status = 'active'
    and business_id is not null
    and asset_type in ('business_photo', 'logo');

create unique index if not exists uq_media_assets_active_offer_url
  on public.media_assets (offer_id, source_url, asset_type)
  where status = 'active'
    and offer_id is not null
    and asset_type = 'offer_artwork';

create unique index if not exists uq_media_assets_active_category_url
  on public.media_assets (city, category_key, source_url)
  where status = 'active'
    and asset_type = 'category_image'
    and category_key is not null;

-- ---------------------------------------------------------------------------
-- Offer ownership: offer_artwork.business_id must match the offer's business
-- ---------------------------------------------------------------------------
create or replace function public.media_assets_enforce_offer_ownership()
returns trigger
language plpgsql
as $$
declare
  offer_business uuid;
  offer_city text;
begin
  if new.offer_id is null then
    return new;
  end if;

  select o.business_id, bp.city
    into offer_business, offer_city
  from public.business_offers o
  join public.business_profiles bp on bp.id = o.business_id
  where o.id = new.offer_id;

  if offer_business is null then
    raise exception 'media_assets: offer_id % not found or missing business', new.offer_id;
  end if;

  if new.business_id is distinct from offer_business then
    raise exception 'media_assets: business_id (%) must match offer (%) business (%)',
      new.business_id, new.offer_id, offer_business;
  end if;

  if offer_city is not null and new.city is distinct from offer_city then
    raise exception 'media_assets: city (%) must match offer business city (%)',
      new.city, offer_city;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_media_assets_offer_ownership on public.media_assets;
create trigger trg_media_assets_offer_ownership
  before insert or update of offer_id, business_id, city
  on public.media_assets
  for each row
  execute function public.media_assets_enforce_offer_ownership();

-- ---------------------------------------------------------------------------
-- Business photo/logo city must match the business profile city
-- ---------------------------------------------------------------------------
create or replace function public.media_assets_enforce_business_city()
returns trigger
language plpgsql
as $$
declare
  biz_city text;
begin
  if new.business_id is null then
    return new;
  end if;

  select city into biz_city
  from public.business_profiles
  where id = new.business_id;

  if biz_city is null then
    raise exception 'media_assets: business_id % not found or has null city', new.business_id;
  end if;

  if new.city is distinct from biz_city then
    raise exception 'media_assets: city (%) must match business city (%)',
      new.city, biz_city;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_media_assets_business_city on public.media_assets;
create trigger trg_media_assets_business_city
  before insert or update of business_id, city
  on public.media_assets
  for each row
  execute function public.media_assets_enforce_business_city();

-- ---------------------------------------------------------------------------
-- Pointers on profiles / offers
-- ---------------------------------------------------------------------------
alter table public.business_profiles
  add column if not exists hero_media_id uuid references public.media_assets(id) on delete set null;

alter table public.business_offers
  add column if not exists offer_media_id uuid references public.media_assets(id) on delete set null;

create index if not exists idx_business_profiles_hero_media
  on public.business_profiles (hero_media_id)
  where hero_media_id is not null;

create index if not exists idx_business_offers_offer_media
  on public.business_offers (offer_media_id)
  where offer_media_id is not null;

-- ---------------------------------------------------------------------------
-- Hero pointer: same business + city + active + approved
-- ---------------------------------------------------------------------------
create or replace function public.validate_hero_media_pointer()
returns trigger
language plpgsql
as $$
declare
  asset record;
begin
  if new.hero_media_id is null then
    return new;
  end if;

  select
    m.id,
    m.business_id,
    m.city,
    m.status,
    m.review_status,
    m.asset_type
  into asset
  from public.media_assets m
  where m.id = new.hero_media_id;

  if asset.id is null then
    raise exception 'hero_media_id % does not exist', new.hero_media_id;
  end if;

  if asset.business_id is distinct from new.id then
    raise exception 'hero_media_id % does not belong to business %', new.hero_media_id, new.id;
  end if;

  if asset.city is distinct from new.city then
    raise exception 'hero_media_id % city (%) does not match business city (%)',
      new.hero_media_id, asset.city, new.city;
  end if;

  if asset.status <> 'active' or asset.review_status <> 'approved' then
    raise exception 'hero_media_id % must be active and approved (status=%, review=%)',
      new.hero_media_id, asset.status, asset.review_status;
  end if;

  if asset.asset_type not in ('business_photo', 'logo') then
    raise exception 'hero_media_id % must be business_photo or logo (got %)',
      new.hero_media_id, asset.asset_type;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_hero_media_pointer on public.business_profiles;
create trigger trg_validate_hero_media_pointer
  before insert or update of hero_media_id
  on public.business_profiles
  for each row
  execute function public.validate_hero_media_pointer();

-- ---------------------------------------------------------------------------
-- Offer pointer: same offer + business + city + active + approved
-- ---------------------------------------------------------------------------
create or replace function public.validate_offer_media_pointer()
returns trigger
language plpgsql
as $$
declare
  asset record;
  biz_city text;
begin
  if new.offer_media_id is null then
    return new;
  end if;

  select
    m.id,
    m.business_id,
    m.offer_id,
    m.city,
    m.status,
    m.review_status,
    m.asset_type
  into asset
  from public.media_assets m
  where m.id = new.offer_media_id;

  if asset.id is null then
    raise exception 'offer_media_id % does not exist', new.offer_media_id;
  end if;

  if asset.offer_id is distinct from new.id then
    raise exception 'offer_media_id % does not belong to offer %', new.offer_media_id, new.id;
  end if;

  if asset.business_id is distinct from new.business_id then
    raise exception 'offer_media_id % business (%) does not match offer business (%)',
      new.offer_media_id, asset.business_id, new.business_id;
  end if;

  select city into biz_city
  from public.business_profiles
  where id = new.business_id;

  if biz_city is not null and asset.city is distinct from biz_city then
    raise exception 'offer_media_id % city (%) does not match business city (%)',
      new.offer_media_id, asset.city, biz_city;
  end if;

  if asset.status <> 'active' or asset.review_status <> 'approved' then
    raise exception 'offer_media_id % must be active and approved (status=%, review=%)',
      new.offer_media_id, asset.status, asset.review_status;
  end if;

  if asset.asset_type <> 'offer_artwork' then
    raise exception 'offer_media_id % must be offer_artwork (got %)',
      new.offer_media_id, asset.asset_type;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_offer_media_pointer on public.business_offers;
create trigger trg_validate_offer_media_pointer
  before insert or update of offer_media_id
  on public.business_offers
  for each row
  execute function public.validate_offer_media_pointer();

-- Block archiving an asset that is currently selected as hero or offer media
create or replace function public.media_assets_block_archive_if_selected()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'archived' and old.status is distinct from 'archived' then
    if exists (
      select 1 from public.business_profiles bp
      where bp.hero_media_id = old.id
    ) then
      raise exception 'Cannot archive media_assets %: it is the selected hero_media_id', old.id;
    end if;
    if exists (
      select 1 from public.business_offers o
      where o.offer_media_id = old.id
    ) then
      raise exception 'Cannot archive media_assets %: it is the selected offer_media_id', old.id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_media_assets_block_archive on public.media_assets;
create trigger trg_media_assets_block_archive
  before update of status
  on public.media_assets
  for each row
  execute function public.media_assets_block_archive_if_selected();

-- ---------------------------------------------------------------------------
-- RLS: service-role / server routes only (same pattern as wedding_photos).
-- ---------------------------------------------------------------------------
alter table public.media_assets enable row level security;

-- ---------------------------------------------------------------------------
-- Helper: detect provider from URL
-- ---------------------------------------------------------------------------
-- (inlined in inserts below via CASE)

-- ---------------------------------------------------------------------------
-- Backfill: business_images[] → media_assets (preserve sort_order)
-- ---------------------------------------------------------------------------
insert into public.media_assets (
  city, business_id, source_url, provider, asset_type, sort_order,
  gravity_mode, fit, status, review_status, zoom
)
select
  e.city,
  e.business_id,
  e.source_url,
  case
    when e.source_url like '%res.cloudinary.com/%' then 'cloudinary'
    else 'external'
  end,
  'business_photo',
  e.sort_order,
  'auto',
  'cover',
  'active',
  'approved',
  1
from (
  select
    bp.id as business_id,
    bp.city,
    img.url as source_url,
    (img.ord - 1)::integer as sort_order
  from public.business_profiles bp
  cross join lateral unnest(coalesce(bp.business_images, '{}'::text[]))
    with ordinality as img(url, ord)
  where bp.city is not null
    and length(trim(bp.city)) > 0
    and img.url is not null
    and length(trim(img.url)) > 0
) e
where not exists (
  select 1 from public.media_assets m
  where m.business_id = e.business_id
    and m.source_url = e.source_url
    and m.asset_type = 'business_photo'
    and m.status = 'active'
);

-- Deterministic hero pointer from first active approved photo
update public.business_profiles bp
set hero_media_id = first_asset.id
from (
  select distinct on (business_id) id, business_id
  from public.media_assets
  where asset_type = 'business_photo'
    and status = 'active'
    and review_status = 'approved'
  order by business_id, sort_order asc, created_at asc, id asc
) as first_asset
where bp.id = first_asset.business_id
  and bp.hero_media_id is null
  and bp.city is not null;

-- Custom placeholders → media_assets + hero when still unset
insert into public.media_assets (
  city, business_id, source_url, provider, asset_type, sort_order,
  gravity_mode, fit, status, review_status, zoom
)
select
  c.city,
  c.business_id,
  c.source_url,
  case
    when c.source_url like '%res.cloudinary.com/%' then 'cloudinary'
    else 'external'
  end,
  'business_photo',
  0,
  'auto',
  'cover',
  'active',
  'approved',
  1
from (
  select
    id as business_id,
    city,
    placeholder_custom_url as source_url
  from public.business_profiles
  where placeholder_custom_url is not null
    and length(trim(placeholder_custom_url)) > 0
    and hero_media_id is null
    and city is not null
    and length(trim(city)) > 0
) c
where not exists (
  select 1 from public.media_assets m
  where m.business_id = c.business_id
    and m.source_url = c.source_url
    and m.asset_type = 'business_photo'
    and m.status = 'active'
);

-- Deterministic hero from any active approved photo (includes custom placeholders)
update public.business_profiles bp
set hero_media_id = first_asset.id
from (
  select distinct on (business_id) id, business_id
  from public.media_assets
  where asset_type = 'business_photo'
    and status = 'active'
    and review_status = 'approved'
  order by business_id, sort_order asc, created_at asc, id asc
) as first_asset
where bp.id = first_asset.business_id
  and bp.hero_media_id is null
  and bp.city is not null;

-- Offer images → media_assets + offer_media_id
insert into public.media_assets (
  city, business_id, offer_id, source_url, provider, asset_type, sort_order,
  gravity_mode, fit, status, review_status, zoom
)
select
  oi.city,
  oi.business_id,
  oi.offer_id,
  oi.source_url,
  case
    when oi.source_url like '%res.cloudinary.com/%' then 'cloudinary'
    else 'external'
  end,
  'offer_artwork',
  0,
  'auto',
  'cover',
  'active',
  'approved',
  1
from (
  select
    o.id as offer_id,
    o.business_id,
    bp.city,
    o.offer_image as source_url
  from public.business_offers o
  join public.business_profiles bp on bp.id = o.business_id
  where o.offer_image is not null
    and length(trim(o.offer_image)) > 0
    and o.offer_media_id is null
    and bp.city is not null
    and length(trim(bp.city)) > 0
    and o.business_id is not null
) oi
where not exists (
  select 1 from public.media_assets m
  where m.offer_id = oi.offer_id
    and m.source_url = oi.source_url
    and m.asset_type = 'offer_artwork'
    and m.status = 'active'
);

-- Deterministic offer pointer
update public.business_offers o
set offer_media_id = first_asset.id
from (
  select distinct on (offer_id) id, offer_id
  from public.media_assets
  where asset_type = 'offer_artwork'
    and status = 'active'
    and review_status = 'approved'
    and offer_id is not null
  order by offer_id, sort_order asc, created_at asc, id asc
) as first_asset
where o.id = first_asset.offer_id
  and o.offer_media_id is null;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_media_assets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_media_assets_updated_at on public.media_assets;
create trigger trg_media_assets_updated_at
  before update on public.media_assets
  for each row
  execute function public.set_media_assets_updated_at();
