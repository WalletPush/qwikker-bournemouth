-- Migration: Force reset all profile statuses to incomplete
-- Description: Ensures all existing profiles start with incomplete status for proper approval workflow
-- Date: 2025-09-18 13:00:00 UTC

-- Reset ALL profiles to incomplete status regardless of current state
UPDATE public.profiles 
SET status = 'incomplete',
    approved_by = NULL,
    approved_at = NULL
WHERE status IS NOT NULL;

-- Also ensure any profiles without status get set to incomplete
UPDATE public.profiles 
SET status = 'incomplete'
WHERE status IS NULL;

-- Add a comment to document this reset
COMMENT ON COLUMN public.profiles.status IS 'Business approval status: incomplete (default - requires completion and admin approval), pending_review (submitted for review), approved (manually approved by admin), rejected (needs changes). Reset 2025-09-18 to ensure proper workflow.';
