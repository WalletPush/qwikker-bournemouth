-- migration: offer save + activation (Save / Redeem now — Release 1)
-- purpose: replace claim/add-to-wallet theatre with saved intent + timed activations
-- affected: user_saved_offers, offer_activations, franchise_crm_configs,
--           activate_offer() rpc, business_offers.activation_window_minutes (ensure)

-- ---------------------------------------------------------------------------
-- 1. ensure activation_window_minutes exists (idempotent if already applied)
-- ---------------------------------------------------------------------------
alter table public.business_offers
  add column if not exists activation_window_minutes integer not null default 60;

update public.business_offers
set activation_window_minutes = 60
where activation_window_minutes is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'business_offers_activation_window_minutes_check'
  ) then
    alter table public.business_offers
      add constraint business_offers_activation_window_minutes_check
      check (activation_window_minutes in (30, 60, 120));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. optional franchise default for enrichment / null offer windows
-- ---------------------------------------------------------------------------
alter table public.franchise_crm_configs
  add column if not exists default_offer_activation_minutes integer not null default 60;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'franchise_crm_configs_default_offer_activation_minutes_check'
  ) then
    alter table public.franchise_crm_configs
      add constraint franchise_crm_configs_default_offer_activation_minutes_check
      check (default_offer_activation_minutes in (30, 60, 120));
  end if;
end $$;

comment on column public.franchise_crm_configs.default_offer_activation_minutes is
  'Default wallet activation window (minutes) for new/enriched offers when not set on the offer.';

-- ---------------------------------------------------------------------------
-- 3. user_saved_offers — intent only (no wallet, no business notify)
-- ---------------------------------------------------------------------------
create table if not exists public.user_saved_offers (
  id uuid primary key default gen_random_uuid(),
  wallet_pass_id text not null,
  offer_id uuid not null references public.business_offers(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  saved_at timestamptz not null default now(),
  removed_at timestamptz,
  source text not null default 'offers'
    check (source in ('offers', 'chat', 'business', 'auto', 'legacy_claim')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wallet_pass_id, offer_id)
);

create index if not exists idx_user_saved_offers_wallet
  on public.user_saved_offers (wallet_pass_id)
  where removed_at is null;

create index if not exists idx_user_saved_offers_offer
  on public.user_saved_offers (offer_id)
  where removed_at is null;

create index if not exists idx_user_saved_offers_business
  on public.user_saved_offers (business_id)
  where removed_at is null;

comment on table public.user_saved_offers is
  'User saved offers (intent). No wallet push. Soft-remove via removed_at.';

alter table public.user_saved_offers enable row level security;

drop policy if exists "service_role_all_user_saved_offers" on public.user_saved_offers;
create policy "service_role_all_user_saved_offers"
  on public.user_saved_offers
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "anon_select_own_user_saved_offers" on public.user_saved_offers;
create policy "anon_select_own_user_saved_offers"
  on public.user_saved_offers
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.app_users au
      where au.wallet_pass_id = user_saved_offers.wallet_pass_id
    )
  );

-- ---------------------------------------------------------------------------
-- 4. offer_activations — one row per Redeem now window
-- ---------------------------------------------------------------------------
create table if not exists public.offer_activations (
  id uuid primary key default gen_random_uuid(),
  wallet_pass_id text not null,
  offer_id uuid not null references public.business_offers(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  activated_at timestamptz not null default now(),
  active_until timestamptz not null,
  warning_sent_at timestamptz,
  completed_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'ended')),
  source text not null default 'offers'
    check (source in ('offers', 'chat', 'business', 'auto', 'legacy_claim')),
  wallet_sync_status text not null default 'pending'
    check (wallet_sync_status in ('pending', 'synced', 'failed', 'clear_pending', 'cleared', 'clear_failed')),
  wallet_sync_attempts integer not null default 0,
  wallet_sync_last_error text,
  replaced_activation_id uuid references public.offer_activations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_offer_activations_wallet_active
  on public.offer_activations (wallet_pass_id)
  where status = 'active';

create index if not exists idx_offer_activations_active_until
  on public.offer_activations (active_until)
  where status = 'active';

