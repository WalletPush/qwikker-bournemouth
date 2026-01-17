# 🗺️ ATLAS v1 - Interactive Map Discovery

**Atlas** is a full-screen, map-based discovery mode integrated into the QWIKKER AI Companion. It brings businesses to life with atmospheric 3D maps, smooth animations, and location-aware recommendations.

---

## ✨ Features

### Map Experience
- **Mapbox GL JS** with dark atmospheric theme + fog effects
- **3D perspective** with customizable pitch (default 45°) and bearing
- **Glowing markers** for businesses with rating-based filtering
- **Smooth flyTo animations** with curved trajectories
- **User location tracking** with localStorage caching (30min)
- **Walking time estimation** using Haversine formula (4.8 km/h)

### User Interface
- **Floating search input** with instant results
- **Business info bubble** with ratings, category, address
- **Directions CTA** opens Apple Maps (iOS) or Google Maps (Android/Desktop)
- **Back to Chat button** returns to AI Companion
- **Sound toggle** for ambient audio (wake/move/arrive sounds)

### Security & Multi-Tenancy
- **Tenant city validation** server-side from hostname
- **Per-franchise Mapbox tokens** (NO CENTRAL BILLING)
- **Rating filter** respects `atlas_min_rating` (default 4.4★)
- **City-scoped queries** ensure businesses only from current franchise

---

## 📁 File Structure

```
/app/api/atlas/
  search/route.ts              # Tenant-locked business search endpoint

/components/atlas/
  AtlasMode.tsx                # Main full-screen map component
  AtlasOverlay.tsx             # Floating UI (input, bubble, controls)

/lib/atlas/
  useTenantAtlasConfig.ts      # Fetch Atlas config from tenant API

/lib/location/
  useUserLocation.ts           # User geolocation with caching + fallback

/supabase/migrations/
  20260117000001_add_atlas_to_franchise_configs.sql  # Atlas DB schema

/public/sfx/
  atlas-wake.mp3               # Played when entering Atlas
  atlas-move.mp3               # Played on flyTo start (throttled 8s)
  atlas-arrive.mp3             # Played at flyTo end
```

---

## 🗄️ Database Schema

### `franchise_crm_configs` (new columns)

```sql
-- Feature flag
atlas_enabled BOOLEAN DEFAULT false

-- Map provider
atlas_provider TEXT DEFAULT 'mapbox'

-- Mapbox configuration
mapbox_public_token TEXT              -- Public token (safe for browser)
mapbox_style_url TEXT                 -- e.g., mapbox://styles/mapbox/dark-v11

-- Map view settings
atlas_default_zoom NUMERIC DEFAULT 13  -- City-level zoom
atlas_pitch NUMERIC DEFAULT 45         -- 3D perspective angle
atlas_bearing NUMERIC DEFAULT 0        -- Map rotation

-- Search/filter settings
atlas_max_results INTEGER DEFAULT 12   -- Max businesses to show at once
atlas_min_rating NUMERIC DEFAULT 4.4   -- Minimum rating for businesses
atlas_mode TEXT DEFAULT 'curated'      -- 'curated' | 'all'
```

---

## 🔌 API Endpoints

### `GET /api/tenant/config`

**Enhanced to include Atlas configuration**

```typescript
{
  ok: true,
  city: "bournemouth",
  status: "active",
  center: { lat: 50.7192, lng: -1.8808 },
  atlas: {
    enabled: true,
    provider: "mapbox",
    mapboxPublicToken: "pk.ey...",  // Public token
    styleUrl: "mapbox://styles/mapbox/dark-v11",
    defaultZoom: 13,
    pitch: 45,
    bearing: 0,
    maxResults: 12,
    minRating: 4.4,
    mode: "curated"
  }
}
```

### `GET /api/atlas/search?q={query}&limit={limit}`

**Search businesses for Atlas map**

