-- Fix claim flow database issues
-- Run this in Supabase SQL Editor

-- 1. Add missing submitted_at column
ALTER TABLE claim_requests 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Verify all required columns exist
SELECT 
  'claim_requests columns:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'claim_requests'
ORDER BY ordinal_position;

-- 3. Check for any other missing columns
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_requests' AND column_name = 'submitted_at') 
    THEN '✅ submitted_at exists'
    ELSE '❌ submitted_at MISSING'
  END as submitted_at_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_requests' AND column_name = 'edited_hours') 
    THEN '✅ edited_hours exists'
    ELSE '❌ edited_hours MISSING'
  END as edited_hours_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claim_requests' AND column_name = 'logo_upload') 
    THEN '✅ logo_upload exists'
    ELSE '❌ logo_upload MISSING'
  END as logo_upload_check;

