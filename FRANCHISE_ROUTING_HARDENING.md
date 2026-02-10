# Franchise Routing Hardening 🔒

Two production-safety improvements that prevent silent failures and payload drift.

---

## 1. Type-Safe Response Helper (Payload Drift Prevention)

### Problem
Without enforcement, it's easy to accidentally return the wrong shape:
```typescript
return NextResponse.json({ cities: [] })  // ❌ Wrong key
return NextResponse.json({ franchises: [] })  // ✅ Correct
```

The bug would be invisible until runtime, and with fail-open behavior, it would silently mask config issues forever.

### Solution
Single helper function that enforces correct shape:

```typescript
// app/api/franchise/cities/route.ts

type FranchisePublic = {
  subdomain: string
  display_name: string
  status: 'active' | 'coming_soon'
}

function jsonFranchises(franchises: FranchisePublic[], headers?: HeadersInit) {
  return NextResponse.json({ franchises }, headers ? { headers } : undefined)
}
```

### Usage

**Before (3 separate return statements, easy to drift):**
```typescript
if (!supabaseUrl) {
  return NextResponse.json({ franchises: [] }, { status: 200 })
}

if (error) {
  return NextResponse.json({ franchises: [] }, { status: 200 })
}

return NextResponse.json(
  { franchises: uniqueFranchises },
  { headers: { 'Cache-Control': '...' } }
)
```

**After (impossible to drift):**
```typescript
if (!supabaseUrl) {
  return jsonFranchises([])
}

if (error) {
  return jsonFranchises([])
}

return jsonFranchises(uniqueFranchises, {
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600'
})
```

### Benefits
- ✅ **TypeScript enforces correct shape** at compile time
- ✅ **Cannot accidentally use wrong key** (`cities` vs `franchises`)
- ✅ **Single source of truth** for response structure
- ✅ **Matches client contract** exactly (client expects `json?.franchises`)

### TypeScript Safety
```typescript
// This will NOT compile:
return jsonFranchises([
  { subdomain: 'test', display_name: 'Test' }  // ❌ Missing 'status' field
])

// This will compile:
return jsonFranchises([
  { subdomain: 'test', display_name: 'Test', status: 'active' }  // ✅
])
```

---

## 2. Dev-Mode Cache Warning (Visibility for Silent Failures)

### Problem
Fail-open behavior is correct for UX:
- If API fails → return empty array → user doesn't see error → server still validates

But this masks real issues during development:
- Missing Supabase credentials
- Database view misconfigured
- Network issues

You'd never know the cache is broken until you test subdomain validation explicitly.

### Solution
Loud warning in dev mode when cache is empty:

```typescript
// lib/utils/client-city-detection.ts

// 3) Fetch from API (cache miss)
const franchises = await fetchFranchises()

// Dev-mode warning: empty franchises array could indicate config issue
if (process.env.NODE_ENV === 'development' && franchises.length === 0) {
  console.warn(
    '[FRANCHISE CACHE] No franchises returned. Server will still validate, but check:',
    '\n  - /api/franchise/cities endpoint',
    '\n  - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars',
    '\n  - franchise_public_info view has active/coming_soon rows'
  )
}
```

### Behavior

**Development:**
```
[FRANCHISE CACHE] No franchises returned. Server will still validate, but check:
  - /api/franchise/cities endpoint
  - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars
  - franchise_public_info view has active/coming_soon rows
```

**Production:**
- No warning logged (silent fail-open for UX)
- Server still validates (authoritative)
- Monitoring/alerting should catch 0-length responses from `/api/franchise/cities`

### Why Only Development?
1. **Production UX:** Don't spam user consoles with warnings they can't fix
2. **Fail-open is correct:** Server validates, so client cache being empty is safe
3. **Dev visibility:** Developers need to know their local setup is broken
4. **Monitoring:** Production issues should be caught by API monitoring, not client logs

### When This Triggers
- Missing `.env.local` vars during local dev
- Database migration hasn't been run yet
- `franchise_public_info` view returns empty (no active/coming_soon franchises)
- API endpoint unreachable (network issue, wrong port, etc.)

---

## Combined Safety

These two changes work together:

