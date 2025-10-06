-- Add first_visit_completed column for smart routing
ALTER TABLE public.app_users 
ADD COLUMN first_visit_completed BOOLEAN DEFAULT FALSE;

-- Update existing users to have completed first visit (they're already using the system)
UPDATE public.app_users 
SET first_visit_completed = TRUE 
WHERE created_at < NOW();
