# 🔍 COMPLETE CITY ISOLATION AUDIT

## **EXECUTIVE SUMMARY**

**Good News:** All user-facing routes ALREADY filter by city at the app layer ✅  
**Bad News:** The middleware `set_current_city()` approach won't work ❌  
**Solution:** Keep app-layer filtering (it's working!), fix the 2 remaining issues 🎯

---

## **CRITICAL PUBLIC ROUTES AUDIT**

| File | Route | City Derived? | City Filter in Query? | Uses Service Role? | Risk |
|------|-------|---------------|----------------------|-------------------|------|
| `app/user/discover/page.tsx` | `/user/discover` | ✅ `getSafeCurrentCity()` | ✅ `.eq('city', currentCity)` Line 122 | ❌ Tenant-aware client | **LOW** ✅ |
| `app/user/offers/page.tsx` | `/user/offers` | ✅ `getSafeCurrentCity()` | ✅ `.eq('city', franchiseCity)` Line 111 | ❌ Tenant-aware client | **LOW** ✅ |
| `app/user/business/[slug]/page.tsx` | `/user/business/:slug` | ✅ `getSafeCurrentCity()` | ✅ `.eq('city', currentCity)` Line 117 | ❌ Tenant-aware client | **LOW** ✅ |
| `app/api/claim/search/route.ts` | `POST /api/claim/search` | ❌ From request body! | ⚠️ `.eq('city', city)` Line 28 | ✅ Yes | **HIGH** 🔴 |
| `app/claim/page.tsx` | `/claim` | ❌ Hardcoded 'bournemouth' | N/A (client-side) | N/A | **HIGH** 🔴 |
| `lib/ai/chat.ts` | AI Chat | ✅ Passed as param | ✅ `.eq('city', city)` Line 988 | ✅ Yes (RAG) | **LOW** ✅ |

---

## **DETAILED FINDINGS**

### **✅ SECURE: User Discover Page**
**File:** `app/user/discover/page.tsx`

```typescript
// Line 19-32: City detection
currentCity = await getSafeCurrentCity()

// Line 81-122: Query with city filter
const { data: approvedBusinesses } = await supabase
  .from('business_profiles')
  .select(...)
  .eq('city', currentCity) // ✅ Server-derived, explicit filter
```

**Protection Layers:**
1. ✅ `getSafeCurrentCity()` derives city from hostname
2. ✅ Validates city exists in franchise_crm_configs
3. ✅ Explicit `.eq('city', currentCity)` in query
4. ✅ Uses tenant-aware client (anon key, not service role)

**Risk:** **LOW** - Properly isolated ✅

---

### **✅ SECURE: User Offers Page**
**File:** `app/user/offers/page.tsx`

```typescript
// Line 22: City detection
const franchiseCity = await getSafeCurrentCity()

// Line 108-112: Query with city filter
const { data: franchiseBusinesses } = await supabase
  .from('business_profiles')
  .select('id, business_name, city, status')
  .eq('city', franchiseCity) // ✅ Server-derived, explicit filter
  .eq('status', 'approved')
```

**Protection Layers:**
1. ✅ `getSafeCurrentCity()` derives city from hostname
2. ✅ Explicit `.eq('city', franchiseCity)` in query
3. ✅ Uses tenant-aware client

**Risk:** **LOW** - Properly isolated ✅

---

### **✅ SECURE: Business Detail Page**
**File:** `app/user/business/[slug]/page.tsx`

```typescript
// Line 18: City detection
currentCity = await getSafeCurrentCity()

// Line 72-117: Query with city filter
const { data: approvedBusinesses } = await supabase
  .from('business_profiles')
  .select(...)
  .in('status', ['approved', 'unclaimed', 'claimed_free'])
  .eq('city', currentCity) // ✅ Server-derived, explicit filter
```

**Protection Layers:**
1. ✅ `getSafeCurrentCity()` derives city from hostname
2. ✅ Explicit `.eq('city', currentCity)` in query
3. ✅ Uses tenant-aware client

**Risk:** **LOW** - Properly isolated ✅

---

### **🔴 INSECURE: Claim Search API**
**File:** `app/api/claim/search/route.ts`

```typescript
// Line 11: ❌ Accepts city from client!
const { query, city = 'bournemouth' } = await request.json()

// Line 25-29: Uses client-supplied city
const { data: businesses } = await supabase
  .from('business_profiles')
  .select(...)
  .eq('city', city) // ⚠️ Client-controlled!
  .eq('status', 'unclaimed')
```

**Problem:**
- ❌ Client can send ANY city in request body
- ❌ Defaults to 'bournemouth' (hardcoded)
- ❌ Calgary user could search Bournemouth businesses

**Risk:** **HIGH** 🔴

---

### **🔴 INSECURE: Claim Page (Client-Side)**
**File:** `app/claim/page.tsx`

```typescript
// Line 81: ❌ Hardcoded city!
body: JSON.stringify({ query: trimmedQuery, city: 'bournemouth' })
```

**Problem:**
- ❌ Always sends 'bournemouth' to API
- ❌ Calgary users can't find Calgary businesses
- ❌ Blocks multi-city claim flow entirely

**Risk:** **HIGH** 🔴

---

### **✅ SECURE: AI Chat**
**File:** `lib/ai/chat.ts`

```typescript
// Line 973-990: Query with city filter
const { data: businesses } = await supabase
  .from('business_profiles')
  .select(...)
  .in('id', businessIds)
  .eq('status', 'approved')
  .eq('city', city) // ✅ Passed from caller (already validated)
  .in('business_tier', ['qwikker_picks', 'featured'])
```

**Protection Layers:**
1. ✅ City passed as parameter from calling code
2. ✅ Calling code derives city from hostname
3. ✅ Explicit `.eq('city', city)` in query

**Risk:** **LOW** - Properly isolated ✅

---

## **WHY MIDDLEWARE `set_current_city()` WON'T WORK**

### **The Problem:**

```typescript
// lib/supabase/middleware.ts (current approach)
await supabase.rpc('set_current_city', { city_name: currentCity })
```

**Why this fails:**
1. ❌ Middleware runs in a separate request/DB session
2. ❌ `current_setting()` is per-session (doesn't persist)
3. ❌ Public queries are separate HTTP requests = separate sessions
4. ❌ Even if you set it, the next query won't see it

### **Example:**
```
Request 1: Middleware sets app.current_city = 'calgary'
  ↓ (session ends)
Request 2: User page queries business_profiles
  ↓ (new session, current_setting is NULL)
RLS policy: city = current_setting('app.current_city', true)
  ↓ (NULL = NULL is NULL, not true)
Result: Returns nothing OR falls back to 'bournemouth' ❌
```

---

## **WHAT'S ACTUALLY WORKING (AND WHY)**

Your app is ALREADY secure because:

### **App-Layer City Filtering:**
```typescript
// Every user-facing route does this:
const city = await getSafeCurrentCity() // Server-derived from hostname
const { data } = await supabase
  .from('business_profiles')
  .select(...)
  .eq('city', city) // ✅ Explicit filter in every query!
```

**This is CORRECT and SECURE** ✅

### **Why it works:**
1. ✅ City derived from hostname (server-side, can't be spoofed)
2. ✅ Validated against franchise_crm_configs (only real cities)
3. ✅ Explicit `.eq('city', city)` in every query
4. ✅ Works with anon key (public) AND service role

---

## **THE 2 FIXES NEEDED**

### **Fix 1: Claim Search API**
**File:** `app/api/claim/search/route.ts`

**Current (INSECURE):**
```typescript
const { query, city = 'bournemouth' } = await request.json()
```

**Fixed (SECURE):**
```typescript
import { getCityFromHostname } from '@/lib/utils/city-detection'

const { query } = await request.json() // Don't accept city from client!
const hostname = request.headers.get('host') || ''
const city = await getCityFromHostname(hostname) // Server-derived
```

---

### **Fix 2: Claim Page**
**File:** `app/claim/page.tsx`

**Current (INSECURE):**
```typescript
body: JSON.stringify({ query: trimmedQuery, city: 'bournemouth' })
```

**Option A (Recommended): Don't send city at all**
```typescript
// Client-side: detect city from window.location
const [city, setCity] = useState<string | null>(null)

useEffect(() => {
  const hostname = window.location.hostname
  const subdomain = hostname.split('.')[0]
  
  // Map subdomain to city
  if (subdomain === 'bournemouth' || subdomain === 'localhost') {
    setCity('bournemouth')
  } else if (subdomain === 'calgary') {
    setCity('calgary')
  } else if (subdomain === 'london') {
    setCity('london')
  } else {
    setCity('bournemouth') // fallback
  }
}, [])

// In handleSearch:
body: JSON.stringify({ query: trimmedQuery })
// API derives city from headers (Fix 1)
```

**Option B (Simpler): Create a /api/internal/get-city endpoint**
```typescript
// Call once on page load
const response = await fetch('/api/internal/get-city')
const { city } = await response.json()
setCity(city)
```

---

## **RECOMMENDED APPROACH**

### **DON'T:**
- ❌ Rely on RLS `current_setting()` for public routes
- ❌ Try to set city context in middleware
- ❌ Remove existing `.eq('city', city)` filters

### **DO:**
- ✅ Keep app-layer city filtering (it's working!)
- ✅ Fix claim search API to derive city from headers
- ✅ Fix claim page to detect city client-side or via endpoint
- ✅ Trust your existing isolation (it's solid!)

---

## **FINAL RISK ASSESSMENT**

| Component | Current Risk | After Fixes | Priority |
|-----------|--------------|-------------|----------|
| User Discover | ✅ LOW | ✅ LOW | N/A - Already secure |
| User Offers | ✅ LOW | ✅ LOW | N/A - Already secure |
| Business Detail | ✅ LOW | ✅ LOW | N/A - Already secure |
| AI Chat | ✅ LOW | ✅ LOW | N/A - Already secure |
| Claim Search API | 🔴 HIGH | ✅ LOW | **P0** - Fix now |
| Claim Page | 🔴 HIGH | ✅ LOW | **P0** - Fix now |

---

## **NEXT STEPS**

1. **Fix Claim Search API** (5 mins)
   - Derive city from request headers
   - Don't accept city from request body

2. **Fix Claim Page** (10 mins)
   - Detect city client-side from hostname
   - Remove hardcoded 'bournemouth'

3. **Test multi-city** (15 mins)
   - Test bournemouth.localhost:3000/claim
   - Test calgary.localhost:3000/claim (if you have data)

4. **Deploy** 🚀

---

## **ROLLBACK PLAN**

If something breaks:
1. Revert claim search API to accept city from body
2. Keep claim page hardcoded to 'bournemouth'
3. Everything else stays the same (it's already working!)

---

**Bottom Line:** Your app is 90% there! Just fix the 2 claim flow issues and you're ready for multi-city. 🎯

