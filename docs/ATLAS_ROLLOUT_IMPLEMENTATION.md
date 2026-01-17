# 🚀 ATLAS ROLLOUT CONTROLS - IMPLEMENTATION GUIDE

**Status:** Ready to implement  
**Branch:** atlas-prototype  
**Estimated Time:** 4-6 hours full implementation

---

## ✅ ALREADY COMPLETED

1. **Database Migrations:**
   - ✅ `20260117000001_add_atlas_to_franchise_configs.sql` (Atlas fields)
   - ✅ `20260117000002_add_atlas_analytics.sql` (Analytics table - called `atlas_analytics` not `atlas_events`)

2. **Core Atlas Features:**
   - ✅ AtlasMode component (full-screen map)
   - ✅ AtlasOverlay (UI controls)
   - ✅ ChatContextStrip (context preservation)
   - ✅ Performance mode (auto-detect)
   - ✅ Analytics tracking hooks

3. **API Endpoints:**
   - ✅ `/api/tenant/config` (returns Atlas config)
   - ✅ `/api/atlas/search` (tenant-locked search)
   - ✅ `/api/atlas/analytics` (event tracking)

---

## 🔧 IMPLEMENTATION TASKS

### PHASE 1: API ENDPOINTS (Critical)

**A. Update /api/tenant/config validation**
- Current: Returns atlas config
- **TODO:** Add effective `atlas.enabled` computation:
  ```typescript
  atlas.enabled = (
    config.status === 'active' &&
    config.atlas_enabled === true &&
    config.mapbox_public_token !== null &&
    config.mapbox_style_url !== null &&
    centerLat !== null && centerLng !== null
  )
  ```
- **TODO:** Add helpful `message` when disabled

**B. Rename analytics events endpoint**
- Current: `/api/atlas/analytics`
- **TODO:** Keep as-is OR create alias `/api/atlas/events`
- Table name: `atlas_analytics` (keep as-is, matches spec closely)

**C. Create HQ metrics endpoint**
- **File:** `app/api/hqadmin/atlas/metrics/route.ts`
- **Auth:** HQ admin only (use `requireHQAdmin()`)
- **Query params:** `?city=xxx` (optional)
- **Returns:** Last 7 days aggregated events

**D. Create city admin metrics endpoint**
- **File:** `app/api/admin/atlas/metrics/route.ts`
- **Auth:** City admin only
- **Returns:** Metrics for their city only

**E. Create business dashboard metrics endpoint**
- **File:** `app/api/dashboard/atlas/metrics/route.ts`
- **Auth:** Business owner (check business_profiles.user_id)
- **Tier-gated:** Check business tier
- **Returns:**
  - Featured: mapViews, directionsClicks, conversion%
  - Spotlight: + topQueries, peakHours

---

### PHASE 2: HQ ADMIN UI

**A. Atlas Configuration Section**
- **File:** Update HQ Admin franchise editor
- **Location:** `app/hqadmin/franchises/[id]/page.tsx` or similar
- **Fields:**
  - `atlas_enabled` (toggle)
  - `mapbox_public_token` (password input, masked)
  - `mapbox_style_url` (text input with examples)
  - `atlas_min_rating` (0-5 slider)
  - `atlas_max_results` (1-50 input)
  - `atlas_default_zoom`, `atlas_pitch`, `atlas_bearing`
  - `onboarding_search_radius_m`, `import_search_radius_m`, `import_max_radius_m`
  - `lat`, `lng` (city center, editable if missing)

**B. Validation Logic**
```typescript
if (atlas_enabled === true) {
  if (!mapbox_public_token) return error("Token required")
  if (!mapbox_style_url) return error("Style URL required")
  if (!lat || !lng) return error("City center required")
  if (atlas_min_rating < 0 || atlas_min_rating > 5) return error("Rating 0-5")
  if (atlas_max_results < 1 || atlas_max_results > 50) return error("Max results 1-50")
  if (import_search_radius_m > import_max_radius_m) return error("Search radius exceeds max")
}
```

