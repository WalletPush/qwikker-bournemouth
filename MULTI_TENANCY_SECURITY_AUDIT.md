# 🚨 MULTI-TENANCY SECURITY AUDIT

**Date:** 2026-01-12  
**Auditor:** Cursor AI  
**Scope:** City/Franchise isolation across all routes

---

## 🔍 **EXECUTIVE SUMMARY**

### **🚨 CRITICAL ISSUES FOUND: 3**
### **⚠️ HIGH-RISK ISSUES: 5**
### **✅ SECURE ROUTES: Admin Approve Claim**

---

## **1. CITY RESOLUTION LOGIC - FINDINGS**

### **Two Conflicting Systems Detected:**

#### **System A: `city-detection.ts`** (Old)
- Used by: `/admin/import`, `/admin/login`
- Fallbacks: ✅ localhost → 'bournemouth', www/app/api → 'bournemouth'

#### **System B: `franchise-areas.ts`** (New)
- Used by: `/user/*`, `/admin/*` (main), `createTenantAwareClient`
- Fallbacks: ✅ localhost → 'bournemouth', ❌ www/app/api → THROWS ERROR

**Risk:** Inconsistent behavior across routes

---

## **2. DASHBOARD CITY RESOLUTION**

### **✅ ADMIN Dashboard** (`/admin`)
```typescript
// app/admin/page.tsx line 14-15
const headersList = await headers()
const currentCity = await getCityFromRequest(headersList)
```
**Status:** ✅ Resolves from subdomain  
**Isolation:** ✅ Checks `isAdminForCity(adminId, currentCity)`

---

### **🚨 BUSINESS Dashboard** (`/dashboard`)
```typescript
// app/dashboard/page.tsx line 12-34
const supabase = await createClient()
const { data: profile } = await supabase
  .from('business_profiles')
  .select('*')
  .eq('user_id', data.claims.sub)
  .single()
```
**Status:** ❌ NO city detection at all  
**Isolation:** Relies ENTIRELY on RLS policies  
**Risk:** **If RLS fails, cross-city data leak possible**

---

### **✅ USER Dashboard** (`/user/*`)
```typescript
// app/user/discover/page.tsx line 19-32
let currentCity: string
try {
  currentCity = await getSafeCurrentCity()
} catch (error) {
  return <AccessDenied />
}
```
**Status:** ✅ Resolves from subdomain  
**Isolation:** ✅ Validates city + uses tenant-aware client

---

### **🚨 CLAIM Page** (`/claim`)
```typescript
// app/claim/page.tsx line 81
body: JSON.stringify({ query: trimmedQuery, city: 'bournemouth' })

// line 554
franchiseCity="Bournemouth"
```
**Status:** ❌ HARDCODED TO BOURNEMOUTH  
**Risk:** **Calgary users can only claim Bournemouth businesses!**

---

## **3. ALL 'BOURNEMOUTH' DEFAULTS**

### **🔴 CRITICAL - Production Defaults:**

| File | Line | Code | Risk Level |
|------|------|------|------------|
| `lib/utils/city-detection.ts` | 21 | `return 'bournemouth' // localhost` | 🟡 Dev only |
| `lib/utils/city-detection.ts` | 38 | `return 'bournemouth' // vercel.app` | 🔴 **PROD** |
| `lib/utils/city-detection.ts` | 54 | `return 'bournemouth' // www/app/api` | 🔴 **PROD** |
| `lib/utils/franchise-areas.ts` | 111 | `return 'bournemouth' // localhost` | 🟡 Dev only |
| `lib/utils/franchise-areas.ts` | 129 | `return 'bournemouth' // vercel.app` | 🔴 **PROD** |
| `app/claim/page.tsx` | 81 | `city: 'bournemouth'` | 🔴 **CRITICAL** |
| `app/api/claim/search/route.ts` | 11 | `city = 'bournemouth'` | 🔴 **CRITICAL** |
| `lib/integrations.ts` | 70 | `targetCity = 'bournemouth'` | 🟠 Fallback |
| `lib/integrations.ts` | 118 | `targetCity = 'bournemouth'` | 🟠 Fallback |

---

## **4. API ROUTE CITY SCOPING**

