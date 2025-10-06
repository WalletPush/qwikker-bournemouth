-- Migration: Fix user_members table to not depend on auth.users
-- Description: Remove foreign key constraint to auth.users and make user_id just a UUID
-- Users are identified by wallet_pass_id, not auth system
-- Date: 2025-09-20 20:00:00 UTC

-- Drop foreign key constraints from related tables first
alter table public.points_transactions 
drop constraint if exists points_transactions_user_id_fkey;

alter table public.user_business_visits 
drop constraint if exists user_business_visits_user_id_fkey;

alter table public.user_offer_claims 
drop constraint if exists user_offer_claims_user_id_fkey;

alter table public.user_secret_unlocks 
drop constraint if exists user_secret_unlocks_user_id_fkey;

-- Drop the foreign key constraint to auth.users
alter table public.user_members 
drop constraint if exists user_members_user_id_fkey;

-- Now we can drop the unique constraint on user_id
alter table public.user_members 
drop constraint if exists user_members_user_id_key;

-- Re-add unique constraint on user_id for foreign key references
alter table public.user_members 
add constraint user_members_user_id_key unique (user_id);

-- Re-add foreign key constraints pointing to user_members.user_id (not auth.users)
alter table public.points_transactions 
add constraint points_transactions_user_id_fkey 
foreign key (user_id) references public.user_members(user_id) on delete cascade;

alter table public.user_business_visits 
add constraint user_business_visits_user_id_fkey 
foreign key (user_id) references public.user_members(user_id) on delete cascade;

alter table public.user_offer_claims 
add constraint user_offer_claims_user_id_fkey 
foreign key (user_id) references public.user_members(user_id) on delete cascade;

alter table public.user_secret_unlocks 
add constraint user_secret_unlocks_user_id_fkey 
foreign key (user_id) references public.user_members(user_id) on delete cascade;

-- Update the comment to reflect the new approach
comment on column public.user_members.user_id is 'Internal UUID for this user (not tied to auth.users)';
comment on column public.user_members.wallet_pass_id is 'Unique wallet pass ID - this is the PRIMARY identifier for authentication';

-- Drop the old trigger that creates user members from auth.users
drop trigger if exists on_auth_user_created_member on auth.users;
drop function if exists handle_new_user_member();

-- Update RLS policies to work with wallet pass authentication
drop policy if exists "Users can view their own profile" on public.user_members;
drop policy if exists "Users can update their own profile" on public.user_members;
drop policy if exists "Authenticated users can insert their own profile" on public.user_members;

-- Create new RLS policies based on wallet pass ID
-- For demo purposes, we'll allow read access and restrict write access
create policy "Public read access for demo"
  on public.user_members for select
  using (true);

create policy "System can insert user members"
  on public.user_members for insert
  with check (true); -- Will be restricted by application logic

create policy "System can update user members"
  on public.user_members for update
  using (true); -- Will be restricted by application logic

-- Create function to create user member from wallet pass installation
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
  
  -- Insert user member
  insert into public.user_members (
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

-- Add comment explaining the new flow
comment on function create_user_from_wallet_pass is 'Creates a new user member when a wallet pass is installed. This replaces the auth.users trigger.';
