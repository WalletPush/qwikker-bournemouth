# Dynamic Multi-Country City System

## Overview

Both the global homepage (`qwikker.com`) and the business page (`qwikker.com/for-business`) now automatically display cities grouped by country, pulling from the database in real-time.

**Key benefit:** Add a new city in Supabase → it appears on the site within seconds. No code changes. No deployments.

---

## How It Works

### 1. Database-Driven Cities

All cities are stored in `franchise_crm_configs` table with:
- `city` (slug)
- `display_name` (e.g., "New York City")
- `subdomain` (e.g., "nyc")
- `status` ('active', 'pending_setup', 'coming_soon')
- `country_name` (e.g., "United States")
- `country_code` (e.g., "US")

### 2. Public View (`franchise_public_info`)

A safe, public view exposes only non-sensitive fields:
```sql
SELECT city, display_name, subdomain, status, country_name, timezone, currency_symbol
FROM franchise_crm_configs
WHERE status IN ('active', 'pending_setup', 'coming_soon')
```

This view is accessible to `anon` role (no auth required).

### 3. Frontend Grouping

Both pages fetch cities from `franchise_public_info` and group by `country_name`:

```typescript
// Fetch all cities
const { data: cities } = await supabase
  .from('franchise_public_info')
  .select('city, display_name, subdomain, status, country_name')
  .in('status', ['active', 'coming_soon'])
  .order('country_name')
  .order('display_name')

// Group by country
const groupedCities: Record<string, typeof cities> = {}
cities?.forEach((city) => {
  const country = city.country_name || 'Other'
  if (!groupedCities[country]) groupedCities[country] = []
  groupedCities[country].push(city)
})
```

### 4. Visual Hierarchy

**Live cities:**
- Green dot + "LIVE" badge
- Clickable links to `https://{subdomain}.qwikker.com`
- Hover effects

**Coming soon cities:**
- Grey dot + "Coming soon" badge
- Blurred/faded appearance
- Non-clickable

---

## Adding a New City (Zero Code Required)

### Option 1: Via HQ Admin Dashboard
1. Go to `/hqadmin`
2. Create new franchise
3. Set `status = 'coming_soon'` for placeholder
4. City appears on both pages instantly

### Option 2: Direct SQL
```sql
INSERT INTO franchise_crm_configs (
  city, display_name, subdomain, status, country_name, country_code,
  owner_name, owner_email, ghl_webhook_url, timezone
) VALUES (
  'miami', 'Miami', 'miami', 'coming_soon', 'United States', 'US',
  'QWIKKER HQ', 'hello@qwikker.com', 'https://placeholder.com', 'America/New_York'
);
```

Refresh the page → Miami now shows under "United States" with "Coming soon" badge.

### Option 3: Mark a City as Live
```sql
UPDATE franchise_crm_configs
SET status = 'active'
WHERE city = 'miami';
```

Refresh → Miami now shows as **LIVE** with green badge and clickable link.

---

## Countries Currently in Database

After running migration `20260125000004_add_coming_soon_cities.sql`:

- **United Kingdom:** Bournemouth (LIVE), Southampton, Brighton, London, Cornwall, Shrewsbury
- **United States:** Las Vegas, Dallas, NYC
- **Canada:** Calgary
- **United Arab Emirates:** Dubai
- **Spain:** Costa Blanca
- **France:** Paris
- **Thailand:** Bangkok, Koh Samui
- **Indonesia:** Bali

---

## Pages Affected

1. **`app/page.tsx` (Global Homepage)**
   - Fetches cities from `franchise_public_info`
   - Groups by country
   - Renders in "Live cities" section

2. **`app/for-business/page.tsx` (Business Marketing)**
   - Same fetch + grouping logic
   - Renders in "Is QWIKKER live in your city?" section
   - Live cities link to `{subdomain}.qwikker.com/business-signup`

3. **`components/marketing/global-homepage-premium.tsx`**
   - Client component receiving cities as props
   - Groups by country client-side
   - Renders with premium styling

---

## Security

✅ **Safe:** `franchise_public_info` view excludes all secrets (API keys, webhooks, passwords, etc.)

✅ **Controlled:** Only cities with status `active`, `pending_setup`, or `coming_soon` are visible

✅ **RLS-compatible:** View respects database permissions

---

## Migration History

- `20260125000003_create_franchise_public_info_view.sql` — Created safe public view
- `20260125000004_add_coming_soon_cities.sql` — Added 15 coming_soon cities + updated view to include them

---

## Testing

1. **Check current cities:**
   ```sql
   SELECT display_name, country_name, status 
   FROM franchise_public_info 
   ORDER BY country_name, display_name;
   ```

2. **Add test city:**
   ```sql
   INSERT INTO franchise_crm_configs (...) VALUES (...);
   ```

3. **Refresh homepage** → City should appear grouped under its country

4. **Change status to 'active'** → City badge changes to "LIVE" with green dot

---

## Future Enhancements (Optional)

- **Country filter pills:** When 20+ cities exist, add `All · UK · USA · Canada` filter buttons
- **User location detection:** Auto-expand user's country using IP geolocation
- **City search:** Add search bar when 50+ cities exist
- **Analytics:** Track which cities get the most clicks/interest

---

## Key Files

- `app/page.tsx` — Global homepage (fetches cities)
- `app/for-business/page.tsx` — Business page (fetches cities)
- `components/marketing/global-homepage-premium.tsx` — Client component (groups cities)
- `supabase/migrations/20260125000003_create_franchise_public_info_view.sql` — Public view
- `supabase/migrations/20260125000004_add_coming_soon_cities.sql` — Coming soon cities

---

**Last updated:** 2026-01-25
**Status:** ✅ Live and production-ready