```typescript
// API enforces correct shape at compile time
type FranchisePublic = { subdomain: string; display_name: string; status: 'active' | 'coming_soon' }
function jsonFranchises(franchises: FranchisePublic[], headers?: HeadersInit)

// Client warns developer when shape is empty unexpectedly
if (process.env.NODE_ENV === 'development' && franchises.length === 0) {
  console.warn('[FRANCHISE CACHE] No franchises returned...')
}
```

**Result:**
- ✅ Cannot return wrong payload shape (TypeScript prevents it)
- ✅ Cannot silently run with broken cache in dev (console warns)
- ✅ Production UX unaffected (fail-open still works)
- ✅ Server remains authoritative (client cache is just optimization)

---

## Testing the Hardening

### Test 1: Type Safety (Compile Time)

Try to return wrong shape:
```typescript
// In app/api/franchise/cities/route.ts
return jsonFranchises([
  { subdomain: 'test' }  // ❌ TypeScript error: missing display_name, status
])
```

**Expected:** TypeScript compilation fails

### Test 2: Dev Warning (Runtime)

Temporarily break the API:
```typescript
// In app/api/franchise/cities/route.ts
export async function GET() {
  return jsonFranchises([])  // Force empty
}
```

Then in browser:
```javascript
await getValidClientFranchiseSubdomains()
```

**Expected (dev mode):**
```
[FRANCHISE CACHE] No franchises returned. Server will still validate, but check:
  - /api/franchise/cities endpoint
  - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars
  - franchise_public_info view has active/coming_soon rows
```

**Expected (production):**
No console output (silent fail-open)

### Test 3: Normal Operation

Restore API:
```typescript
// Fetch real data again
const { data } = await supabase.from('franchise_public_info')...
return jsonFranchises(uniqueFranchises, { 'Cache-Control': '...' })
```

**Expected:**
- No warnings
- Client cache populated
- TypeScript happy

---

## Files Changed

### `app/api/franchise/cities/route.ts`
**Added:**
- `type FranchisePublic` (matches client)
- `function jsonFranchises()` (type-safe response helper)

**Changed:**
- All 3 return statements now use `jsonFranchises()`

**Lines:** +15, -6

### `lib/utils/client-city-detection.ts`
**Added:**
- Dev-mode warning when cache is empty

**Lines:** +9

---

## Why This Matters

### Without These Changes

**Scenario:** New developer joins, sets up local env incorrectly (missing `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

**What happens:**
1. API returns `{ franchises: [] }` (fail-open, correct)
2. Client cache remains empty forever (no warning)
3. Developer tests "manchester.localhost:3000"
4. Server validates correctly (authoritative)
5. **Everything seems to work** ✅

**Hidden problem:** Client-side validation is completely broken, but masked by server validation.

**Risk:** If they later try to use client cache for something else (e.g., pre-rendering city list in UI), they'll get an empty array and won't know why.

### With These Changes

**Scenario:** Same setup issue.

**What happens:**
1. API returns `{ franchises: [] }` (type-safe helper enforces shape)
2. Client cache triggers **loud warning** in console
3. Developer sees:
   ```
   [FRANCHISE CACHE] No franchises returned. Server will still validate, but check:
     - /api/franchise/cities endpoint
     - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars
   ```
4. Developer fixes `.env.local`
5. **Problem caught immediately** ✅

---

## Production Monitoring

Even though we fail-open gracefully, you should monitor:

**Alert on:**
```
GET /api/franchise/cities returns { franchises: [] }
```

**This indicates:**
- Database view is empty (no active franchises)
- Supabase credentials missing/invalid
- Network partition between API and DB

**Action:**
- Check Supabase dashboard
- Verify `franchise_public_info` view
- Check environment variables in deployment

---

## Summary

| Change | File | Purpose | Benefit |
|--------|------|---------|---------|
| Type-safe helper | `app/api/franchise/cities/route.ts` | Enforce payload shape | Cannot accidentally return wrong key |
| Dev warning | `lib/utils/client-city-detection.ts` | Visibility for config issues | Catch broken cache immediately |

**Status:** ✅ Production-ready  
**Breaking changes:** None  
**TypeScript errors:** 0  
**Runtime impact:** None (dev warning only runs in development)  

---

**Date:** 2026-02-08  
**Context:** Final hardening after catching `{ cities: [] }` bug during pre-flight checks