**C. Test Atlas Config Button**
- Calls `/api/tenant/config?city={city}` from HQ context
- Displays:
  - ✅/❌ `atlas.enabled`
  - ✅/❌ Has token
  - ✅/❌ Has style
  - ✅/❌ Has center
  - Computed message

**D. HQ Analytics Panel**
- Shows last 7 days for selected city:
  - Opens, Searches, Result clicks, Directions clicks
- Fetches from `/api/hqadmin/atlas/metrics?city={city}`

---

### PHASE 3: FRANCHISE SETUP WIZARD

**A. Add "Map & Atlas" Step**
- **File:** `components/franchise-onboarding-form.tsx` or wizard component
- **Step:** After "Email/SMS Setup", before "Review"
- **Title:** "Map & Atlas Discovery (Optional)"

**B. Fields (all optional)**
- `atlas_enabled` (toggle, default OFF)
- `mapbox_public_token` (with validation if enabled)
- `mapbox_style_url` (default `mapbox://styles/mapbox/dark-v11`)
- `atlas_min_rating` (default 4.4)
- `atlas_max_results` (default 12)

**C. Copy (Reassuring)**
```
🗺️ Atlas Discovery

Atlas adds an interactive map to your AI Companion, 
letting users visualize and explore businesses spatially.

**Mapbox Pricing (Don't Worry!)**
Atlas uses Mapbox, which includes a generous free tier 
(tens of thousands of map loads/month). Most small cities 
stay free or very low-cost early on.

You use your own Mapbox account (no central billing). 
If you exceed free usage, Mapbox bills you directly.

💡 What counts as a map load?
Each time a user opens Atlas = ~1 web map load.
Panning/zooming doesn't multiply loads dramatically.
If Atlas gets heavy traffic, costs rise—but that's a 
good problem (high engagement!).

[Learn more about Mapbox pricing →]
```

**D. Validation**
- If `atlas_enabled` toggled ON, require token + style
- Show warning if missing center coordinates
- Allow skip/continue without Atlas

---

### PHASE 4: IMPORT TOOL UPDATES

**A. Remove Hardcoded Max**
- **File:** Find import radius slider (likely in admin import tool)
- **Current:** Max hardcoded to ~16000m (10 miles)
- **Update:** Max = `import_max_radius_m` from tenant config (default 200000m)

**B. Display**
- Show both miles and km
- Enforce `import_search_radius_m <= import_max_radius_m`

---

### PHASE 5: BUSINESS DASHBOARD WIDGET

**A. Create "Map Discovery" Widget**
- **File:** `components/dashboard/map-discovery-widget.tsx`
- **Location:** Add to business dashboard alongside other widgets

**B. Tier Gating**
```typescript
if (tier === 'free' || tier === 'starter' || !tier) {
  return <UpgradeCard 
    title="Map Discovery" 
    message="Upgrade to Featured to see how Atlas drives visits"
  />
}

if (tier === 'featured' || tier === 'spotlight') {
  // Show basic metrics
  const { mapViews, directionsClicks, conversionRate } = await fetchMetrics()
  
  return <Widget>
    <Stat label="Map Views" value={mapViews} />
    <Stat label="Directions Clicked" value={directionsClicks} />
    <Stat label="Conversion Rate" value={`${conversionRate}%`} />
    
    {tier === 'spotlight' && (
      <>
        <TopQueries queries={topQueries} />
        <PeakTimes hours={peakHours} />
      </>
    )}
  </Widget>
}
```

**C. Endpoint**
- Fetches from `/api/dashboard/atlas/metrics`
- Auth: Business owner only
- Tier check: Returns appropriate data

---

### PHASE 6: QA & SANITY SCRIPTS

