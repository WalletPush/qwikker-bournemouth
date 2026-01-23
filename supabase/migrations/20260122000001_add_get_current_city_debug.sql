-- Migration: Add debug function to verify city context is set
-- This helps verify tenant context during development

create or replace function public.get_current_city()
returns text
language sql
stable
security definer
as $$
  select current_setting('app.current_city', true);
$$;

-- Grant execute to all roles
grant execute on function public.get_current_city() to anon, authenticated, service_role;

comment on function public.get_current_city() is 
  'Debug function: Returns the current city context set via set_current_city(). Used to verify tenant isolation.';
