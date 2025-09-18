-- Migration: Create profiles table with extended user data
-- Description: Creates a comprehensive profiles table to store extended user information
-- including personal data, business details, offers, and billing information.
-- Also sets up automatic profile creation trigger and RLS policies.
-- Date: 2025-09-15 18:00:00 UTC

-- Create the profiles table
create table if not exists public.profiles (
  -- Primary identification
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  
  -- Personal information
  first_name text,
  last_name text,
  email text, -- copied from auth.users on creation
  phone text,
  
  -- Marketing and goals
  referral_source text check (referral_source in (
    'google_search', 'social_media', 'word_of_mouth', 
    'advertising', 'partner_referral', 'other'
  )),
  goals text check (goals in (
    'increase_customers', 'improve_marketing', 'boost_sales',
    'build_brand_awareness', 'customer_retention', 'expand_business', 'other'
  )),
  notes text,
  
  -- Business information
  business_name text,
  business_type text check (business_type in (
    'bar', 'cafe', 'restaurant', 'salon', 'spa', 'gym', 
    'retail_shop', 'hotel', 'service_business', 'other'
  )),
  business_category text,
  business_address text,
  business_town text check (business_town in (
    'bournemouth', 'poole', 'christchurch', 'wimborne',
    'ferndown', 'ringwood', 'new_milton', 'other'
  )),
  business_postcode text,
  
  -- Online presence
  website_url text,
  instagram_handle text,
  facebook_url text,
  logo text, -- url to uploaded logo file
  
  -- Offer data
  offer_name text,
  offer_type text check (offer_type in (
    'discount', 'two_for_one', 'freebie', 'buy_x_get_y',
    'percentage_off', 'fixed_amount_off', 'other'
  )),
  offer_value text, -- e.g., "20% off", "Buy 2 get 1 free"
  offer_claim_amount text check (offer_claim_amount in (
    'first_10', 'first_25', 'first_50', 'first_100', 'unlimited', 'custom'
  )),
  offer_start_date date,
  offer_end_date date,
  offer_terms text,
  offer_image text, -- url to uploaded offer image file
  
  -- Plan and billing
  plan text not null default 'starter' check (plan in ('starter', 'spotlight', 'pro')),
  trial_expiry timestamptz default (now() + interval '120 days'), -- 120 days trial from signup
  is_founder boolean not null default false, -- gets 20% lifetime discount if signed up before cutoff
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add table comment
comment on table public.profiles is 'Extended user profile data including personal information, business details, offers, and billing information.';

-- Add column comments for clarity
comment on column public.profiles.user_id is 'Foreign key reference to auth.users.id';
comment on column public.profiles.email is 'Email copied from auth.users on profile creation';
comment on column public.profiles.referral_source is 'How the user heard about the service';
comment on column public.profiles.goals is 'What the user wants to achieve';
comment on column public.profiles.business_category is 'General category like food, drink, wellness';
comment on column public.profiles.logo is 'URL to uploaded business logo file';
comment on column public.profiles.offer_image is 'URL to uploaded offer promotional image';
comment on column public.profiles.trial_expiry is 'When the user trial period expires, defaults to 120 days from signup';
comment on column public.profiles.is_founder is 'Whether user gets founder discount (20% lifetime) for early signup';

-- Create indexes for better query performance
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_business_town on public.profiles(business_town);
create index if not exists idx_profiles_business_type on public.profiles(business_type);
create index if not exists idx_profiles_plan on public.profiles(plan);
create index if not exists idx_profiles_trial_expiry on public.profiles(trial_expiry);
create index if not exists idx_profiles_created_at on public.profiles(created_at);

-- Create function to automatically update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Update the updated_at column with the current timestamp
  new.updated_at := now();
  return new;
end;
$$;

-- Create trigger to automatically update updated_at on row modifications
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Create function to automatically create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Create a new profile record for the newly created user
  -- Copy email from auth.users and set default plan to 'starter'
  insert into public.profiles (user_id, email, plan, is_founder)
  values (
    new.id,
    new.email,
    'starter',
    -- Set is_founder to true if user signed up before a specific cutoff date
    -- You can adjust this date as needed for your founder program
    case when now() < '2025-12-31 23:59:59+00'::timestamptz then true else false end
  );
  return new;
end;
$$;

-- Create trigger to automatically create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Enable Row Level Security on the profiles table
alter table public.profiles enable row level security;

-- Create RLS policy for SELECT operations - users can only view their own profile
create policy "Users can view their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Create RLS policy for INSERT operations - users can only create their own profile
-- Note: This policy is mainly for manual inserts as profiles are auto-created via trigger
create policy "Users can create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Create RLS policy for UPDATE operations - users can only update their own profile
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create RLS policy for DELETE operations - users can only delete their own profile
create policy "Users can delete their own profile"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

-- Add helpful comments about the RLS setup
comment on policy "Users can view their own profile" on public.profiles is 'Allows authenticated users to view only their own profile data';
comment on policy "Users can create their own profile" on public.profiles is 'Allows authenticated users to create their own profile (backup to trigger)';
comment on policy "Users can update their own profile" on public.profiles is 'Allows authenticated users to update only their own profile data';
comment on policy "Users can delete their own profile" on public.profiles is 'Allows authenticated users to delete only their own profile data';
