# 🔍 BOURNEMOUTH HARDCODE AUDIT
**Generated:** 2026-01-23  
**Total References Found:** 842  
**Status:** NO CODE CHANGES - AUDIT ONLY

---

## 📊 **EXECUTIVE SUMMARY**

### **Critical Issues** ⚠️
Issues that WILL cause multi-city failures:
- **6 API routes** with hardcoded `bournemouth` defaults
- **4 user pages** with hardcoded `bournemouth` fallbacks
- **3 components** with hardcoded `bournemouth` props
- **1 webhook** creating users with hardcoded `bournemouth`

### **Configuration/Defaults** ℹ️
Expected defaults that are OK (but should be documented):
- **Type definitions** (`FranchiseCity = 'bournemouth' | 'poole' | 'christchurch'`)
- **Dev fallbacks** (localhost → bournemouth)
- **Config objects** (FRANCHISE_LOCATIONS, CITY_CURRENCY_FALLBACK)

### **Documentation/Examples** ✅
Safe references in docs, tests, comments, and example code

---

## 🚨 **CRITICAL FIXES REQUIRED**

### **1. API Routes with Hardcoded Defaults**

#### **HIGH PRIORITY**

**app/api/ai/chat-simple/route.ts**
```typescript
const { message, walletPassId, city = 'bournemouth' } = await request.json()
```
**Issue:** Falls back to 'bournemouth' if city not provided  
**Impact:** Calgary/London users will see Bournemouth businesses in chat  
**Fix:** Require city parameter or derive from hostname/headers

---

**app/api/ghl-webhook/user-creation/route.ts**
```typescript
city: 'bournemouth', // Auto-detect from subdomain later
```
**Issue:** ALL users created via webhook are assigned to bournemouth  
**Impact:** Multi-city GHL integration completely broken  
**Fix:** Implement domain detection from webhook payload or headers

---

**app/api/google-photo/route.ts**
```typescript
const city = searchParams.get('city') || 'bournemouth'
```
**Issue:** Falls back to bournemouth API keys  
**Impact:** Will fail for Calgary/London if their API keys differ  
**Fix:** Make city parameter required

---

**app/api/admin/claims/route.ts**
```typescript
const city = searchParams.get('city') || 'bournemouth'
```
**Issue:** Admin claims page will default to bournemouth claims  
**Impact:** Admins on calgary.qwikker.com will see bournemouth claims  
**Fix:** Derive city from subdomain, don't default

---

**app/api/test-notifications/route.ts**
```typescript
const city = searchParams.get('city') || 'bournemouth'
```
**Issue:** Test notifications default to bournemouth Slack  
**Impact:** Testing multi-city Slack requires manual override  
**Fix:** Derive from hostname for proper testing

---

**app/api/debug/check-resend-config/route.ts**
```typescript
const city = searchParams.get('city') || 'bournemouth'
```
**Issue:** Debug endpoint defaults to bournemouth  
**Impact:** Makes debugging other cities harder  
**Fix:** Require city parameter or derive from hostname

---

#### **MEDIUM PRIORITY**

**app/api/claim/submit/route.ts**
```typescript
city: business.city || 'bournemouth',
```
**Issue:** If business.city is null, defaults to bournemouth  
**Impact:** Slack notifications go to wrong city  
**Fix:** business.city should never be null; fix at DB level

---

**app/api/admin/approve/route.ts**
```typescript
const userIds = await getUsersForBusinessNotifications(data.city || 'bournemouth', data.business_type)
```
**Issue:** Notifications default to bournemouth users  
**Impact:** User notifications for new offers go to wrong city  
**Fix:** data.city should never be null; fix at DB level

---

**app/api/admin/approve-change/route.ts**
```typescript
city: change.business.city || 'bournemouth',
```
**Issue:** Change approval notifications default to bournemouth  
**Impact:** Slack notifications go to wrong city  
**Fix:** change.business.city should never be null; fix at DB level

---