**Query params:**
- `q` (optional): Search query (name/category/tagline/address)
- `limit` (optional): Max results (defaults to franchise `atlas_max_results`)

**Response:**
```typescript
{
  ok: true,
  results: [
    {
      id: string
      business_name: string
      latitude: number
      longitude: number
      rating: number
      review_count: number
      business_tagline?: string
      display_category?: string
      business_address?: string
      google_place_id?: string
      website_url?: string
      phone?: string
    }
  ],
  meta: {
    city: string
    query: string
    count: number
    minRating: number
  }
}
```

**Security:**
- City derived from hostname server-side
- Only returns businesses for current tenant city
- Filters by `rating >= atlas_min_rating`
- Only returns approved or unclaimed businesses
- Only returns businesses with lat/lng

---

## 🎯 Integration with AI Companion

### Chat Flow

1. User asks AI: *"Show me restaurants near me"*
2. AI returns business recommendations (carousel)
3. **"Show on Map" button** appears below carousel
4. User clicks → Chat dissolves → Atlas appears
5. User searches/explores → **"Back to Chat"** returns to conversation

### Implementation

```tsx
// In components/user/user-chat-page.tsx

const [view, setView] = useState<'chat' | 'atlas'>('chat')
const { config } = useTenantAtlasConfig()
const { coords } = useUserLocation()

// Show Atlas button after business recommendations
{atlasEnabled && message.businessCarousel?.length > 0 && (
  <button onClick={() => setView('atlas')}>
    <Map /> Show on Map
  </button>
)}

// Render Atlas when view === 'atlas'
{view === 'atlas' && (
  <AtlasMode
    config={config.atlas}
    center={config.center}
    userLocation={coords}
    onClose={() => setView('chat')}
  />
)}
```

---

## 🔧 Setup Guide

### 1. Run Migration

```bash
# Apply Atlas schema changes
psql -f supabase/migrations/20260117000001_add_atlas_to_franchise_configs.sql
```

### 2. Configure Franchise

```sql
-- Enable Atlas for Bournemouth
UPDATE franchise_crm_configs
SET
  atlas_enabled = true,
  mapbox_public_token = 'pk.ey...',  -- Get from Mapbox dashboard
  mapbox_style_url = 'mapbox://styles/mapbox/dark-v11',
  atlas_default_zoom = 13,
  atlas_pitch = 45,
  atlas_bearing = 0,
  atlas_max_results = 12,
  atlas_min_rating = 4.4
WHERE city = 'bournemouth';
```

### 3. Get Mapbox Token