### **✅ SECURE: `/api/admin/approve-claim`**

```typescript
// Line 42-43
const hostname = request.headers.get('host') || ''
const requestCity = await getCityFromHostname(hostname)

// Line 45
if (!admin || !await isAdminForCity(adminSession.adminId, requestCity)) {
  return 403
}

// Line 77-82
if (claim.business.city !== requestCity) {
  return 403
}
```

**Status:** ✅ **FULLY ISOLATED**  
**Protections:**
1. ✅ Derives city from subdomain
2. ✅ Validates admin has access to that city
3. ✅ Validates business belongs to that city
4. ✅ Returns 403 if mismatch

---

### **❌ INSECURE: `/api/claim/search`**

```typescript
// Line 11
const { query, city = 'bournemouth' } = await request.json()
```

**Status:** ❌ **ACCEPTS CLIENT-SUPPLIED CITY**  
**Risk:** Calgary user could search Bournemouth businesses by sending `city: 'bournemouth'` in request body

---

## **5. MULTI-CITY ISOLATION ASSESSMENT**

### **Question 1: Will `bournemouth.qwikker.com/admin` and `calgary.qwikker.com/admin` be fully isolated?**

**Answer:** ✅ **YES, BUT...**

**Secure:**
- ✅ Admin dashboard checks `isAdminForCity(adminId, requestCity)`
- ✅ Admin approval API validates `claim.business.city !== requestCity`
- ✅ User routes use `getSafeCurrentCity()` with validation

**Insecure:**
- ❌ Business dashboard has NO city checks (relies on RLS)
- ❌ Claim page hardcoded to bournemouth
- ❌ Import API routes not audited yet

---

### **Question 2: Is there any scenario where /admin could control multiple cities unintentionally?**

**Answer:** ⚠️ **POSSIBLE in 3 scenarios:**

#### **Scenario 1: RLS Policy Failure**
If RLS policies are misconfigured or disabled, business dashboard queries could return cross-city data.

#### **Scenario 2: Service Role Client Misuse**
Code using `createServiceRoleClient()` bypasses RLS. If city filtering is forgotten, cross-city access occurs.

**Example (SAFE):**
```typescript
// app/api/admin/approve-claim/route.ts
const supabaseAdmin = createAdminClient()
// Later checks: claim.business.city !== requestCity
```

**Example (UNSAFE - hypothetical):**
```typescript
const supabaseAdmin = createAdminClient()
const { data } = await supabaseAdmin
  .from('business_profiles')
  .select('*')
  // ❌ NO .eq('city', requestCity) - returns ALL cities!
```

#### **Scenario 3: Client-Supplied City Parameters**
If API routes accept `city` from request body without validation (like `/api/claim/search`), clients can query other cities.

---

## **6. FILES REQUIRING IMMEDIATE FIX**

### **🔴 CRITICAL (P0 - Fix Before Production)**

1. **`app/claim/page.tsx`**
   - Line 81: `city: 'bournemouth'` → derive from subdomain
   - Line 554: `franchiseCity="Bournemouth"` → derive from subdomain

2. **`app/api/claim/search/route.ts`**
   - Line 11: `city = 'bournemouth'` → derive from request headers, validate

3. **`lib/utils/franchise-areas.ts`**
   - Line 136: Add `www/app/api` handling (same as city-detection.ts)

---

### **⚠️ HIGH PRIORITY (P1 - Fix This Week)**

4. **`app/dashboard/*` (ALL business dashboard pages)**
   - Add city detection + validation at the top of each page
   - Don't rely solely on RLS

5. **`lib/utils/city-detection.ts` + `franchise-areas.ts`**
   - Consolidate into ONE system
   - Remove duplicate logic

6. **`lib/integrations.ts`**
   - Lines 70, 118: Remove bournemouth fallbacks
   - Force explicit city parameter or throw error

---

## **7. RECOMMENDED FIXES**

### **Fix 1: Add City Detection to Claim Page**

