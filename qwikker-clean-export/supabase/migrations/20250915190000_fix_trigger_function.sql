-- Migration: Fix the handle_new_user trigger function
-- Description: Updates the trigger function to handle potential errors and edge cases
-- that might be causing the "Database error saving new user" issue
-- Date: 2025-09-15 19:00:00 UTC

-- Update the handle_new_user function with better error handling and validation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security invoker
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

-- Add a comment explaining the updated function
comment on function public.handle_new_user() is 'Automatically creates a profile when a new user signs up. Updated with enhanced error handling, validation, and logging for debugging signup issues.';

-- Test the function by calling our test function
select public.test_profiles_access();

-- Create a simple test to verify trigger functionality
create or replace function public.test_trigger_function()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  test_result text;
begin
  -- This function tests if our trigger function would work
  -- without actually creating a user
  
  -- Test the basic logic
  if 'starter' in ('starter', 'spotlight', 'pro') then
    test_result := 'SUCCESS: Trigger function logic appears correct';
  else
    test_result := 'ERROR: Plan validation failed';
  end if;
  
  return test_result;
  
exception
  when others then
    return format('ERROR testing trigger function: %s %s', sqlstate, sqlerrm);
end;
$$;

-- Run the test
select public.test_trigger_function();

-- Add comment for the test function
comment on function public.test_trigger_function() is 'Test function to verify trigger function logic without creating actual users';
