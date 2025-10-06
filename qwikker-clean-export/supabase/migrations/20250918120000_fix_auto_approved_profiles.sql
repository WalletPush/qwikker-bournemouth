-- Migration: Fix auto-approved profiles that shouldn't be approved yet
-- Description: Reset profiles that were auto-approved in the previous migration back to 'incomplete' status
-- Date: 2025-09-18 12:00:00 UTC

-- Reset all profiles back to 'incomplete' status except those that were manually approved
-- Since we don't have any manually approved profiles yet, we can safely reset all to 'incomplete'
UPDATE public.profiles 
SET status = 'incomplete'
WHERE status = 'approved' AND approved_by IS NULL;

-- Add comment to clarify the approval process
COMMENT ON COLUMN public.profiles.status IS 'Business approval status: incomplete (default after signup), pending_review (submitted for review), approved (manually approved by admin), rejected (needs changes)';