**app/api/walletpass/create-main-pass/route.ts**
```typescript
const credentials = await getWalletPushCredentials(city || 'bournemouth')
```
```typescript
'Offers_Url': `https://${city || 'bournemouth'}.qwikker.com/user/offers?wallet_pass_id=${result.serialNumber}`,
```
**Issue:** Falls back to bournemouth credentials and URLs  
**Impact:** Wallet passes will have wrong city URLs  
**Fix:** city should always be provided; make it required

---

**app/api/walletpass/user-creation/route.ts**
```typescript
const city = host.split('.')[0]
return city === 'qwikkerdashboard-theta' || city === 'localhost' ? 'bournemouth' : city
```
**Issue:** Localhost and preview deployments default to bournemouth  
**Impact:** Dev/staging tests always use bournemouth  
**Fix:** Read from env var or query param for dev/preview

---

**app/api/walletpass/update-existing-links/route.ts**
```typescript
const city = user.city || 'bournemouth'
```
**Issue:** If user.city is null, falls back to bournemouth  
**Impact:** Wallet pass updates use wrong city  
**Fix:** user.city should never be null; fix at user creation

---

**app/api/internal/get-city/route.ts**
```typescript
city: 'bournemouth' // Safe fallback
```
**Issue:** Returns bournemouth on error  
**Impact:** Consuming code receives wrong city on failure  
**Fix:** Return error instead of false success

---

**app/api/qr/scan/[code]/route.ts**
```typescript
return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bournemouth.qwikker.com'}/discover`)
```
**Issue:** Fallback URL is bournemouth.qwikker.com  
**Impact:** QR errors redirect to bournemouth even for other cities  
**Fix:** Use request hostname to determine redirect city

---

**app/api/admin/login/route.ts**
```typescript
if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
  if (city !== 'bournemouth') {
    return NextResponse.json(...)
  }
}
```
**Issue:** Localhost login ONLY allows bournemouth  
**Impact:** Cannot test Calgary/London admin logins locally  
**Fix:** Accept DEV_DEFAULT_CITY env var for local testing

---

### **2. User Pages with Hardcoded Defaults**

**app/user/dashboard/page.tsx**
```typescript
city: 'bournemouth',
```
**Issue:** Mock user object defaults to bournemouth  
**Impact:** Fallback user data is always bournemouth  
**Fix:** Derive city from hostname, don't hardcode

---

**app/user/saved/page.tsx**
```typescript
city: 'bournemouth',
```
**Issue:** Mock user object defaults to bournemouth  
**Impact:** Fallback user data is always bournemouth  
**Fix:** Derive city from hostname, don't hardcode

---

**app/user/settings/page.tsx**
```typescript
city: currentCity // Use validated city instead of hardcoded 'bournemouth'
```
**Issue:** ✅ Already fixed! (This is CORRECT implementation)  
**Action:** Use this as reference for other pages

---

### **3. Components with Hardcoded Props**

**components/user/user-offers-page.tsx**
```typescript
url={`https://bournemouth.qwikker.com/join?ref=offer-${offer.id}`} // TODO: Make dynamic
```
**Issue:** Share URL is always bournemouth.qwikker.com  
**Impact:** Users sharing Calgary offers will share bournemouth URL  
**Fix:** Use current city from context/hostname

---

**components/wallet-pass/improved-wallet-installer.tsx**
```typescript
city = 'bournemouth'
```
**Issue:** Component prop defaults to bournemouth  
**Impact:** Wallet creation uses bournemouth if city not passed  
**Fix:** Make city required prop (no default)

---

**components/wallet-pass/add-to-wallet-button.tsx**
```typescript
city = 'bournemouth'
```
**Issue:** Button component defaults to bournemouth  
**Impact:** Add-to-wallet uses bournemouth if city not passed  
**Fix:** Make city required prop (no default)

---

**components/intent/universal-qr-router.tsx**
```typescript
city: 'bournemouth' // TODO: Make dynamic
```
**Issue:** Analytics events always sent for bournemouth  
**Impact:** QR analytics will be incorrectly attributed to bournemouth  
**Fix:** Pass city from parent component/context

---

**components/admin/business-crm-card.tsx**
```typescript
{ id: 1, type: 'status_change', message: `${business.business_name} approved`, timestamp: '2024-09-23 10:30', user: 'bournemouth' },
```
**Issue:** Mock activity feed shows 'bournemouth' as user  
**Impact:** Cosmetic issue - confusing activity feed  
**Fix:** Use actual admin user name or city

---

**components/admin/admin-tools-layout.tsx**
```typescript
export function AdminToolsLayout({ children, city = 'bournemouth', cityDisplayName = 'Bournemouth' }: AdminToolsLayoutProps)
```
**Issue:** Component defaults to bournemouth  
**Impact:** Admin layout shows bournemouth if city not passed  
**Fix:** Make city required prop (no default)

---

### **4. Lib Actions with Hardcoded Fallbacks**

**lib/actions/business-actions.ts** (4 occurrences)
```typescript
city: profile.city || 'bournemouth',
```
**Issue:** Slack notifications default to bournemouth  
**Impact:** Cross-city notification failures  
**Fix:** profile.city should never be null; fix at DB level

---

**lib/actions/event-actions.ts**
```typescript
city: businessProfile.city || 'bournemouth',
```
**Issue:** Event notifications default to bournemouth  
**Impact:** Slack notifications go to wrong city  
**Fix:** businessProfile.city should never be null; fix at DB level

---

**lib/actions/file-actions.ts**
```typescript
city: profile.city || 'bournemouth',
```
**Issue:** File upload notifications default to bournemouth  
**Impact:** Slack notifications go to wrong city  
**Fix:** profile.city should never be null; fix at DB level

---

**lib/actions/create-mock-user.ts**
```typescript
city: 'bournemouth',
```
**Issue:** ℹ️ Mock data (OK for dev/testing)  
**Action:** Document this is dev-only, never used in production

---

**lib/actions/get-user-for-chat.ts**
```typescript
city: 'bournemouth',
```
**Issue:** Fallback anonymous user defaults to bournemouth  
**Impact:** Anonymous chat users will see bournemouth businesses  
**Fix:** Derive city from request hostname

---

**lib/actions/offer-claim-actions.ts**
```typescript
const userCity = user?.city || 'bournemouth'
```
**Issue:** Offer redemption form defaults to bournemouth  
**Impact:** GHL redemption form submission goes to wrong city  
**Fix:** user.city should never be null; fix at user creation

---

**lib/actions/walletpush-analytics.ts**
```typescript
export async function getWalletPushAnalytics(city: string = 'bournemouth'): Promise<WalletPushAnalytics>
```
**Issue:** Analytics function defaults to bournemouth  
**Impact:** Analytics calls without city param return bournemouth data  
**Fix:** Make city parameter required (no default)

---

**lib/actions/debug-businesses.ts**
```typescript
.in('business_town', ['bournemouth', 'christchurch', 'poole'])
```
**Issue:** ℹ️ Debug/test code (OK - explicitly for bournemouth franchise)  
**Action:** This is intentional for debugging bournemouth franchise

---

---

## ℹ️ **EXPECTED DEFAULTS (OK)**

These are configuration objects, type definitions, and dev fallbacks that are EXPECTED:

### **Type Definitions**
- `lib/utils/city-detection.ts`: `export type FranchiseCity = 'bournemouth' | 'poole' | 'christchurch'`
- `lib/utils/city-detection.ts`: `const defaultCity: FranchiseCity = 'bournemouth'`

### **Development Fallbacks**
- `lib/utils/city-detection.ts`: `getCityFromHostname('localhost') => 'bournemouth'`
- `lib/utils/location-detection.ts`: `if (hostname.includes('localhost')) { return FRANCHISE_LOCATIONS.bournemouth }`
- `lib/utils/client-city-detection.ts`: `return 'bournemouth' // Default for development`

