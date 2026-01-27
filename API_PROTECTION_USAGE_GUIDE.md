# API Route Protection - Usage Guide

## 🚨 **CRITICAL: All Dashboard API Routes MUST Use Protection**

Even with perfect middleware, attackers can call API routes directly.  
**Every `/api/dashboard/*` route must validate business + city.**

---

## 📦 **Protection Helper**

Location: `lib/auth/api-protection.ts`

**What it validates:**
1. ✅ User is authenticated
2. ✅ User owns a business
3. ✅ Business city matches current subdomain (franchise isolation)
4. ✅ Fails closed (denies access if validation fails)

---

## 🔧 **How to Use: Method 1 (Wrapper)**

**Recommended for new routes - cleanest pattern**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withApiProtection } from '@/lib/auth/api-protection'

export async function POST(request: NextRequest) {
  return withApiProtection(request, async ({ businessId, city, business }) => {
    // Your route logic here - already validated!
    
    const body = await request.json()
    
    // Do something with the validated business
    // businessId, city, and business are guaranteed valid
    
    return NextResponse.json({ 
      success: true,
      businessId,
      city
    })
  })
}
```

**Benefits:**
- ✅ Automatic error handling
- ✅ Consistent error responses
- ✅ Clean, readable code

---

## 🔧 **How to Use: Method 2 (Manual)**

**Use when you need more control over error handling**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getValidatedBusinessForRequest } from '@/lib/auth/api-protection'

export async function POST(request: NextRequest) {
  try {
    // Validate FIRST, before any logic
    const { businessId, city, business } = await getValidatedBusinessForRequest(request)
    
    // Now do your route logic
    const body = await request.json()
    
    // Example: Update business profile
    const supabase = createClient()
    const { error } = await supabase
      .from('business_profiles')
      .update({ something: body.value })
      .eq('id', businessId) // Use validated businessId
      .eq('city', city)     // Double-check city
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    const status = error.status || 500
    return NextResponse.json(
      { error: error.message },
      { status }
    )
  }
}
```

---

## 🛡️ **Admin Routes Protection**

For admin API routes, use `getValidatedAdminForRequest`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getValidatedAdminForRequest } from '@/lib/auth/api-protection'

export async function POST(request: NextRequest) {
  try {
    // Validate admin access
    const { adminId, city, email } = await getValidatedAdminForRequest(request)
    
    // Admin logic here
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    )
  }
}
```

---

## 🔍 **Example: Updating Existing Route**

### ❌ **Before (INSECURE):**

```typescript
// app/api/dashboard/profile/route.ts
export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await request.json()
  
  // 🚨 SECURITY HOLE: No franchise isolation check!
  // London admin could update Bournemouth business by guessing IDs
  const { error } = await supabase
    .from('business_profiles')
    .update({ business_name: body.name })
    .eq('owner_user_id', user.id) // Only checks user, not city!
  
  return NextResponse.json({ success: !error })
}
```

### ✅ **After (SECURE):**

```typescript
// app/api/dashboard/profile/route.ts
import { withApiProtection } from '@/lib/auth/api-protection'

export async function PUT(request: NextRequest) {
  return withApiProtection(request, async ({ businessId, city }) => {
    const supabase = createClient()
    const body = await request.json()
    
    // ✅ SECURE: businessId and city are validated
    const { error } = await supabase
      .from('business_profiles')
      .update({ business_name: body.name })
      .eq('id', businessId)  // ✅ Validated business
      .eq('city', city)      // ✅ Validated city
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  })
}
```

---

## 📋 **Routes That MUST Be Protected**

### **High Priority (Write Operations):**
- ✅ `/api/dashboard/profile` (update business profile)
- ✅ `/api/dashboard/menu/upload` (upload menus)
- ✅ `/api/dashboard/offers` (create/update/delete offers)
- ✅ `/api/dashboard/events` (create/update/delete events)
- ✅ `/api/dashboard/secret-menu` (manage secret menu)
- ✅ `/api/dashboard/hours` (update business hours)
- ✅ `/api/dashboard/images` (upload images)

### **Medium Priority (Read Operations):**
- ⚠️ `/api/dashboard/analytics` (view analytics)
- ⚠️ `/api/dashboard/subscription` (view subscription)
- ⚠️ `/api/dashboard/stats` (view stats)

**Note:** Read operations should also be protected to prevent information disclosure.

---

## 🧪 **Testing Protected Routes**

### **Test 1: Valid Access**
```bash
# Should succeed
curl -X POST https://bournemouth.qwikker.com/api/dashboard/profile \
  -H "Cookie: <valid_session>" \
  -d '{"name": "New Name"}'
```

### **Test 2: Cross-City Attack**
```bash
# Should fail with 403
# Log in as London business, try to access Bournemouth API
curl -X POST https://bournemouth.qwikker.com/api/dashboard/profile \
  -H "Cookie: <london_session>" \
  -d '{"name": "Hacked"}'

# Expected: 403 Forbidden
# Expected log: 🚨 API Protection: FRANCHISE ISOLATION VIOLATION
```

### **Test 3: No Auth**
```bash
# Should fail with 401
curl -X POST https://bournemouth.qwikker.com/api/dashboard/profile \
  -d '{"name": "No Auth"}'

# Expected: 401 Unauthorized
```

---

## 🚨 **Common Mistakes to Avoid**

### ❌ **Mistake 1: Only checking user, not city**
```typescript
// BAD - only checks owner_user_id
.eq('owner_user_id', user.id)

// GOOD - checks both
.eq('id', businessId)
.eq('city', city)
```

### ❌ **Mistake 2: Skipping validation for "safe" routes**
```typescript
// BAD - read operations still need protection
export async function GET(request: NextRequest) {
  // No validation - attacker can read other cities' data!
}

// GOOD - always validate
export async function GET(request: NextRequest) {
  return withApiProtection(request, async ({ businessId, city }) => {
    // Now safe to query
  })
}
```

### ❌ **Mistake 3: Trusting request body for business ID**
```typescript
// BAD - attacker can send any businessId
const { businessId } = await request.json()
.eq('id', businessId) // 🚨 Can access any business!

// GOOD - use validated businessId
const { businessId } = await getValidatedBusinessForRequest(request)
.eq('id', businessId) // ✅ Only their own business
```

---

## 🔒 **Security Guarantees**

When you use `withApiProtection` or `getValidatedBusinessForRequest`, you get:

1. **✅ Authenticated User:** `userId` is a valid auth user
2. **✅ Business Ownership:** User owns the business (`owner_user_id` match)
3. **✅ Franchise Isolation:** Business city matches subdomain
4. **✅ Fail-Closed:** Any validation failure = 401/403 error
5. **✅ Logging:** All violations logged to console

---

## 📊 **Audit Checklist**

Use this to audit existing routes:

```bash
# Find all dashboard API routes
find app/api/dashboard -name "route.ts"

# For each route, check:
[ ] Does it use withApiProtection or getValidatedBusinessForRequest?
[ ] Does it query using validated businessId?
[ ] Does it include .eq('city', city) in queries?
[ ] Does it handle validation errors properly?
```

---

## 🎯 **Next Steps**

1. **Immediate:** Update all write routes (offers, menus, profile, etc.)
2. **Short-term:** Update all read routes (analytics, stats, etc.)
3. **Long-term:** Add automated tests for franchise isolation

---

## 💡 **Questions?**

If you're unsure whether a route needs protection:

**Ask yourself:**
- Does this route access business data?
- Does this route modify business data?
- Could an attacker misuse this if they called it directly?

**If any answer is YES → protect the route!**

When in doubt, **always protect** - it's better to over-protect than under-protect.