create index if not exists idx_offer_activations_wallet_sync
  on public.offer_activations (wallet_sync_status)
  where wallet_sync_status in ('pending', 'failed', 'clear_pending', 'clear_failed');

create index if not exists idx_offer_activations_offer
  on public.offer_activations (offer_id);

create index if not exists idx_offer_activations_business
  on public.offer_activations (business_id);

comment on table public.offer_activations is
  'Redeem now activations. Each row is one timed wallet window. Multi-use = new row after previous ended.';

alter table public.offer_activations enable row level security;

drop policy if exists "service_role_all_offer_activations" on public.offer_activations;
create policy "service_role_all_offer_activations"
  on public.offer_activations
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "anon_select_own_offer_activations" on public.offer_activations;
create policy "anon_select_own_offer_activations"
  on public.offer_activations
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.app_users au
      where au.wallet_pass_id = offer_activations.wallet_pass_id
    )
  );

-- ---------------------------------------------------------------------------
-- 5. updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_saved_offers_updated_at on public.user_saved_offers;
create trigger trg_user_saved_offers_updated_at
  before update on public.user_saved_offers
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_offer_activations_updated_at on public.offer_activations;
create trigger trg_offer_activations_updated_at
  before update on public.offer_activations
  for each row execute function public.set_updated_at_timestamp();