### **Configuration Objects**
- `lib/utils/location-detection.ts`: `FRANCHISE_LOCATIONS` object with bournemouth config
- `lib/utils/currency.ts`: `CITY_CURRENCY_FALLBACK: { bournemouth: 'GBP' }`
- `lib/utils/qr-code-generator.ts`: `DEFAULT_QR_TEMPLATES` for bournemouth
- `lib/utils/franchise-crm-config.ts`: `FALLBACK_FRANCHISE_CRM_CONFIGS.bournemouth`

### **City List/Validation Arrays**
- `lib/utils/city-detection.ts`: `return ['bournemouth', 'poole', 'christchurch']`
- `lib/utils/franchise-areas.ts`: `return ['bournemouth', 'calgary', 'london', 'paris']`
- `lib/utils/client-city-detection.ts`: `export const KNOWN_FRANCHISE_CITIES = ['bournemouth', 'calgary', ...]`

---

## ✅ **SAFE REFERENCES (NO ACTION)**

These are in documentation, SQL comments, markdown files, migration files, and test examples:

### **Documentation Files**
- All `.md` files (ATLAS_V1.md, CHAT_LOCKDOWN_AUDIT.md, etc.)
- All `docs/` directory files
- README files

### **SQL Files**
- `supabase/migrations/` (SQL examples with bournemouth)
- `scripts/*.sql` (SQL test queries with bournemouth)
- Comments in migration files

