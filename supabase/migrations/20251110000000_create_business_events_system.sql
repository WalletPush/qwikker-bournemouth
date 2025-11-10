-- Migration: Create business events system
-- Description: Creates business_events table for businesses to create and manage events
-- Events are similar to offers but focused on time-based happenings (workshops, live music, special occasions)
-- Date: 2025-11-10 00:00:00 UTC

-- Create business_events table
CREATE TABLE IF NOT EXISTS public.business_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Event details
  event_name text NOT NULL,
  event_type text CHECK (event_type IN (
    'live_music', 'workshop', 'tasting', 'special_occasion',
    'sports_viewing', 'quiz_night', 'comedy', 'open_mic',
    'themed_night', 'holiday_event', 'class', 'other'
  )) NOT NULL,
  event_description text NOT NULL,
  event_short_description text, -- Brief summary for cards/lists
  
  -- Timing
  event_date date NOT NULL,
  event_start_time time,
  event_end_time time,
  is_recurring boolean DEFAULT false,
  recurrence_pattern text CHECK (recurrence_pattern IN (
    'daily', 'weekly', 'biweekly', 'monthly', 'first_friday', 'last_saturday', null
  )),
  recurrence_end_date date,
  
  -- Booking/Registration
  requires_booking boolean DEFAULT false,
  booking_url text,
  booking_phone text,
  max_attendees integer,
  current_attendees integer DEFAULT 0,
  price_info text, -- "Free", "£10 per person", "£5-15 sliding scale"
  
  -- Media
  event_image text, -- URL to uploaded event image/poster
  
  -- Location (if different from business address)
  custom_location text,
  custom_address text,
  
  -- Status and approval
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
  approved_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_reason text,
  cancellation_reason text,
  
  -- Display
  is_featured boolean DEFAULT false, -- Highlight this event
  display_order integer DEFAULT 1,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE public.business_events IS 'Events created by businesses (workshops, live music, special occasions, etc.)';

-- Add column comments
COMMENT ON COLUMN public.business_events.event_short_description IS 'Brief 1-2 sentence summary for cards/previews';
COMMENT ON COLUMN public.business_events.recurrence_pattern IS 'How often the event repeats (if is_recurring is true)';
COMMENT ON COLUMN public.business_events.price_info IS 'Human-readable pricing (Free, £10, £5-15, etc.)';
COMMENT ON COLUMN public.business_events.custom_location IS 'Use if event is at a different location than business address';

-- Create indexes
CREATE INDEX idx_business_events_business_id ON public.business_events(business_id);
CREATE INDEX idx_business_events_status ON public.business_events(status);
CREATE INDEX idx_business_events_date ON public.business_events(event_date);
CREATE INDEX idx_business_events_approved_at ON public.business_events(approved_at DESC);
CREATE INDEX idx_business_events_type ON public.business_events(event_type);
CREATE INDEX idx_business_events_featured ON public.business_events(is_featured) WHERE is_featured = true;

-- Composite index for querying upcoming approved events
CREATE INDEX idx_business_events_upcoming ON public.business_events(event_date, status) 
  WHERE status = 'approved' AND event_date >= CURRENT_DATE;

-- Enable RLS
ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Businesses can view their own events"
  ON public.business_events FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.business_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Businesses can insert their own events"
  ON public.business_events FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.business_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Businesses can update their own events"
  ON public.business_events FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.business_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.business_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Businesses can delete their own pending events"
  ON public.business_events FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM public.business_profiles 
      WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  );

CREATE POLICY "Public can view approved upcoming events"
  ON public.business_events FOR SELECT
  USING (
    status = 'approved' 
    AND event_date >= CURRENT_DATE
  );

CREATE POLICY "Admins can view all events"
  ON public.business_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update all events"
  ON public.business_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid()
    )
  );

-- Create function to automatically mark past events as completed
CREATE OR REPLACE FUNCTION mark_past_events_completed()
RETURNS void AS $$
BEGIN
  UPDATE public.business_events
  SET status = 'completed'
  WHERE status = 'approved'
    AND event_date < CURRENT_DATE
    AND is_recurring = false;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle event updates (knowledge base sync)
CREATE OR REPLACE FUNCTION handle_event_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- If event is approved, set approved timestamp
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event updates
CREATE TRIGGER update_event_timestamp
  BEFORE UPDATE ON public.business_events
  FOR EACH ROW
  EXECUTE FUNCTION handle_event_update();

-- Create view for upcoming events with business details
CREATE OR REPLACE VIEW public.upcoming_events_with_business AS
SELECT 
  e.*,
  bp.business_name,
  bp.business_type,
  bp.business_category,
  bp.business_address,
  bp.business_town,
  bp.business_postcode,
  bp.city,
  bp.logo,
  bp.phone,
  bp.website_url,
  bp.instagram_handle,
  -- Calculate if event is happening soon (within 7 days)
  CASE 
    WHEN e.event_date <= CURRENT_DATE + INTERVAL '7 days' THEN true
    ELSE false
  END as is_happening_soon,
  -- Calculate if event is today
  CASE 
    WHEN e.event_date = CURRENT_DATE THEN true
    ELSE false
  END as is_today
FROM public.business_events e
INNER JOIN public.business_profiles bp ON e.business_id = bp.id
WHERE e.status = 'approved'
  AND e.event_date >= CURRENT_DATE
ORDER BY e.event_date ASC, e.event_start_time ASC;

-- Add comment to view
COMMENT ON VIEW public.upcoming_events_with_business IS 'Approved upcoming events with full business details and convenience flags';

-- Grant permissions
GRANT SELECT ON public.upcoming_events_with_business TO authenticated, anon;

