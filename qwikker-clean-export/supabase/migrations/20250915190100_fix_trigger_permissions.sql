-- Migration: Fix trigger function permissions
-- Description: Updates the handle_new_user function to use SECURITY DEFINER
-- so it has the necessary permissions to insert into the profiles table
-- Date: 2025-09-15 19:01:00 UTC

-- Update the handle_new_user function with SECURITY DEFINER
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer -- Changed from SECURITY INVOKER to SECURITY DEFINER
set search_path = ''
as $$
begin
  -- Add detailed logging for debugging
  raise log 'handle_new_user trigger called for user_id: %, email: %', new.id, new.email;
  
  -- Validate that we have the required data
  if new.id is null then
    raise exception 'User ID is null in handle_new_user trigger';
  end if;
  
  if new.email is null or new.email = '' then
    raise log 'Warning: User email is null or empty for user_id: %', new.id;
  end if;
  
  begin
    -- Create a new profile record for the newly created user
    -- Copy email from auth.users and set default plan to 'starter'
    insert into public.profiles (user_id, email, plan, is_founder)
    values (
      new.id,
      coalesce(new.email, ''), -- Use empty string if email is null
      'starter',
      -- Set is_founder to true if user signed up before a specific cutoff date
      -- You can adjust this date as needed for your founder program
      case when now() < '2025-12-31 23:59:59+00'::timestamptz then true else false end
    );
    
    raise log 'Successfully created profile for user_id: %, email: %', new.id, coalesce(new.email, 'null');
    
  exception
    when unique_violation then
      -- Profile already exists, this might happen if trigger runs multiple times
      raise log 'Profile already exists for user_id: %, skipping creation', new.id;
    when others then
      -- Log the error details for debugging
      raise log 'Error creating profile for user_id: %. SQLSTATE: %, SQLERRM: %', new.id, sqlstate, sqlerrm;
      
      -- Re-raise the error to prevent the user creation from completing
      -- This ensures data consistency - if profile creation fails, user creation should fail too
      raise exception 'Failed to create user profile: % (SQLSTATE: %)', sqlerrm, sqlstate;
  end;
  
  return new;
end;
$$;

-- Grant necessary permissions to the function owner to access the profiles table
-- This ensures the SECURITY DEFINER function can insert into profiles
grant insert on public.profiles to postgres;
grant select on public.profiles to postgres;

-- Add a comment explaining the updated function
comment on function public.handle_new_user() is 'Automatically creates a profile when a new user signs up. Uses SECURITY DEFINER to have necessary permissions for inserting into profiles table.';
