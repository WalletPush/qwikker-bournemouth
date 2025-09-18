-- Migration: Add missing profile columns
-- Description: Adds menu_url and additional_notes columns to profiles table
-- Date: 2025-09-15 21:00:00 UTC

-- Add menu_url column for storing uploaded menu/price list PDFs
alter table public.profiles 
add column if not exists menu_url text;

-- Add additional_notes column for extra business information
alter table public.profiles 
add column if not exists additional_notes text;

-- Add comments for the new columns
comment on column public.profiles.menu_url is 'URL to uploaded menu or price list PDF file';
comment on column public.profiles.additional_notes is 'Additional notes about the business from onboarding form';
