-- ============================================================================
-- ATLAS ANALYTICS: Track user engagement and conversions
-- ============================================================================

CREATE TABLE IF NOT EXISTS atlas_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  user_id TEXT,                    -- wallet_pass_id or session ID
  city TEXT NOT NULL,              -- Franchise city
  
  -- What
  event_type TEXT NOT NULL CHECK (event_type IN (
    'atlas_opened',
    'atlas_search_performed',
    'atlas_business_selected',
    'atlas_directions_clicked',
    'atlas_returned_to_chat',
    'atlas_closed'
  )),
  
  -- Context
  query TEXT,                      -- Search query (if applicable)
  query_length INTEGER,            -- Length of query
  results_count INTEGER,           -- Number of results returned
  business_id UUID,                -- Business selected (if applicable)
  
  -- Device
  device_type TEXT,                -- 'mobile', 'tablet', 'desktop'
  user_agent TEXT,                 -- Full user agent string
  performance_mode BOOLEAN,        -- Was performance mode active?
  
  -- When
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Session tracking
  session_id TEXT,                 -- To group events in same session
  time_in_atlas_seconds INTEGER    -- How long they spent before this event
);

-- Indexes for fast queries
CREATE INDEX idx_atlas_analytics_city ON atlas_analytics(city);
CREATE INDEX idx_atlas_analytics_event_type ON atlas_analytics(event_type);
CREATE INDEX idx_atlas_analytics_created_at ON atlas_analytics(created_at DESC);
CREATE INDEX idx_atlas_analytics_session ON atlas_analytics(session_id);

-- RLS: Service role only (analytics are sensitive)
ALTER TABLE atlas_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON atlas_analytics FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE atlas_analytics IS 'Atlas engagement and conversion tracking';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Atlas analytics table created!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Track events:';
  RAISE NOTICE '   - atlas_opened (entry)';
  RAISE NOTICE '   - atlas_search_performed (search)';
  RAISE NOTICE '   - atlas_business_selected (click marker)';
  RAISE NOTICE '   - atlas_directions_clicked (conversion!)';
  RAISE NOTICE '   - atlas_returned_to_chat (exit)';
  RAISE NOTICE '   - atlas_closed (closed without returning)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Key Metrics:';
  RAISE NOTICE '   Conversion Rate = directions_clicked / atlas_opened';
  RAISE NOTICE '   Engagement Rate = search_performed / atlas_opened';
  RAISE NOTICE '   Return Rate = returned_to_chat / atlas_opened';
  RAISE NOTICE '';
END $$;