```typescript
// app/claim/page.tsx
'use client'
import { useEffect, useState } from 'react'

export default function ClaimPage() {
  const [city, setCity] = useState<string | null>(null)
  
  useEffect(() => {
    // Fetch city from server
    fetch('/api/internal/get-city')
      .then(r => r.json())
      .then(data => setCity(data.city))
  }, [])
  
  if (!city) return <Loading />
  
  const handleSearch = async () => {
    const response = await fetch('/api/claim/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: trimmedQuery }) // NO city parameter
    })
  }
  
  // Use {city} in UI
}
```

### **Fix 2: Secure `/api/claim/search`**

```typescript
// app/api/claim/search/route.ts
import { getCityFromHostname } from '@/lib/utils/city-detection'

export async function POST(request: NextRequest) {
  const { query } = await request.json() // Don't accept city from client
  
  // Derive city from subdomain
  const hostname = request.headers.get('host') || ''
  const city = await getCityFromHostname(hostname)
  
  // Validate city
  if (!await isValidFranchiseCity(city)) {
    return NextResponse.json({ error: 'Invalid franchise' }, { status: 403 })
  }
  
  // Search in THIS city only
  const { data } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('city', city) // Server-side filtering
    .ilike('business_name', `%${query}%`)
}
```

### **Fix 3: Add City Checks to Business Dashboard**

```typescript
// app/dashboard/page.tsx
import { getCityFromRequest } from '@/lib/utils/city-detection'
import { headers } from 'next/headers'

export default async function DashboardPage() {
  // 1. Get city from subdomain
  const headersList = await headers()
  const requestCity = await getCityFromRequest(headersList)
  
  // 2. Get user's business
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', data.claims.sub)
    .single()
  
  // 3. CRITICAL: Validate business belongs to this subdomain's city
  if (profile.city !== requestCity) {
    console.error(`🚨 SECURITY: Business ${profile.id} (${profile.city}) accessed from ${requestCity} subdomain`)
    redirect(`https://${profile.city}.qwikker.com/dashboard`)
  }
  
  // 4. Proceed with dashboard
}
```

---

## **8. PRODUCTION READINESS CHECKLIST**

Before deploying to production subdomains:

- [ ] Fix hardcoded `'bournemouth'` in `/claim` page
- [ ] Secure `/api/claim/search` to use server-derived city
- [ ] Add city validation to ALL business dashboard pages
- [ ] Consolidate city-detection.ts + franchise-areas.ts
- [ ] Audit ALL API routes for city scoping
- [ ] Test cross-city access attempts (penetration testing)
- [ ] Add monitoring/alerts for cross-city access attempts
- [ ] Document which routes use RLS vs explicit city filtering

---

## **9. RISK SUMMARY**

| Risk | Likelihood | Impact | Priority |
|------|-----------|--------|----------|
| Calgary user claims Bournemouth business | 🔴 HIGH | 🔴 HIGH | P0 |
| Business dashboard leaks cross-city data | 🟠 MEDIUM | 🔴 HIGH | P1 |
| Admin controls multiple cities | 🟢 LOW | 🔴 HIGH | P1 |
| Vercel preview defaulting to Bournemouth | 🟡 MEDIUM | 🟡 MEDIUM | P2 |

---

## **10. FINAL ANSWER TO YOUR QUESTIONS**

### **Q: In production, will bournemouth.qwikker.com/admin and calgary.qwikker.com/admin be fully isolated?**

**A:** ✅ **YES for admin routes**, ❌ **NO for business dashboard**

Admin routes check city at multiple layers. Business dashboard relies entirely on RLS (risky).

---

### **Q: Is there any scenario where /admin could control multiple cities unintentionally?**

**A:** ⚠️ **YES - 3 scenarios:**

1. RLS policy misconfiguration
2. Service role client used without explicit city filtering
3. API routes accepting client-supplied city parameter

**Mitigation:** Add explicit city checks in EVERY route, don't rely on RLS alone.

---

## **11. IMMEDIATE ACTION REQUIRED**

**Before you can safely deploy on city subdomains:**

1. Fix `/claim` page hardcoded city (2 hours)
2. Add city validation to business dashboard (3 hours)
3. Audit + fix all API routes (4 hours)
4. Penetration testing (2 hours)

**Total:** ~1 day of focused security work

---

**Ready for me to implement the fixes?** 🔧

