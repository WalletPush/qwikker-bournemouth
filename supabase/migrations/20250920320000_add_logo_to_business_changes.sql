-- Migration: Add logo to business_changes supported types
-- Description: Allow logo uploads to require admin approval
-- Date: 2025-09-20 32:00:00 UTC

-- Add 'logo' to the change_type check constraint
ALTER TABLE public.business_changes 
DROP CONSTRAINT IF EXISTS business_changes_change_type_check;

ALTER TABLE public.business_changes 
ADD CONSTRAINT business_changes_change_type_check 
CHECK (change_type IN ('offer', 'secret_menu', 'business_images', 'business_info', 'menu_url', 'logo'));

-- Update comment
COMMENT ON COLUMN public.business_changes.change_type IS 'Type of change: offer, secret_menu, business_images, business_info, menu_url, logo';