### **Test/Debug Code**
- `app/api/test-slack-bournemouth/route.ts` (intentionally bournemouth-specific)
- `app/api/debug/events/route.ts` (debug endpoint with hardcoded bournemouth)
- `scripts/` directory SQL test files

### **Example/Legacy Code**
- `app/user/chat/page-secure.tsx.example` (example file, not used)
- `qwikker-clean-export/` directory (old export, not active)

---

## 🎯 **RECOMMENDED FIXES (PRIORITY ORDER)**

### **Phase 1: Critical Multi-City Blockers** 🔥
1. **Fix GHL webhook** (`app/api/ghl-webhook/user-creation/route.ts`) - ALL new users are bournemouth
2. **Fix chat API** (`app/api/ai/chat-simple/route.ts`) - Chat shows wrong city businesses
3. **Fix wallet creation** (`app/api/walletpass/create-main-pass/route.ts`) - Wrong URLs in wallet passes
4. **Fix QR redirects** (`app/api/qr/scan/[code]/route.ts`) - Errors redirect to bournemouth

### **Phase 2: Admin/CRM Issues** ⚠️
5. **Fix admin claims** (`app/api/admin/claims/route.ts`) - Wrong city claims shown
6. **Fix admin login** (`app/api/admin/login/route.ts`) - Cannot test other cities locally
7. **Fix all Slack notifications** (6 files) - Notifications go to wrong city

### **Phase 3: User Experience** 📱
8. **Fix user pages** (`app/user/dashboard/page.tsx`, `app/user/saved/page.tsx`) - Wrong fallback city
9. **Fix share URLs** (`components/user/user-offers-page.tsx`) - Wrong city in share links
10. **Fix QR analytics** (`components/intent/universal-qr-router.tsx`) - Wrong city attribution

### **Phase 4: Component Props** 🧩
11. **Remove defaults from components** - Make city a required prop
    - `components/wallet-pass/improved-wallet-installer.tsx`
    - `components/wallet-pass/add-to-wallet-button.tsx`
    - `components/admin/admin-tools-layout.tsx`

### **Phase 5: Database Integrity** 🗄️
12. **Ensure city is never null** - Fix at DB schema level
    - Add NOT NULL constraint to `business_profiles.city`
    - Add NOT NULL constraint to `app_users.city`
    - Backfill any null values with correct city

---

## 🔍 **DETECTION PATTERNS**

Use these patterns to find similar issues in new code:

### **Bad Patterns** ❌
```typescript
// Hardcoded default parameter
function doSomething(city = 'bournemouth') { }

// Hardcoded fallback
const city = someValue || 'bournemouth'

// Hardcoded URL
const url = 'https://bournemouth.qwikker.com/...'

// Hardcoded in object
const data = { city: 'bournemouth', ... }
```

### **Good Patterns** ✅
```typescript
// Required parameter
function doSomething(city: string) { }

// Derive from hostname
const city = await getCityFromHostname(request.headers.get('host'))

// Use current city context
const city = user.city || detectedCity || await getFranchiseCityFromRequest()

// Dynamic URL
const url = `https://${city}.qwikker.com/...`

// Derived from context
const data = { city: user.city, ... }
```

---

## 📋 **NEXT STEPS**

1. ✅ **Review this audit** - Confirm priorities and approach
2. 🔨 **Create fix plan** - Break into implementable tickets
3. 🧪 **Setup multi-city testing** - Use `.local` domains for Calgary/London testing
4. 🚀 **Implement Phase 1** - Fix critical blockers first
5. ✅ **Test each fix** - Verify with actual multi-city data
6. 📚 **Document patterns** - Add to coding standards

---

## 🎓 **LESSONS LEARNED**

### **Why This Happened**
- Bournemouth was first/only franchise during initial development
- MVP speed prioritized over multi-city architecture
- Missing city detection layer at app startup
- No multi-city testing environment

### **How to Prevent**
- ✅ Make `city` a required parameter (no defaults) in new functions
- ✅ Add city context to all server actions via middleware
- ✅ Setup `.local` domain testing for all franchises
- ✅ Add linting rule to detect hardcoded 'bournemouth' strings
- ✅ Add E2E tests that run against multiple cities
- ✅ Make city a required field in all relevant DB tables

---

**END OF AUDIT**