1. Go to [Mapbox Account](https://account.mapbox.com/)
2. Create new **Public Token**
3. Copy token (starts with `pk.`)
4. Add to `franchise_crm_configs.mapbox_public_token`

**IMPORTANT:** Each franchise needs their OWN token. Do NOT share tokens or use central billing.

### 4. Test Atlas

```bash
# Start dev server
pnpm dev

# Visit AI Companion
open http://localhost:3000/user/chat

# Ask AI: "Show me restaurants"
# Click "Show on Map" button
# Atlas should load with markers
```

---

## 🎨 Customization

### Map Style

Use any Mapbox style URL:

```sql
-- Dark (default)
mapbox_style_url = 'mapbox://styles/mapbox/dark-v11'

-- Light
mapbox_style_url = 'mapbox://styles/mapbox/light-v11'

-- Satellite
mapbox_style_url = 'mapbox://styles/mapbox/satellite-streets-v12'

-- Custom style
mapbox_style_url = 'mapbox://styles/your-username/your-style-id'
```

### View Settings

```sql
-- More zoomed in (street level)
UPDATE franchise_crm_configs
SET atlas_default_zoom = 15
WHERE city = 'bournemouth';

-- Flat 2D view
UPDATE franchise_crm_configs
SET atlas_pitch = 0
WHERE city = 'bournemouth';

-- Rotated map (north-west facing)
UPDATE franchise_crm_configs
SET atlas_bearing = 45
WHERE city = 'bournemouth';
```

### Rating Filter

```sql
-- Show only top-rated businesses (4.5+)
UPDATE franchise_crm_configs
SET atlas_min_rating = 4.5
WHERE city = 'bournemouth';

-- Show all businesses (3.0+)
UPDATE franchise_crm_configs
SET atlas_min_rating = 3.0
WHERE city = 'bournemouth';
```

---

## 🔊 Sound Effects

### Current Status
Atlas includes 3 placeholder sound files:
- `public/sfx/atlas-wake.mp3` - Played when entering Atlas
- `public/sfx/atlas-move.mp3` - Played on flyTo start (max once per 8s)
- `public/sfx/atlas-arrive.mp3` - Played at flyTo end

**TODO:** Replace with real audio files (currently just text placeholders)

### Behavior
- **Default:** Sounds OFF (user must enable via toggle)
- **Toggle:** Top-right button (volume icon)
- **Throttling:** Move sound limited to once per 8 seconds

---

## 🚨 Troubleshooting

### Map doesn't load

**Check:**
1. `atlas_enabled = true` in `franchise_crm_configs`
2. `mapbox_public_token` is set and valid
3. Console for Mapbox errors
4. Network tab for 401/403 errors

**Fix:**
```sql
SELECT atlas_enabled, mapbox_public_token
FROM franchise_crm_configs
WHERE city = 'bournemouth';
```

### No businesses showing

**Check:**
1. Businesses have `latitude` and `longitude` set
2. Businesses meet `atlas_min_rating` threshold
3. Businesses have `status IN ('approved', 'unclaimed')`
4. Businesses match current franchise city

**Debug:**
```sql
SELECT COUNT(*)
FROM business_profiles
WHERE city = 'bournemouth'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND rating >= 4.4
  AND status IN ('approved', 'unclaimed');
```

### "Show on Map" button doesn't appear

**Check:**
1. AI returned business recommendations (carousel)
2. `atlas_enabled = true` for franchise
3. `mapbox_public_token` is set
4. React component state (`atlasEnabled` is true)

---

## 📊 Performance

### Optimization Tips

1. **Limit Results:** Keep `atlas_max_results` ≤ 50
2. **Cache Location:** User location cached 30min in localStorage
3. **Throttle Sounds:** Move sound throttled to 8s
4. **Lazy Load:** Mapbox loaded dynamically (not in main bundle)

### Bundle Size

- `mapbox-gl`: ~600KB (gzipped)
- `@types/mapbox-gl`: 0KB (dev only)
- Atlas components: ~15KB (gzipped)

---

## 🔮 Future Enhancements

### Phase 2 (Nice to Have)
- [ ] Real-time business status indicators
- [ ] Cluster markers for dense areas
- [ ] Route visualization (curved lines)
- [ ] Custom marker icons per category
- [ ] Save favorite locations
- [ ] Share map view URL
- [ ] Heatmap mode for popularity
- [ ] Time-based filters (open now, happy hour)

### Phase 3 (Advanced)
- [ ] 3D building extrusions
- [ ] Street-level imagery integration
- [ ] AR mode (camera overlay)
- [ ] Social features (friends on map)
- [ ] Event pins (concerts, markets)
- [ ] Transit integration
- [ ] Weather overlay

---

## 📝 Notes

- **Multi-tenant:** Each franchise has separate Mapbox token (NO shared billing)
- **Security:** All queries filtered by tenant city server-side
- **Progressive:** Atlas disabled by default (feature flag)
- **Responsive:** Works on mobile, tablet, desktop
- **Accessible:** Keyboard navigation, ARIA labels
- **Offline:** Graceful fallback if Mapbox unavailable

---

## 🎉 Credits

Built for QWIKKER by the dev team  
Powered by Mapbox GL JS  
Map data © OpenStreetMap contributors
