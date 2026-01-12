# 🔍 City/Franchise Resolution Investigation

## **THE PROBLEM: Two Different Systems!**

You have **TWO** separate city detection systems that work differently:

---

## **System 1: `getCityFromRequest` (Old System)**

**File:** `lib/utils/city-detection.ts`  
**Used by:** Some admin routes

**Logic:**
```typescript
// localhost → 'bournemouth'
// vercel.app → 'bournemouth'
// www/app/api subdomains → 'bournemouth' ✅ THIS IS WHY ADMIN WORKS
// Unknown subdomains → ERROR
```

**Used in:**
- ✅ `app/admin/import/page.tsx` (line 2)
- ✅ `app/admin/login/page.tsx` (line 2)

---

## **System 2: `getFranchiseCityFromRequest` (New System)**

**File:** `lib/utils/franchise-areas.ts`  
**Used by:** User routes + some admin routes

**Logic:**
```typescript
// localhost → 'bournemouth'
// vercel.app → 'bournemouth'
// .local domains → allow any (testing)
// Valid franchise subdomain → return that city
// ❌ www/app/api subdomains → NOT handled! → THROWS ERROR
```

**Used in:**
- ✅ `app/admin/page.tsx` (via `getCityFromRequest` line 15)
- ✅ ALL user routes (via `getSafeCurrentCity`)
- ✅ `createTenantAwareClient` (tenant-security.ts)

---

## **Why Admin Works But User Routes Don't**

### **On `app.qwikker.com`:**

1. **Admin import page** (`/admin/import`)
   - Uses `getCityFromRequest` from `city-detection.ts`
   - Sees `app` subdomain → returns `'bournemouth'` ✅
   - **WORKS**

2. **Main admin dashboard** (`/admin`)
   - Uses `getCityFromRequest` from `city-detection.ts`
   - Sees `app` subdomain → returns `'bournemouth'` ✅
   - **WORKS**

3. **User discover page** (`/user/discover`)
   - Uses `getSafeCurrentCity` → calls `getFranchiseCityFromRequest`
   - Sees `app` subdomain → tries `isValidFranchiseCity('app')` → FALSE
   - Throws error: `"Access denied: Unknown franchise hostname"`
   - **BREAKS** ❌

---

## **The Solution: Fix `getFranchiseFromHostname`**

Add the same `www/app/api` handling to `franchise-areas.ts`:

```typescript
// In getFranchiseFromHostname (line 133-143)
if (parts.length >= 2) {
  const subdomain = parts[0].toLowerCase()
  
  // Check if it's the main domain (www, app, etc.)
  if (['www', 'app', 'api'].includes(subdomain)) {
    return 'bournemouth' // Default for main domain
  }
  
  // Check if it's a known franchise
  if (await isValidFranchiseCity(subdomain)) {
    console.log(`🌍 Franchise detected from subdomain: ${subdomain}`)
    return subdomain
  }
}
```

---

## **Long-Term Fix: Use ONE System**

**Option A: Migrate everything to `franchise-areas.ts`** (Recommended)
1. Add `www/app/api` handling to `getFranchiseFromHostname`
2. Replace all `getCityFromRequest` imports with `getFranchiseCityFromRequest`
3. Delete `city-detection.ts`

**Option B: Keep both but make them consistent**
1. Add `www/app/api` handling to BOTH files
2. Document when to use which

---

## **Files That Need Updating**

### **Critical (breaks user routes):**
- ✅ `lib/utils/franchise-areas.ts` - Add `www/app/api` fallback

### **Consistency (admin inconsistency):**
- `app/admin/import/page.tsx` - Change to `getFranchiseCityFromRequest`
- `app/admin/login/page.tsx` - Change to `getFranchiseCityFromRequest`

---

## **Quick Fix (5 minutes)**

Just add this to `franchise-areas.ts` line 136:

```typescript
// Check if it's the main domain (www, app, etc.)
if (['www', 'app', 'api'].includes(subdomain)) {
  console.log(`🌐 Main domain detected (${subdomain}) - defaulting to Bournemouth`)
  return 'bournemouth'
}
```

This will make user routes work on `app.qwikker.com`!

---

## **Summary**

- ✅ Admin works because it uses the old `city-detection.ts` with `www/app/api` fallback
- ❌ User routes break because they use new `franchise-areas.ts` WITHOUT that fallback
- 🔧 Fix: Add 3 lines to `franchise-areas.ts` to handle `www/app/api` subdomains
- 🎯 Long-term: Consolidate to ONE system

**Ready to fix?** I can apply the changes now! 🚀

