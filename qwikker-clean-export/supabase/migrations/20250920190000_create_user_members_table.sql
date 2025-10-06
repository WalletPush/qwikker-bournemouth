-- Migration: Create user_members table for Qwikker app users
-- Description: Creates a comprehensive user_members table for people who use the Qwikker app
-- (separate from the profiles table which is for businesses wanting to list on Qwikker)
-- Date: 2025-09-20 19:00:00 UTC

-- Create the user_members table
create table if not exists public.user_members (
  -- Primary identification
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  
  -- Basic profile information
  name text,
  email text, -- copied from auth.users on creation
  phone text,
  joined_date timestamptz not null default now(),
  
  -- Location and preferences
  city text not null default 'bournemouth' check (city in (
    'bournemouth', 'poole', 'christchurch', 'wimborne',
    'ferndown', 'ringwood', 'new_milton', 'other'
  )),
  preferred_categories text[] default array[]::text[], -- ['Restaurant', 'Cafe', 'Bar']
  dietary_restrictions text[] default array[]::text[], -- ['vegetarian', 'vegan', 'gluten_free', 'halal']
  preferred_radius_miles integer default 3 check (preferred_radius_miles > 0),
  
  -- Gamification system
  total_points integer not null default 0,
  level integer not null default 1,
  experience_points integer not null default 0,
  tier text not null default 'explorer' check (tier in ('explorer', 'insider', 'legend')),
  
  -- User statistics (JSONB for flexibility)
  stats jsonb not null default '{
    "businessesVisited": 0,
    "secretItemsUnlocked": 0,
    "offersRedeemed": 0,
    "friendsReferred": 0,
    "reviewsWritten": 0,
    "photosShared": 0,
    "chatMessages": 0,
    "streakDays": 0
  }'::jsonb,
  
  -- Badges system (JSONB array)
  badges jsonb not null default '[]'::jsonb,
  
  -- Referral system
  referral_code text unique not null,
  referred_by text, -- referral_code of the user who referred them
  
  -- Wallet pass system
  wallet_pass_id text unique, -- unique identifier for Apple/Google Wallet pass
  wallet_pass_assigned_at timestamptz,
  wallet_pass_status text default 'pending' check (wallet_pass_status in (
    'pending', 'assigned', 'active', 'expired', 'revoked'
  )),
  
  -- Notification preferences (JSONB)
  notification_preferences jsonb not null default '{
    "geoOffers": true,
    "newBusinesses": true,
    "secretMenus": false,
    "weeklyDigest": true,
    "sms": false
  }'::jsonb,
  
  -- Profile completion and onboarding
  profile_completion_percentage integer not null default 0 check (profile_completion_percentage between 0 and 100),
  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz,
  
  -- Activity tracking
  last_active_at timestamptz default now(),
  current_streak_days integer not null default 0,
  longest_streak_days integer not null default 0,
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add table comment
comment on table public.user_members is 'User profiles for people who use the Qwikker app to discover businesses and claim offers (separate from business profiles)';

-- Add column comments for clarity
comment on column public.user_members.user_id is 'Foreign key reference to auth.users.id';
comment on column public.user_members.email is 'Email copied from auth.users on profile creation';
comment on column public.user_members.city is 'City where the user is located (determines which businesses they see)';
comment on column public.user_members.stats is 'JSONB object containing user activity statistics';
comment on column public.user_members.badges is 'JSONB array of earned badges with unlock dates and progress';
comment on column public.user_members.referral_code is 'Unique referral code for this user (format: NAME-QWK-YEAR)';
comment on column public.user_members.wallet_pass_id is 'Unique identifier for the user''s Apple/Google Wallet pass';
comment on column public.user_members.notification_preferences is 'JSONB object with notification settings';

-- Create indexes for better query performance
create index if not exists idx_user_members_user_id on public.user_members(user_id);
create index if not exists idx_user_members_city on public.user_members(city);
create index if not exists idx_user_members_referral_code on public.user_members(referral_code);
create index if not exists idx_user_members_wallet_pass_id on public.user_members(wallet_pass_id);
create index if not exists idx_user_members_level on public.user_members(level);
create index if not exists idx_user_members_total_points on public.user_members(total_points);

-- Create RLS policies
alter table public.user_members enable row level security;

-- Users can only see and edit their own profile
create policy "Users can view their own profile"
  on public.user_members for select
  using (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.user_members for update
  using (auth.uid() = user_id);

-- Only authenticated users can insert (handled by trigger)
create policy "Authenticated users can insert their own profile"
  on public.user_members for insert
  with check (auth.uid() = user_id);

-- Create function to generate unique referral codes
create or replace function generate_referral_code(user_name text)
returns text
language plpgsql
as $$
declare
  base_code text;
  final_code text;
  counter integer := 0;
begin
  -- Create base code from name (first 6 chars, uppercase, alphanumeric only)
  base_code := upper(regexp_replace(coalesce(user_name, 'USER'), '[^A-Za-z0-9]', '', 'g'));
  base_code := left(base_code, 6);
  if length(base_code) < 3 then
    base_code := 'USER';
  end if;
  
  -- Add suffix and check uniqueness
  loop
    if counter = 0 then
      final_code := base_code || '-QWK-' || extract(year from now())::text;
    else
      final_code := base_code || counter::text || '-QWK-' || extract(year from now())::text;
    end if;
    
    -- Check if this code already exists
    if not exists (select 1 from public.user_members where referral_code = final_code) then
      return final_code;
    end if;
    
    counter := counter + 1;
    if counter > 999 then
      -- Fallback to random if we can't find a unique code
      final_code := base_code || floor(random() * 10000)::text || '-QWK-' || extract(year from now())::text;
      return final_code;
    end if;
  end loop;
end;
$$;

-- Create function to handle new user member creation
create or replace function handle_new_user_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_email text;
  user_name text;
begin
  -- Get email from auth.users
  select email into user_email from auth.users where id = new.id;
  
  -- Extract name from email (part before @)
  user_name := split_part(user_email, '@', 1);
  user_name := initcap(user_name);
  
  -- Insert user member profile
  insert into public.user_members (
    user_id,
    email,
    name,
    referral_code
  ) values (
    new.id,
    user_email,
    user_name,
    generate_referral_code(user_name)
  );
  
  return new;
end;
$$;

-- Create trigger for automatic user member profile creation
drop trigger if exists on_auth_user_created_member on auth.users;
create trigger on_auth_user_created_member
  after insert on auth.users
  for each row execute procedure handle_new_user_member();

-- Create function to update updated_at timestamp
create or replace function handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create trigger to automatically update updated_at
drop trigger if exists handle_user_members_updated_at on public.user_members;
create trigger handle_user_members_updated_at
  before update on public.user_members
  for each row execute procedure handle_updated_at();

-- Create function to calculate user tier based on points
create or replace function calculate_user_tier(points integer)
returns text
language plpgsql
as $$
begin
  if points >= 5000 then
    return 'legend';
  elsif points >= 1000 then
    return 'insider';
  else
    return 'explorer';
  end if;
end;
$$;

-- Create function to update user tier when points change
create or replace function update_user_tier()
returns trigger
language plpgsql
as $$
begin
  new.tier := calculate_user_tier(new.total_points);
  return new;
end;
$$;

-- Create trigger to automatically update tier when points change
drop trigger if exists update_user_tier_on_points_change on public.user_members;
create trigger update_user_tier_on_points_change
  before update of total_points on public.user_members
  for each row execute procedure update_user_tier();
