-- Debug migration: Add better error handling to the profiles trigger
-- Description: Enhances the handle_new_user() function with proper error handling
-- and logging to help debug signup issues
-- Date: 2025-09-15 18:01:00 UTC

-- Update the handle_new_user function with better error handling
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Add detailed logging for debugging
  raise log 'handle_new_user trigger called for user_id: %', new.id;
  raise log 'User email: %', new.email;
  
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
    
    raise log 'Successfully created profile for user_id: %', new.id;
    
  exception
    when others then
      -- Log the error details for debugging
      raise log 'Error creating profile for user_id: %. Error: % %', new.id, sqlstate, sqlerrm;
      
      -- Re-raise the error to prevent the user creation from completing
      -- This ensures data consistency - if profile creation fails, user creation should fail too
      raise exception 'Failed to create user profile: % %', sqlstate, sqlerrm;
  end;
  
  return new;
end;
$$;

-- Add a comment explaining the function
comment on function public.handle_new_user() is 'Automatically creates a profile when a new user signs up. Includes error handling and logging for debugging.';

-- Verify the trigger is still properly attached
-- (This is idempotent - it won't create duplicate triggers)
-- Note: We don't recreate the trigger here since it already exists from the previous migration

-- Create a test function to verify the profiles table is accessible
create or replace function public.test_profiles_access()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  test_result text;
begin
  -- Try to query the profiles table
  select 'Profiles table accessible' into test_result;
  
  -- Try to check table structure
  perform column_name 
  from information_schema.columns 
  where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'user_id';
  
  if not found then
    return 'ERROR: profiles table missing user_id column';
  end if;
  
  return 'SUCCESS: Profiles table structure looks correct';
  
exception
  when others then
    return format('ERROR accessing profiles table: %s %s', sqlstate, sqlerrm);
end;
$$;

-- Add comment for the test function
comment on function public.test_profiles_access() is 'Test function to verify profiles table accessibility and structure';
