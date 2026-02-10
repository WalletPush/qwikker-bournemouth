# Franchise Routing - Final Implementation

## What You Can Now Forget About

Adding a new city is now:
```sql
INSERT INTO franchise_crm_configs (city, subdomain, display_name, status)
VALUES ('manchester', 'manchester', 'Manchester', 'active');
```

**That's it.** No code changes, no deploys, no TypeScript updates.

---

## Architecture Summary

### Data Flow
```
Browser hostname → Extract subdomain → Validate against API cache → Server confirms
```

### API Contract

**Endpoint:** `GET /api/franchise/cities`

**Response:**
```json
{
  "franchises": [
    { "subdomain": "bournemouth", "display_name": "Bournemouth", "status": "active" },
    { "subdomain": "bcp", "display_name": "Bournemouth, Christchurch & Poole", "status": "active" },
    { "subdomain": "manchester", "display_name": "Manchester", "status": "coming_soon" }
  ]
}
```

**Data Source:** `franchise_public_info` view (active + coming_soon only)  
**Security:** Anon key, RLS enforced, public-safe  
**Caching:** 5min fresh, 1hr stale-while-revalidate  

---

## Client Functions

### Core Functions

#### `getValidClientFranchiseSubdomains(): Promise<string[]>`
Returns array of valid subdomains for validation
```typescript
const valid = await getValidClientFranchiseSubdomains()
// ['bournemouth', 'bcp', 'manchester', 'bali']
```

#### `getCityFromHostnameClient(hostname: string): string`
**Synchronous** - extracts subdomain without validation (instant)
```typescript
const city = getCityFromHostnameClient('manchester.qwikker.com')
// 'manchester' (no await, no validation)
```

#### `resolveClientCityFromHostname(hostname: string): Promise<string | null>`
**Async** - validates against DB
```typescript
const city = await resolveClientCityFromHostname('manchester.qwikker.com')
// 'manchester' if valid, null if not found
```

#### `getCityDisplayName(city: string): string`
Returns pretty name (uses API cache → local overrides → auto-capitalize)
```typescript
getCityDisplayName('bcp')
// 'Bournemouth, Christchurch & Poole' (from API display_name!)

getCityDisplayName('st-ives')
// 'St Ives' (from local override)

getCityDisplayName('manchester')
// 'Manchester' (auto-capitalized)
```

### Preload Helper

#### `preloadFranchiseCities(): Promise<void>`
Warms cache early (call in root layout/app wrapper)
```typescript
useEffect(() => {
  preloadFranchiseCities() // Background cache warming
}, [])
```

---

## Cache Strategy

### Three Layers (All 5-Minute TTL)

1. **Memory Cache** (< 1ms)
   - Session-scoped
   - Cleared on page reload
   - Fastest

2. **localStorage** (~ 5ms)
   - Persists across reloads
   - Version-gated (`v: 2`)
   - Gracefully ignores old format

3. **HTTP/CDN Cache** (~ 50ms)
   - Browser respects Cache-Control
   - CDN serves cached response
   - Stale-while-revalidate keeps it snappy

### Version Safety

```typescript
interface CachePayload {
  v: 2 // ✅ Version flag
  franchises: FranchisePublic[]
  ts: number
}

// localStorage read
if (parsed?.v === 2 && ...) {
  // Only use v2 format (array of objects)
}
```

**Why?** Prevents old cache (string array) from breaking new code (object array)

---

## Data Hygiene (API Endpoint)

```typescript
const franchises = (data ?? [])
  .filter(r => r.status === 'active' || r.status === 'coming_soon')
  .map(r => ({
    subdomain: (r.subdomain || r.city || '').trim().toLowerCase(),
    display_name: (r.display_name || '').trim(),
    status: r.status
  }))
  .filter(f => f.subdomain.length > 0) // ✅ Array-level filter

// Dedupe
const unique = Array.from(
  new Map(franchises.map(f => [f.subdomain, f])).values()
)
```

**Protects against:**
- Whitespace junk
- Empty strings
- Mixed case
- DB duplicates

---

## Migration Notes

### Backward Compatibility