**A. Config Sanity Check**
```sql
-- File: scripts/atlas-config-sanity.sql
SELECT 
  city,
  status,
  atlas_enabled,
  (mapbox_public_token IS NOT NULL) AS has_token,
  (mapbox_style_url IS NOT NULL) AS has_style,
  lat,
  lng,
  atlas_min_rating,
  atlas_max_results,
  onboarding_search_radius_m,
  import_search_radius_m,
  import_max_radius_m,
  CASE
    WHEN status = 'active' 
      AND atlas_enabled = true
      AND mapbox_public_token IS NOT NULL
      AND mapbox_style_url IS NOT NULL
      AND lat IS NOT NULL
      AND lng IS NOT NULL
    THEN '✅ ENABLED'
    WHEN atlas_enabled = true
    THEN '⚠️  CONFIGURED BUT INVALID'
    ELSE '⭕ DISABLED'
  END as atlas_status
FROM franchise_crm_configs
ORDER BY city;
```

**B. Events Sanity Check**
```sql
-- File: scripts/atlas-events-sanity.sql
SELECT 
  city,
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM atlas_analytics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY city, event_type
ORDER BY city, event_type;

-- Conversion funnel
SELECT 
  city,
  COUNT(*) FILTER (WHERE event_type = 'atlas_opened') as opens,
  COUNT(*) FILTER (WHERE event_type = 'atlas_search_performed') as searches,
  COUNT(*) FILTER (WHERE event_type = 'atlas_business_selected') as clicks,
  COUNT(*) FILTER (WHERE event_type = 'atlas_directions_clicked') as conversions,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'atlas_directions_clicked') * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'atlas_opened'), 0),
    2
  ) as conversion_rate_percent
FROM atlas_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY city
ORDER BY city;
```

---

## 📊 TESTING CHECKLIST

### HQ Admin
- [ ] Can view franchise Atlas config
- [ ] Can toggle atlas_enabled
- [ ] Can add/edit Mapbox token
- [ ] Test button shows correct status
- [ ] Validation prevents invalid configs
- [ ] Can see Atlas metrics per city

### Franchise Wizard
- [ ] Map & Atlas step appears
- [ ] Can skip (proceed without Atlas)
- [ ] Can enable with token
- [ ] Validation works
- [ ] Reassuring copy displays

### Business Dashboard
- [ ] Free/Starter: Shows upgrade card
- [ ] Featured: Shows basic metrics
- [ ] Spotlight: Shows advanced metrics
- [ ] Metrics update correctly

### Atlas Runtime
- [ ] Only loads when effectively enabled
- [ ] Events track correctly
- [ ] Performance mode works
- [ ] Analytics populate table

---

## 🚀 DEPLOYMENT SEQUENCE

1. **Run migrations** (already done ✅)
2. **Deploy API endpoints** (backend first)
3. **Deploy HQ Admin UI** (HQ team can configure)
4. **Enable Atlas for Bournemouth** (pilot city)
5. **Monitor analytics** (check for errors)
6. **Deploy business dashboard** (let businesses see value)
7. **Add to wizard** (new franchises get setup flow)

---

## 🎯 SUCCESS METRICS

**Week 1:**
- ✅ Atlas enabled for 1 city (Bournemouth)
- ✅ >10% of AI Companion users click "Show on Map"
- ✅ >25% of Atlas opens result in directions click
- ✅ Zero critical errors in logs

**Week 2:**
- ✅ Enable for 2-3 more cities
- ✅ Businesses see "Map Discovery" widget
- ✅ First business upgrade mention of Atlas value

**Month 1:**
- ✅ All active cities have Atlas available
- ✅ Clear tier differentiation (Featured vs Spotlight analytics)
- ✅ Positive business feedback on insights

---

## 💡 IMPLEMENTATION NOTES

1. **Keep backwards compatible:** Atlas disabled by default
2. **Fail gracefully:** If Mapbox fails, show error, return to chat
3. **Privacy first:** Aggregate only, no PII in analytics
4. **Tier gates:** Enforce at API level (don't trust client)
5. **Multi-tenant:** Always derive city server-side

---

**Ready to implement? This is the complete roadmap.**
