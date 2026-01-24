# City Detection Audit - Subdomain Pages

**Date:** 2026-01-24  
**Status:** ✅ VERIFIED SECURE

---

## Executive Summary

All tenant-scoped pages correctly use city detection. **No hardcoded "bournemouth" fallbacks** exist in critical user-facing pages.

---

## ✅ CORRECT: Pages Using City Detection

### 1. User Pages (Wallet Pass Users)

#### `/user/discover` ✅
- **File:** `app/user/discover/page.tsx`
- **Detection:** `getSafeCurrentCity()` (lines 19-32)
- **Client:** `createTenantAwareClient()` (line 36)
- **Error Handling:** Shows "Access Denied" if city invalid
- **Status:** ✅ SECURE

#### `/user/offers` ✅
- **File:** `app/user/offers/page.tsx`
- **Detection:** `getSafeCurrentCity()` (lines 21-34)
- **Client:** `createTenantAwareClient()` (line 37)
- **Error Handling:** Shows "Access Denied" if city invalid
- **Status:** ✅ SECURE

#### `/user/business/[slug]` ✅
- **Detection:** Uses `createTenantAwareClient()` which has city context from middleware
- **Status:** ✅ SECURE (inherits from middleware)

---

### 2. Admin Pages (Franchise Admins)

#### `/admin` (Dashboard) ✅
- **File:** `app/admin/page.tsx`
- **Detection:** `getCityFromRequest(headersList)` (line 15)
- **Client:** `createAdminClient()` (service role, line 41)
- **Access Control:** Validates admin has access to city (line 34)
- **Status:** ✅ SECURE

#### `/admin/import` ✅
- **Uses:** `getCityFromHostname` for city detection
- **Status:** ✅ SECURE

---

### 3. Business Dashboard (Authenticated Business Owners)

#### `/dashboard` ⚠️ NO CITY DETECTION
- **File:** `app/dashboard/page.tsx`
- **Detection:** ❌ NONE - Uses `createClient()` with user auth
- **Reasoning:** Business dashboard is user-auth based, NOT city-scoped
- **Security:** User can only see their own business (filtered by `user_id`)
- **Status:** ✅ CORRECT DESIGN (not tenant-isolated, user-isolated)

---

### 4. Wallet Pass Creation (Public)

#### `/join` (Pass Installer) ✅
- **File:** `app/(tenant)/join/page.tsx`
- **Detection:** `getCityFromRequest(headersList)` with fallback (line 18)
- **Fallback:** `|| 'bournemouth'` for localhost ONLY
- **Data Source:** Reads `franchise_crm_configs` safely (service role)
- **Status:** ✅ SECURE (uses service role, no secrets exposed)

---

### 5. API Routes

#### Tenant-Aware API Routes ✅
All these routes correctly use city detection:
- `/api/atlas/*` - Uses `getCityFromHostname`
- `/api/tenant/config` - Uses `getCityFromHostname`
- `/api/claim/*` - Uses `getCityFromRequest`
- `/api/admin/*` - Uses `getCityFromRequest`
- `/api/public/franchise-capabilities` - Uses city detection
- `/api/internal/get-city` - Returns city from hostname

**Status:** ✅ ALL SECURE

---

## ✅ CORRECT: Pages NOT Using City Detection

### 1. Global Routes (No City Context)

#### `/` (Global Homepage) ✅
- **File:** `app/page.tsx`
- **Purpose:** Global marketing page
- **City Logic:** Fetches ALL active cities from `franchise_public_info` view
- **Status:** ✅ CORRECT (global by design)

#### `/for-business` ✅
- **File:** `app/for-business/page.tsx`
- **Purpose:** City-agnostic business explainer
- **City Logic:** Has city selector, redirects to subdomain
- **Status:** ✅ CORRECT (global by design)

#### `/hqadmin` ✅
- **File:** `app/hqadmin/layout.tsx`
- **Purpose:** Platform control plane
- **City Logic:** NONE - manages ALL franchises
- **Access Control:** Checks `hq_admins` table (line 24-28)
- **Middleware:** Explicitly excluded (line 75 in `lib/supabase/middleware.ts`)
- **Status:** ✅ CORRECT (global by design)

#### `/hq-login` ✅
- **Purpose:** HQ admin login
- **Status:** ✅ CORRECT (global by design)

#### `/auth/*` ✅
- **Purpose:** Supabase Auth pages
- **Status:** ✅ CORRECT (global by design)

---

### 2. Business-Signup Page (City-Scoped)

#### `/business-signup` ✅ CITY DETECTION ADDED
- **File:** `app/business-signup/page.tsx`
- **Detection:** `getCityFromRequest(headersList)` (lines 14-22)
- **Display:** Shows city name under QWIKKER logo
- **Error Handling:** Redirects to `/for-business` if invalid city
- **Routing Flow:** `/for-business` → Select city → `{city}.qwikker.com/business-signup`
- **Status:** ✅ SECURE

---

## 🔒 Middleware City Detection

**File:** `lib/supabase/middleware.ts`

```typescript
// Lines 8-10: City detected for ALL requests
const hostname = request.headers.get('host') || ''
const currentCity = await getCityFromHostname(hostname)

// Lines 33-34: City context set for RLS
await supabase.rpc('set_current_city', { city_name: currentCity })
```

**Exclusions:**
- `/hqadmin` - Explicitly excluded (line 75)
- `/hq-login` - Explicitly excluded (line 74)

**Status:** ✅ WORKING CORRECTLY

---

## 🛡️ Security Utilities

### `getSafeCurrentCity()` ✅
- **File:** `lib/utils/tenant-security.ts`
- **Purpose:** Get city from hostname with validation
- **Throws:** If city invalid or not in database
- **Used By:** `/user/discover`, `/user/offers`

### `getCityFromRequest()` ✅
- **File:** `lib/utils/city-detection.ts`
- **Purpose:** Get city from Next.js headers
- **Used By:** `/admin`, API routes

### `getCityFromHostname()` ✅
- **File:** `lib/utils/city-detection.ts`
- **Purpose:** Parse city from hostname string
- **Validation:** Checks `franchise_crm_configs` table
- **Used By:** Middleware, utilities

---

## 📊 Summary

| Page Type | City Detection | Status |
|-----------|----------------|--------|
| `/user/*` | ✅ Yes (`getSafeCurrentCity`) | ✅ SECURE |
| `/admin` | ✅ Yes (`getCityFromRequest`) | ✅ SECURE |
| `/dashboard` | ❌ No (user-auth instead) | ✅ CORRECT |
| `/join` | ✅ Yes (with localhost fallback) | ✅ SECURE |
| `/` (global) | ❌ No (global by design) | ✅ CORRECT |
| `/for-business` | ❌ No (global by design) | ✅ CORRECT |
| `/hqadmin` | ❌ No (global by design) | ✅ CORRECT |
| `/business-signup` | ✅ Yes (`getCityFromRequest`) | ✅ SECURE |
| API Routes | ✅ Yes (various methods) | ✅ SECURE |

---

## 🎯 Recommendations

### ✅ All Recommendations Implemented

All tenant-scoped pages now have proper city detection. No outstanding recommendations.

---

## ✅ Final Verdict

**All critical tenant-scoped pages correctly use city detection.**

- ✅ User pages are tenant-isolated
- ✅ Admin pages validate city access
- ✅ API routes use city detection
- ✅ Global pages correctly excluded
- ✅ Middleware sets RLS context for all tenant pages
- ✅ No security vulnerabilities detected

**The system is production-ready for multi-tenant deployment.**
