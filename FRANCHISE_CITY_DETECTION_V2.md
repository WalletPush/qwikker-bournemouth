# Franchise City Detection V2 - DB-Driven

## What Changed

**Before (V1):**
- ❌ Hardcoded list of cities in `client-city-detection.ts`
- ❌ Threw errors for unknown subdomains (Bali worked only because of fallbacks)
- ❌ Required code deploy for each new city launch

**After (V2):**
- ✅ DB-driven validation via `/api/franchise/cities` endpoint
- ✅ Fails gracefully (returns null, lets server validate)
- ✅ Two-layer caching (memory + localStorage)
- ✅ **Adding new city = just add to DB, no code changes!**

---

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. getCityFromHostnameClient('manchester.qwikker.com')
       │    → returns 'manchester' (synchronous, no validation)
       │
       │ 2. resolveClientCityFromHostname('manchester.qwikker.com') 
       │    → checks cache / fetches / validates
       ▼
┌─────────────────────┐
│  Memory Cache       │ ← 5 min TTL
│  (fastest)          │
└──────┬──────────────┘
       │ cache miss
       ▼
┌─────────────────────┐
│  localStorage       │ ← 5 min TTL, persists across reloads
│  (fast)             │
└──────┬──────────────┘
       │ cache miss
       ▼
┌─────────────────────────────────┐
│  GET /api/franchise/cities      │
│  - Reads franchise_public_info  │
│  - Returns ['bournemouth',      │
│    'bali', 'manchester', ...]   │
│  - CDN cached (5 min)           │
└─────────────────────────────────┘
```

---

## Adding a New City

### ✅ V2 (Current) - 1 Step

```sql
-- 1. Add to database
INSERT INTO franchise_crm_configs (city, subdomain, status, ...)
VALUES ('manchester', 'manchester', 'active', ...);

-- Done! manchester.qwikker.com works immediately for new visitors
-- Existing visitors: within 5 minutes (client cache TTL)
```

**Cache propagation:**
- New visitors: **Instant** (no stale cache)
- Browser cache: 5 minutes
- CDN cache: 5 minutes (fresh) + 1 hour (stale-while-revalidate)
- Client memory: 5 minutes
- Client localStorage: 5 minutes

### ❌ V1 (Old) - 3 Steps

```typescript
// 1. Update client-city-detection.ts
export const KNOWN_FRANCHISE_CITIES = [
  'bournemouth',
  'manchester',  // ← manually add
  ...
]

// 2. Update cityMap
const cityMap = {
  'manchester': 'manchester',  // ← manually add
  ...
}

// 3. Deploy code
```

---

## API Reference

### `/api/franchise/cities`

**Public endpoint** - Returns valid franchise cities/subdomains

**Security:**
- ✅ Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe for public access)
- ✅ Reads from `franchise_public_info` view (public-safe data only)
- ✅ RLS enforced naturally (anon key respects Row Level Security)
- ❌ Never uses service role key (would bypass RLS)

**Response:**
```json
{
  "franchises": [
    { "subdomain": "bournemouth", "display_name": "Bournemouth", "status": "active" },
    { "subdomain": "bcp", "display_name": "Bournemouth, Christchurch & Poole", "status": "active" },
    { "subdomain": "bali", "display_name": "Bali", "status": "active" },
    { "subdomain": "manchester", "display_name": "Manchester", "status": "coming_soon" }
  ]
}
```

**Important:** 
- `subdomain` is what the client validates (from hostname)
- `display_name` is what the UI shows (from DB, not heuristics!)
- `status` indicates access level (active = full, coming_soon = landing page only)

**Caching:**
- CDN: 5 minutes fresh (`max-age=300`)
- Stale-while-revalidate: 1 hour (serves stale while fetching fresh)
- Client memory: 5 minutes (matches API TTL)
- Client localStorage: 5 minutes (matches API TTL)
- Client fetch: Uses browser cache (no `cache: 'no-store'` to fight CDN)

---

## Client Functions

### `getCityFromHostnameClient(hostname: string): string`

**Synchronous** - For backward compatibility with existing components

```typescript
const city = getCityFromHostnameClient(window.location.hostname)
// Returns: 'manchester' (no validation, instant)
```

- ✅ Works immediately (no async)
- ⚠️ No validation (use for non-critical paths)
- ✅ Falls back gracefully

### `resolveClientCityFromHostname(hostname: string): Promise<string | null>`

**Asynchronous** - With DB validation

```typescript
const city = await resolveClientCityFromHostname(window.location.hostname)
// Returns: 'manchester' if valid, null if not found
```

- ✅ Validates against DB
- ✅ Uses cache (fast after first load)
- ✅ Returns null for invalid cities (server decides)

### `preloadFranchiseCities(): Promise<void>`

**Preload helper** - Warm cache early

```typescript
// In root layout or app wrapper
useEffect(() => {
  preloadFranchiseCities() // Warms cache in background
}, [])
```

---

## Graceful Failure

**Key principle:** Client validation is UX optimization, not security

```typescript
// If API fails (network down, cold start, etc.):
const cities = await getValidClientFranchiseCities()
// → Returns: [] (empty array)

// Component behavior:
if (!cities.length) {
  // Allow anyway, let server validate
  return subdomain
}
```

**Why?**
- Client can't be trusted anyway (security is server-side)
- Better to show page with server validation than block user
- Prevents "client says no, server says yes" conflicts

---

## Migration Notes

### Existing Components (No Changes Needed)

These components already use `getCityFromHostnameClient()` synchronously:
- `components/dashboard/pricing-plans.tsx`
- `components/dashboard/founding-member-banner.tsx`
- `components/dashboard/improved-dashboard-home.tsx`

They will continue working because:
1. Function signature unchanged (still synchronous)
2. Now returns subdomain directly (no validation)
3. Server-side validation still authoritative

### For New Components

**Prefer:**
```typescript
const city = await resolveClientCityFromHostname(window.location.hostname)
if (!city) {
  // Invalid city, show error or redirect
}
```

**Over:**
```typescript
const city = getCityFromHostnameClient(window.location.hostname)
// No validation, just extracts subdomain
```

---

## Testing

### Test New City Launch

```typescript
// 1. Add to DB (via admin panel or SQL)
INSERT INTO franchise_crm_configs (city, subdomain, status)
VALUES ('manchester', 'manchester', 'active');

// 2. Clear cache (in browser console)
localStorage.removeItem('qwikker_valid_franchise_cities_v1')

// 3. Visit manchester.qwikker.com
// Should work immediately (no deploy needed!)
```

### Test Cache Invalidation

```typescript
// Fetch will refresh after 5 minutes
// Or force refresh:
await fetch('/api/franchise/cities', { cache: 'reload' })
```

---

## Performance

**First load (cache cold):**
- API call: ~50-200ms (depends on DB + CDN)
- localStorage write: ~5ms
- Total: **~200ms**

**Subsequent loads:**
- Memory cache hit: **< 1ms** ⚡
- localStorage hit: **~5ms**
- No network request

**After 5 minutes:**
- Stale-while-revalidate keeps old cache working
- Background fetch updates cache
- User never waits
