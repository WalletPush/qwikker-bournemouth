-- Migration: Create multiple menus system with approval workflow
-- Description: Creates a separate menus table to support multiple menu uploads per business
-- with individual approval workflow, menu types, and proper relationship to business profiles
-- Date: 2025-10-29 18:35:42 UTC

-- Create the menus table
create table if not exists public.menus (
  -- Primary identification
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.business_profiles(id) on delete cascade not null,
  
  -- Menu information
  menu_name text not null, -- e.g., "Main Menu", "Drinks Menu", "Desserts", "Specials"
  menu_type text not null check (menu_type in (
    'main_menu', 'drinks', 'desserts', 'specials', 'breakfast', 
    'lunch', 'dinner', 'wine_list', 'cocktails', 'services', 'other'
  )),
  menu_url text not null, -- cloudinary url to the PDF file
  
  -- Approval workflow
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected', 'needs_revision'
  )),
  admin_notes text, -- admin feedback during review
  approved_by uuid references auth.users(id), -- admin who approved
  approved_at timestamp with time zone,
  
  -- Metadata
  file_size bigint, -- file size in bytes for tracking
  original_filename text, -- original filename when uploaded
  uploaded_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on menus table
alter table public.menus enable row level security;

-- Create RLS policies for menus table

-- Allow businesses to view their own menus
create policy "Businesses can view their own menus"
on public.menus
for select
to authenticated
using (
  business_id in (
    select id from public.business_profiles 
    where user_id = (select auth.uid())
  )
);

-- Allow businesses to insert their own menus
create policy "Businesses can upload their own menus"
on public.menus
for insert
to authenticated
with check (
  business_id in (
    select id from public.business_profiles 
    where user_id = (select auth.uid())
  )
);

-- Allow businesses to update their own pending menus
create policy "Businesses can update their pending menus"
on public.menus
for update
to authenticated
using (
  business_id in (
    select id from public.business_profiles 
    where user_id = (select auth.uid())
  )
  and status = 'pending'
)
with check (
  business_id in (
    select id from public.business_profiles 
    where user_id = (select auth.uid())
  )
);

-- Allow businesses to delete their own pending menus
create policy "Businesses can delete their pending menus"
on public.menus
for delete
to authenticated
using (
  business_id in (
    select id from public.business_profiles 
    where user_id = (select auth.uid())
  )
  and status = 'pending'
);

-- Allow admins to view all menus (admin access will be handled by service role)
create policy "Admins can view all menus"
on public.menus
for select
to authenticated
using (
  exists (
    select 1 from public.city_admins 
    where user_id = (select auth.uid())
  )
);

-- Allow admins to update menu status and notes
create policy "Admins can update menu approval status"
on public.menus
for update
to authenticated
using (
  exists (
    select 1 from public.city_admins 
    where user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.city_admins 
    where user_id = (select auth.uid())
  )
);

-- Create indexes for better performance
create index if not exists idx_menus_business_id on public.menus(business_id);
create index if not exists idx_menus_status on public.menus(status);
create index if not exists idx_menus_menu_type on public.menus(menu_type);
create index if not exists idx_menus_created_at on public.menus(created_at desc);

-- Create function to update updated_at timestamp
create or replace function public.update_menus_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
create trigger update_menus_updated_at
  before update on public.menus
  for each row
  execute function public.update_menus_updated_at();

-- Create view for approved menus (public access)
create or replace view public.approved_menus as
select 
  m.id,
  m.business_id,
  m.menu_name,
  m.menu_type,
  m.menu_url,
  m.approved_at,
  m.created_at,
  bp.business_name,
  bp.business_town,
  bp.city
from public.menus m
join public.business_profiles bp on m.business_id = bp.id
where m.status = 'approved'
  and bp.status = 'approved'
order by m.menu_type, m.created_at desc;

-- Grant access to approved menus view
grant select on public.approved_menus to authenticated;
grant select on public.approved_menus to anon;

-- Add comment explaining the table purpose
comment on table public.menus is 'Stores multiple menu files per business with individual approval workflow';
comment on column public.menus.menu_type is 'Type of menu: main_menu, drinks, desserts, specials, etc.';
comment on column public.menus.status is 'Approval status: pending, approved, rejected, needs_revision';
comment on column public.menus.business_id is 'References business_profiles.id (not user_id)';
