-- Migration: Rename tables for clarity
-- Description: Rename profiles -> business_profiles and user_members -> app_users for clarity
-- Date: 2025-09-20 21:00:00 UTC

-- Rename profiles table to business_profiles for clarity
alter table if exists public.profiles rename to business_profiles;

-- Rename user_members table to app_users for clarity  
alter table if exists public.user_members rename to app_users;

-- Update foreign key references in related tables
alter table public.points_transactions 
drop constraint if exists points_transactions_user_id_fkey,
add constraint points_transactions_user_id_fkey 
foreign key (user_id) references public.app_users(user_id) on delete cascade;

alter table public.user_business_visits 
drop constraint if exists user_business_visits_user_id_fkey,
drop constraint if exists user_business_visits_business_id_fkey,
add constraint user_business_visits_user_id_fkey 
foreign key (user_id) references public.app_users(user_id) on delete cascade,
add constraint user_business_visits_business_id_fkey 
foreign key (business_id) references public.business_profiles(id) on delete cascade;

alter table public.user_offer_claims 
drop constraint if exists user_offer_claims_user_id_fkey,
drop constraint if exists user_offer_claims_business_id_fkey,
add constraint user_offer_claims_user_id_fkey 
foreign key (user_id) references public.app_users(user_id) on delete cascade,
add constraint user_offer_claims_business_id_fkey 
foreign key (business_id) references public.business_profiles(id) on delete cascade;

alter table public.user_secret_unlocks 
drop constraint if exists user_secret_unlocks_user_id_fkey,
drop constraint if exists user_secret_unlocks_business_id_fkey,
add constraint user_secret_unlocks_user_id_fkey 
foreign key (user_id) references public.app_users(user_id) on delete cascade,
add constraint user_secret_unlocks_business_id_fkey 
foreign key (business_id) references public.business_profiles(id) on delete cascade;

-- Update table comments
comment on table public.business_profiles is 'Business owners who want to list their business on Qwikker (Jerry''s Burgers, cafes, restaurants, etc.)';
comment on table public.app_users is 'People who use the Qwikker app to discover businesses, claim offers, and earn points (David, tourists, locals, etc.)';

-- Update RLS policies to match new table names
drop policy if exists "Public read access for demo" on public.app_users;
drop policy if exists "System can insert user members" on public.app_users;
drop policy if exists "System can update user members" on public.app_users;

create policy "Public read access for demo"
  on public.app_users for select
  using (true);

create policy "System can insert app users"
  on public.app_users for insert
  with check (true);

create policy "System can update app users"
  on public.app_users for update
  using (true);

-- Update the create_user_from_wallet_pass function
create or replace function create_user_from_wallet_pass(
  p_wallet_pass_id text,
  p_name text default 'Qwikker User',
  p_city text default 'bournemouth'
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_user_id uuid;
begin
  -- Generate new user ID
  new_user_id := gen_random_uuid();
  
  -- Insert app user
  insert into public.app_users (
    user_id,
    wallet_pass_id,
    name,
    city,
    referral_code,
    wallet_pass_status,
    wallet_pass_assigned_at
  ) values (
    new_user_id,
    p_wallet_pass_id,
    p_name,
    p_city,
    generate_referral_code(p_name),
    'active',
    now()
  );
  
  return new_user_id;
end;
$$;
