-- Add first_name and last_name fields to app_users table
-- Since GHL webhook provides these separately, we should store them separately

-- Add first_name and last_name columns
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Create indexes for name searches
CREATE INDEX IF NOT EXISTS idx_app_users_first_name ON public.app_users(first_name);
CREATE INDEX IF NOT EXISTS idx_app_users_last_name ON public.app_users(last_name);

-- Add comments explaining the fields
COMMENT ON COLUMN public.app_users.first_name IS 'User first name from GHL webhook data';
COMMENT ON COLUMN public.app_users.last_name IS 'User last name from GHL webhook data';

-- Update existing records to populate first_name and last_name from name field
UPDATE public.app_users 
SET 
  first_name = CASE 
    WHEN name IS NOT NULL AND position(' ' in name) > 0 
    THEN split_part(name, ' ', 1)
    ELSE name
  END,
  last_name = CASE 
    WHEN name IS NOT NULL AND position(' ' in name) > 0 
    THEN substring(name from position(' ' in name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL OR last_name IS NULL;
