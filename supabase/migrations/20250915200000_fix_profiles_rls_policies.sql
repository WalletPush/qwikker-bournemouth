-- Migration: Fix profiles RLS policies for onboarding
-- Description: Updates RLS policies to allow profile creation during onboarding process
-- Date: 2025-09-15 20:00:00 UTC

-- Drop existing policies
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

-- Create new policies that work with the onboarding flow
-- Policy for SELECT operations - authenticated users can view their own profile
create policy "Users can view their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy for INSERT operations - allow both trigger and authenticated user inserts
create policy "Allow profile creation"
  on public.profiles
  for insert
  with check (
    -- Allow the trigger function to insert (when auth.uid() might be null in trigger context)
    auth.uid() is null 
    or 
    -- Allow authenticated users to insert their own profile
    auth.uid() = user_id
  );

-- Policy for UPDATE operations - authenticated users can update their own profile
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy for UPSERT operations - handle the upsert case in onboarding
create policy "Allow profile upsert during onboarding"
  on public.profiles
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
grant usage on schema public to authenticated;
grant all on public.profiles to authenticated;

-- Add comment explaining the policies
comment on table public.profiles is 'Extended user profile data. RLS policies ensure users can only access their own profiles, with special handling for the onboarding trigger.';