**Deprecated (but still works):**
```typescript
getValidClientFranchiseCities() // ← Old name
```

**New (recommended):**
```typescript
getValidClientFranchiseSubdomains() // ← Clear naming
```

Existing components using old name will continue working (aliased internally).

### Breaking Changes

**None.** All changes are additive:
- `getCityFromHostnameClient()` signature unchanged
- Old localStorage key ignored (new key used)
- Old components work unchanged

---

## Testing Checklist

### ✅ Test 1: API Response
```bash
curl http://localhost:3000/api/franchise/cities
```

**Expected:**
```json
{
  "franchises": [
    { "subdomain": "bournemouth", "display_name": "Bournemouth", "status": "active" }
  ]
}
```

### ✅ Test 2: Client Validation
```javascript
// Browser console
const subs = await getValidClientFranchiseSubdomains()
console.log(subs) // ['bournemouth', 'bali', ...]

const city = await resolveClientCityFromHostname('manchester.qwikker.com')
console.log(city) // 'manchester' or null
```

### ✅ Test 3: Display Names
```javascript
getCityDisplayName('bcp')
// 'Bournemouth, Christchurch & Poole' (from API!)

getCityDisplayName('st-ives')
// 'St Ives' (from local override)
```

### ✅ Test 4: Cache Versioning
```javascript
// Old localStorage format (v1 or missing version)
localStorage.setItem('qwikker_franchise_public_v2', '{"franchises":[],"ts":123}')

// Should ignore (missing v: 2)
const result = await getValidClientFranchiseSubdomains()
// Fetches fresh from API (doesn't use bad cache)
```

### ✅ Test 5: New City Launch
```sql
INSERT INTO franchise_crm_configs (city, subdomain, display_name, status)
VALUES ('liverpool', 'liverpool', 'Liverpool', 'coming_soon');
```

**Wait 5 minutes (or clear cache), then:**
```javascript
const subs = await getValidClientFranchiseSubdomains()
// ['bournemouth', ..., 'liverpool']

getCityDisplayName('liverpool')
// 'Liverpool' (from API display_name)
```

---

## Common Pitfalls (Avoided)

### ❌ Old Implementation Issues
1. Hardcoded city lists → **Fixed:** DB-driven
2. Throwing errors for unknown cities → **Fixed:** Fail open, server validates
3. Calling subdomains "cities" → **Fixed:** Clear naming (`subdomain` field)
4. Client heuristics for display names → **Fixed:** Uses API `display_name`
5. Cache layer fighting → **Fixed:** Removed `cache: 'no-store'`
6. String.filter() bugs → **Fixed:** Array-level filtering
7. Cache version conflicts → **Fixed:** Version flag (`v: 2`)

---

## Performance Profile

**Cold cache (first load):**
```
API call: ~200ms
localStorage write: ~5ms
Total: ~200ms
```

**Warm cache (99% of requests):**
```
Memory hit: < 1ms ⚡
```

**After page reload:**
```
localStorage hit: ~5ms (no API call)
```

**After 5 minutes:**
```
CDN stale-while-revalidate: ~50ms (serves stale, fetches fresh in background)
```

---

## Security Checklist

- ✅ Public endpoint uses anon key (not service role)
- ✅ Queries public view (`franchise_public_info`)
- ✅ RLS enforced naturally
- ✅ No secrets in response
- ✅ Fails gracefully (returns `[]`, not 500)
- ✅ Client validation is UX only (server authoritative)
- ✅ Version-gated cache (prevents format conflicts)

---

## Future-Proofing

### Adding Multi-Language Support
```json
{
  "franchises": [
    { 
      "subdomain": "paris",
      "display_name": "Paris",
      "display_name_local": "Paris",
      "status": "active",
      "language": "fr"
    }
  ]
}
```

### Adding Timezone Data
```json
{
  "franchises": [
    { 
      "subdomain": "bali",
      "display_name": "Bali",
      "status": "active",
      "timezone": "Asia/Makassar"
    }
  ]
}
```

Just add fields to `franchise_public_info` view - client code adapts automatically!

---

✅ **This is "franchise routing you can forget about."**
