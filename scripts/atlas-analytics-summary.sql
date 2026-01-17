-- Atlas Analytics Summary
-- View recent Atlas activity across all cities

-- Last 24 hours summary
SELECT 
  city,
  event_type,
  COUNT(*) AS count
FROM atlas_analytics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY city, event_type
ORDER BY city, event_type;

-- City performance (last 7 days)
SELECT 
  city,
  COUNT(CASE WHEN event_type = 'atlas_opened' THEN 1 END) AS opens,
  COUNT(CASE WHEN event_type = 'atlas_search_performed' THEN 1 END) AS searches,
  COUNT(CASE WHEN event_type = 'atlas_business_selected' THEN 1 END) AS business_views,
  COUNT(CASE WHEN event_type = 'atlas_directions_clicked' THEN 1 END) AS directions_clicks,
  COUNT(CASE WHEN event_type = 'atlas_returned_to_chat' THEN 1 END) AS returns,
  ROUND(
    100.0 * COUNT(CASE WHEN event_type = 'atlas_directions_clicked' THEN 1 END) 
    / NULLIF(COUNT(CASE WHEN event_type = 'atlas_opened' THEN 1 END), 0), 
    2
  ) AS conversion_rate_percent
FROM atlas_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY city
ORDER BY opens DESC;

-- Top businesses by map views (last 7 days)
SELECT 
  b.city,
  b.business_name,
  b.business_tier,
  COUNT(*) AS map_views,
  COUNT(CASE WHEN a.event_type = 'atlas_directions_clicked' THEN 1 END) AS directions_clicks
FROM atlas_analytics a
JOIN business_profiles b ON a.business_id = b.id
WHERE a.created_at > NOW() - INTERVAL '7 days'
  AND a.event_type IN ('atlas_business_selected', 'atlas_directions_clicked')
GROUP BY b.city, b.business_name, b.business_tier
ORDER BY map_views DESC
LIMIT 20;

-- Top search queries (last 7 days)
SELECT 
  city,
  query,
  COUNT(*) AS search_count
FROM atlas_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
  AND event_type = 'atlas_search_performed'
  AND query IS NOT NULL
GROUP BY city, query
ORDER BY search_count DESC
LIMIT 20;

-- Device breakdown (last 7 days)
SELECT 
  city,
  device_type,
  COUNT(*) AS events,
  AVG(CASE WHEN performance_mode THEN 1 ELSE 0 END) * 100 AS performance_mode_pct
FROM atlas_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
  AND event_type = 'atlas_opened'
GROUP BY city, device_type
ORDER BY city, events DESC;