-- ---------------------------------------------------------------------------
-- 6. activate_offer RPC — serialize per wallet_pass_id, optional replace
-- ---------------------------------------------------------------------------
create or replace function public.activate_offer(
  p_wallet_pass_id text,
  p_offer_id uuid,
  p_source text default 'offers',
  p_confirm_replace boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer record;
  v_window integer;
  v_active record;
  v_prior record;
  v_new offer_activations%rowtype;
  v_minutes_left integer;
begin
  if p_wallet_pass_id is null or length(trim(p_wallet_pass_id)) < 10 then
    return jsonb_build_object('success', false, 'error', 'invalid_wallet_pass_id');
  end if;

  -- serialize concurrent activates for this pass
  perform pg_advisory_xact_lock(hashtext('offer_activate:' || p_wallet_pass_id));

  select
    bo.id,
    bo.business_id,
    bo.offer_name,
    bo.offer_claim_amount,
    bo.activation_window_minutes,
    bo.status as offer_status,
    bo.offer_start_date,
    bo.offer_end_date,
    bp.business_name,
    bp.city
  into v_offer
  from public.business_offers bo
  join public.business_profiles bp on bp.id = bo.business_id
  where bo.id = p_offer_id;

  if v_offer.id is null then
    return jsonb_build_object('success', false, 'error', 'offer_not_found');
  end if;

  if v_offer.offer_status is distinct from 'approved' then
    return jsonb_build_object('success', false, 'error', 'offer_not_approved');
  end if;

  if v_offer.offer_end_date is not null and v_offer.offer_end_date::date < current_date then
    return jsonb_build_object('success', false, 'error', 'offer_expired');
  end if;

  if v_offer.offer_start_date is not null and v_offer.offer_start_date::date > current_date then
    return jsonb_build_object('success', false, 'error', 'offer_not_started');
  end if;

  v_window := coalesce(v_offer.activation_window_minutes, 60);
  if v_window not in (30, 60, 120) then
    v_window := 60;
  end if;

  -- single-use: any prior activation blocks
  if coalesce(v_offer.offer_claim_amount, 'single') = 'single' then
    select id, status into v_prior
    from public.offer_activations
    where wallet_pass_id = p_wallet_pass_id
      and offer_id = p_offer_id
    order by activated_at desc
    limit 1;

    if v_prior.id is not null then
      return jsonb_build_object(
        'success', false,
        'error', 'single_use_already_activated',
        'activation_id', v_prior.id,
        'status', v_prior.status
      );
    end if;
  else
    -- multiple-use: block only while same offer is currently active
    select id into v_prior
    from public.offer_activations
    where wallet_pass_id = p_wallet_pass_id
      and offer_id = p_offer_id
      and status = 'active'
      and active_until > now()
    limit 1;

    if v_prior.id is not null then
      return jsonb_build_object(
        'success', false,
        'error', 'already_active',
        'activation_id', v_prior.id
      );
    end if;
  end if;

  -- another offer active on this pass?
  select
    oa.id,
    oa.offer_id,
    oa.active_until,
    oa.business_id,
    bo.offer_name,
    bp.business_name
  into v_active
  from public.offer_activations oa
  join public.business_offers bo on bo.id = oa.offer_id
  join public.business_profiles bp on bp.id = oa.business_id
  where oa.wallet_pass_id = p_wallet_pass_id
    and oa.status = 'active'
    and oa.active_until > now()
  order by oa.activated_at desc
  limit 1;

  if v_active.id is not null then
    if not p_confirm_replace then
      v_minutes_left := greatest(1, ceil(extract(epoch from (v_active.active_until - now())) / 60.0)::int);
      return jsonb_build_object(
        'success', false,
        'error', 'needs_replace_confirm',
        'active', jsonb_build_object(
          'activation_id', v_active.id,
          'offer_id', v_active.offer_id,
          'offer_name', v_active.offer_name,
          'business_name', v_active.business_name,
          'active_until', v_active.active_until,
          'minutes_left', v_minutes_left
        )
      );
    end if;

    update public.offer_activations
    set
      status = 'ended',
      completed_at = now(),
      wallet_sync_status = case
        when wallet_sync_status in ('synced', 'pending', 'failed') then 'clear_pending'
        else wallet_sync_status
      end,
      updated_at = now()
    where id = v_active.id;
  end if;

  insert into public.offer_activations (
    wallet_pass_id,
    offer_id,
    business_id,
    activated_at,
    active_until,
    status,
    source,
    wallet_sync_status,
    replaced_activation_id
  ) values (
    p_wallet_pass_id,
    p_offer_id,
    v_offer.business_id,
    now(),
    now() + make_interval(mins => v_window),
    'active',
    coalesce(nullif(trim(p_source), ''), 'offers'),
    'pending',
    v_active.id
  )
  returning * into v_new;

  -- ensure a save row exists (redeem can skip explicit save)
  insert into public.user_saved_offers (
    wallet_pass_id, offer_id, business_id, source, removed_at
  ) values (
    p_wallet_pass_id, p_offer_id, v_offer.business_id, coalesce(nullif(trim(p_source), ''), 'offers'), null
  )
  on conflict (wallet_pass_id, offer_id) do update
    set removed_at = null,
        updated_at = now();

  return jsonb_build_object(
    'success', true,
    'activation', jsonb_build_object(
      'id', v_new.id,
      'wallet_pass_id', v_new.wallet_pass_id,
      'offer_id', v_new.offer_id,
      'business_id', v_new.business_id,
      'activated_at', v_new.activated_at,
      'active_until', v_new.active_until,
      'status', v_new.status,
      'source', v_new.source,
      'wallet_sync_status', v_new.wallet_sync_status,
      'replaced_activation_id', v_new.replaced_activation_id,
      'activation_window_minutes', v_window
    ),
    'offer', jsonb_build_object(
      'offer_name', v_offer.offer_name,
      'business_name', v_offer.business_name,
      'business_id', v_offer.business_id,
      'city', v_offer.city
    )
  );
end;
$$;

revoke all on function public.activate_offer(text, uuid, text, boolean) from public;
grant execute on function public.activate_offer(text, uuid, text, boolean) to service_role;

comment on function public.activate_offer(text, uuid, text, boolean) is
  'Atomically activate an offer for a wallet pass. Returns needs_replace_confirm when another offer is active.';

-- ---------------------------------------------------------------------------
-- 7. best-effort legacy backfill: claimed → saved (uuid offer ids only)
-- ---------------------------------------------------------------------------
insert into public.user_saved_offers (
  wallet_pass_id, offer_id, business_id, saved_at, source
)
select
  c.wallet_pass_id,
  c.offer_id::uuid,
  bo.business_id,
  coalesce(c.claimed_at, c.created_at, now()),
  'legacy_claim'
from public.user_offer_claims c
join public.business_offers bo on bo.id::text = c.offer_id
where c.wallet_pass_id is not null
  and c.offer_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and c.status in ('claimed', 'wallet_added', 'redeemed')
on conflict (wallet_pass_id, offer_id) do nothing;
