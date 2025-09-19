-- Fix approved_by constraint to reference city_admins instead of auth.users
-- This fixes the foreign key constraint error when admins approve businesses

-- Drop the existing foreign key constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_approved_by_fkey;

-- Change approved_by to reference city_admins table instead
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES public.city_admins(id);

-- Update the comment to reflect the new relationship
COMMENT ON COLUMN public.profiles.approved_by IS 'City admin who approved this business (references city_admins table)';
