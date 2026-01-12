# 🚨 CRITICAL FIX: Vercel Preview Environment Detection

**Date:** 2026-01-12  
**Issue:** City detection was blocking Vercel Preview URLs  
**Status:** ✅ FIXED

---

## **THE BUG:**

### **What Was Broken:**

```typescript
// ❌ OLD CODE (BROKEN):
const vercelEnv = process.env.VERCEL_ENV
const nodeEnv = process.env.NODE_ENV
const isProd = vercelEnv === 'production' || nodeEnv === 'production'  // ← BUG!
```

### **Why It Broke:**

On Vercel Preview deployments:
- `VERCEL_ENV = 'preview'` ✅
- `NODE_ENV = 'production'` ❌ (always 'production' because it's a production build)
- `isProd = true` ← **WRONG!**
- Result: **Blocks preview URLs with "Access denied" error**

### **Impact:**

❌ Your dad couldn't test on `qwikkerdashboard-theta.vercel.app/claim`  
❌ All Vercel Preview deployments would error  
❌ Testing workflow completely broken  

---

## **THE FIX:**

### **What Changed:**

```typescript
// ✅ NEW CODE (FIXED):
const vercelEnv = process.env.VERCEL_ENV // 'production' | 'preview' | 'development' | undefined
const isProd = vercelEnv === 'production' // ✅ Only strict in actual production
const allowUnsafeFallbacks = !isProd

// Added debug logging (temporary):
console.log('🔍 City Detection Debug:', {
  hostname: cleanHost,
  VERCEL_ENV: vercelEnv,
  NODE_ENV: process.env.NODE_ENV,
  isProd,
  allowUnsafeFallbacks
})
```

### **Now It Works:**

| Environment | VERCEL_ENV | NODE_ENV | Behavior |
|-------------|------------|----------|----------|
| **Local Dev** | `undefined` | `development` | ✅ Fallback to bournemouth |
| **Vercel Preview** | `preview` | `production` | ✅ Fallback to bournemouth |
| **Vercel Production** | `production` | `production` | ✅ STRICT (city required) |

---

## **HOW TO VERIFY THE FIX:**

### **Method 1: Debug Endpoint (Easiest)**

Visit this URL after deploying:

```
https://qwikkerdashboard-theta.vercel.app/api/debug/env-check
```

**Expected Response:**

```json
{
  "environment": {
    "VERCEL_ENV": "preview",
    "NODE_ENV": "production",
    "VERCEL_URL": "qwikkerdashboard-theta.vercel.app"
  },
  "request": {
    "hostname": "qwikkerdashboard-theta.vercel.app",
    "host": "qwikkerdashboard-theta.vercel.app"
  },
  "detection": {
    "city": "bournemouth",
    "error": null
  },
  "explanation": {
    "isProd": false,
    "allowFallbacks": true,
    "behavior": "FALLBACK (defaults to bournemouth)"
  }
}
```

**Key Checks:**
- ✅ `VERCEL_ENV: "preview"`
- ✅ `isProd: false`
- ✅ `allowFallbacks: true`
- ✅ `city: "bournemouth"`

---

### **Method 2: Test Claim Flow**

```
https://qwikkerdashboard-theta.vercel.app/claim
```

**Expected:**
- ✅ Page loads (no "Access denied" error)
- ✅ Shows Bournemouth businesses
- ✅ Claim flow works

---

### **Method 3: Check Console Logs**

After deploying, check Vercel logs:

```
🔍 City Detection Debug: {
  hostname: 'qwikkerdashboard-theta.vercel.app',
  VERCEL_ENV: 'preview',
  NODE_ENV: 'production',
  isProd: false,
  allowUnsafeFallbacks: true
}
```

---

## **TESTING CHECKLIST:**

### **Before Sending to Dad:**

- [ ] Deploy to Vercel Preview
- [ ] Visit `/api/debug/env-check`
- [ ] Verify `isProd: false`
- [ ] Test `/claim` page loads
- [ ] Test claim flow works
- [ ] Check console shows "bournemouth" detection

### **Test URLs:**

```bash
# 1. Environment check
https://qwikkerdashboard-theta.vercel.app/api/debug/env-check

# 2. City detection
https://qwikkerdashboard-theta.vercel.app/api/internal/get-city

# 3. Claim page
https://qwikkerdashboard-theta.vercel.app/claim

# 4. Discover page
https://qwikkerdashboard-theta.vercel.app/user/discover
```

---

## **PRODUCTION BEHAVIOR (When Ready):**

When you deploy to production with custom domain:

### **Production Setup:**

```
1. DNS: bournemouth.qwikker.com → CNAME → vercel.app
2. Vercel: Add domain bournemouth.qwikker.com
3. Deploy: Vercel sets VERCEL_ENV='production'
```

### **Production Behavior:**

| URL | Result |
|-----|--------|
| `bournemouth.qwikker.com` | ✅ Works (validated against DB) |
| `calgary.qwikker.com` | ✅ Works (validated against DB) |
| `qwikker.com` | ❌ ERROR - "No franchise subdomain" |
| `*.vercel.app` | ❌ ERROR - "vercel.app not allowed in production" |

### **Verify Production:**

```bash
# Should work:
curl https://bournemouth.qwikker.com/api/debug/env-check

# Expected:
{
  "environment": { "VERCEL_ENV": "production" },
  "explanation": { "isProd": true, "allowFallbacks": false }
}

# Should error:
curl https://qwikkerdashboard-theta.vercel.app/api/debug/env-check

# Expected: (if you keep preview live)
{
  "environment": { "VERCEL_ENV": "preview" },
  "explanation": { "isProd": false, "allowFallbacks": true }
}
```

---

## **CLEANUP AFTER VERIFICATION:**

Once you've verified everything works:

### **1. Remove Debug Logging**

In `lib/utils/city-detection.ts`, remove these lines:

```typescript
// 🔍 Temporary logging (remove after verifying)
if (process.env.NODE_ENV !== 'production' || vercelEnv === 'preview') {
  console.log('🔍 City Detection Debug:', {
    hostname: cleanHost,
    VERCEL_ENV: vercelEnv,
    NODE_ENV: process.env.NODE_ENV,
    isProd,
    allowUnsafeFallbacks
  })
}
```

### **2. Delete Debug Endpoint**

```bash
rm app/api/debug/env-check/route.ts
```

Or add authentication if you want to keep it for monitoring.

---

## **FILES CHANGED:**

- ✅ `lib/utils/city-detection.ts` - Fixed environment detection
- ✅ `app/api/debug/env-check/route.ts` - Added debug endpoint (temporary)

---

## **WHAT TO TELL YOUR DAD:**

```
Hey Dad,

I fixed the preview link. Try this:
https://qwikkerdashboard-theta.vercel.app/claim

It should work now. Let me know if you see any errors!

(It's in test mode so it shows Bournemouth businesses - that's expected)
```

---

## **SUMMARY:**

### **The Bug:**
- ❌ Used `NODE_ENV === 'production'` to detect strict mode
- ❌ Vercel Preview sets `NODE_ENV='production'` (build mode)
- ❌ Blocked all preview URLs with "Access denied"

### **The Fix:**
- ✅ Now uses `VERCEL_ENV === 'production'` to detect strict mode
- ✅ Vercel Preview has `VERCEL_ENV='preview'` (correct!)
- ✅ Preview URLs work with bournemouth fallback
- ✅ Production remains strict (city required)

### **Verification:**
- ✅ Added `/api/debug/env-check` endpoint
- ✅ Added console logging (temporary)
- ✅ Can verify behavior in each environment

---

**Bottom Line:** Your dad can now test on the Vercel Preview URL safely, and production will still be strict when you launch! 🚀

