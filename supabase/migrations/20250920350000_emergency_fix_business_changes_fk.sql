-- Emergency fix for business_changes foreign key
-- This migration ensures business_changes references business_profiles correctly

-- First, check if the table exists and what it references
DO $$
BEGIN
    -- Drop the existing foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'business_changes_business_id_fkey' 
        AND table_name = 'business_changes'
    ) THEN
        ALTER TABLE public.business_changes DROP CONSTRAINT business_changes_business_id_fkey;
    END IF;
    
    -- Add the correct foreign key constraint to business_profiles
    ALTER TABLE public.business_changes 
    ADD CONSTRAINT business_changes_business_id_fkey 
    FOREIGN KEY (business_id) REFERENCES public.business_profiles(id) ON DELETE CASCADE;
    
    -- Update RLS policies to reference the correct table
    DROP POLICY IF EXISTS "Users can view their own business changes" ON public.business_changes;
    DROP POLICY IF EXISTS "Users can insert their own business changes" ON public.business_changes;
    
    -- Recreate policies with correct table reference
    CREATE POLICY "Users can view their own business changes" ON public.business_changes
      FOR SELECT USING (
        business_id IN (
          SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
        )
      );
    
    CREATE POLICY "Users can insert their own business changes" ON public.business_changes
      FOR INSERT WITH CHECK (
        business_id IN (
          SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
        )
      );
    
    -- Add logo to change_type enum if not already there
    BEGIN
        ALTER TABLE public.business_changes 
        DROP CONSTRAINT IF EXISTS business_changes_change_type_check;
        
        ALTER TABLE public.business_changes 
        ADD CONSTRAINT business_changes_change_type_check 
        CHECK (change_type IN ('offer', 'secret_menu', 'business_images', 'business_info', 'menu_url', 'logo'));
    EXCEPTION
        WHEN OTHERS THEN
            -- Constraint might already exist, ignore error
            NULL;
    END;
    
END $$;

-- Update comment
COMMENT ON TABLE public.business_changes IS 'Tracks all business changes that require admin approval - references business_profiles table';
