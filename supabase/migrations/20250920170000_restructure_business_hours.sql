-- Migration: Restructure business hours to JSONB for better AI parsing
-- Description: Convert business_hours from TEXT to structured JSONB format
-- Date: 2025-09-20 17:00:00 UTC

-- First, let's create a backup of existing data and convert it
-- Add new structured column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_hours_structured JSONB;

-- Comment on the new column
COMMENT ON COLUMN public.profiles.business_hours_structured IS 'Structured business hours in JSONB format for better AI parsing. Format: {"monday": {"open": "09:00", "close": "17:00", "closed": false}, ...}';

-- Create a function to convert existing text hours to structured format
CREATE OR REPLACE FUNCTION convert_text_hours_to_structured(hours_text TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    days TEXT[] := ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    day TEXT;
BEGIN
    -- Initialize with closed for all days
    result := '{}'::JSONB;
    
    FOREACH day IN ARRAY days
    LOOP
        result := result || jsonb_build_object(
            day, 
            jsonb_build_object(
                'open', null,
                'close', null,
                'closed', true,
                'notes', null
            )
        );
    END LOOP;
    
    -- If hours_text is provided, try to parse common formats
    IF hours_text IS NOT NULL AND hours_text != '' THEN
        -- For now, set a default "needs manual update" structure
        -- This will be updated by the UI when businesses edit their hours
        result := result || jsonb_build_object(
            'legacy_text', hours_text,
            'needs_conversion', true
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Convert existing business_hours to structured format
UPDATE public.profiles 
SET business_hours_structured = convert_text_hours_to_structured(business_hours)
WHERE business_hours_structured IS NULL;

-- Create index for better query performance on structured hours
CREATE INDEX IF NOT EXISTS idx_profiles_business_hours_structured ON public.profiles USING GIN (business_hours_structured);

-- Add constraint to ensure valid structure
ALTER TABLE public.profiles 
ADD CONSTRAINT check_business_hours_structured_format 
CHECK (
    business_hours_structured IS NULL OR (
        business_hours_structured ? 'monday' AND
        business_hours_structured ? 'tuesday' AND
        business_hours_structured ? 'wednesday' AND
        business_hours_structured ? 'thursday' AND
        business_hours_structured ? 'friday' AND
        business_hours_structured ? 'saturday' AND
        business_hours_structured ? 'sunday'
    )
);

-- Update the database types
COMMENT ON TABLE public.profiles IS 'Extended user profile data including personal information, business details, offers, and billing information. business_hours_structured contains AI-friendly structured hours.';

-- Clean up function
DROP FUNCTION IF EXISTS convert_text_hours_to_structured(TEXT);
