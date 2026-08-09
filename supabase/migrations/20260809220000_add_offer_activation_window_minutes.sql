-- migration: add activation_window_minutes to business_offers
-- purpose: per-offer wallet duration after Redeem (30|60|120), default 60.
-- used by: admin CRM offer edit now; Save/Redeem activation flow later.
-- affected: business_offers.activation_window_minutes

alter table public.business_offers
  add column if not exists activation_window_minutes integer not null default 60;

-- backfill any nulls if column existed without default
update public.business_offers
set activation_window_minutes = 60
where activation_window_minutes is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_offers_activation_window_minutes_check'
  ) then
    alter table public.business_offers
      add constraint business_offers_activation_window_minutes_check
      check (activation_window_minutes in (30, 60, 120));
  end if;
end $$;

comment on column public.business_offers.activation_window_minutes is
  'Minutes the offer stays on the customer wallet after Redeem now. Allowed: 30, 60, 120. Default 60.';
