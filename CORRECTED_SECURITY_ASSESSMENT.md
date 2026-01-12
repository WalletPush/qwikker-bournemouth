# 🔍 **CORRECTED MULTI-TENANCY ASSESSMENT**

## **I WAS PARTIALLY WRONG - HERE'S THE FULL PICTURE:**

---

## **✅ BUSINESS DASHBOARD IS ACTUALLY PROTECTED (Sort Of)**

### **What I Found:**

**1. RLS Policies DO Exist:**
```sql
-- supabase/migrations/20251013000000_add_tenant_isolation_security.sql
CREATE POLICY "Tenant isolation for business_profiles"
ON public.business_profiles
FOR SELECT
TO authenticated
USING (
    current_setting('role') = 'service_role'
    OR
    city = COALESCE(
        current_setting('app.current_city', true),
        'bournemouth'  -- Fallback
    )
);
```

**2. Business Dashboard Uses Authenticated Client:**
```typescript
// app/dashboard/page.tsx
const supabase = await createClient() // Uses ANON_KEY, not service role

const { data: profile } = await supabase
  .from('business_profiles')
  .select('*')
  .eq('user_id', data.claims.sub) // Filters by authenticated user
  .single()
```

---

## **🟡 THE REAL SECURITY MODEL:**

### **Primary Protection: `user_id` Filter**
- Each business profile has a UNIQUE `user_id` (from auth.users)
- Dashboard queries `.eq('user_id', auth.uid())`
- A Calgary business owner can only see THEIR business (their user_id)

### **Secondary Protection: RLS Policy**
- RLS allows: service_role OR matching city
- **BUT:** Business dashboard doesn't set `app.current_city`
- **SO:** RLS defaults to showing all `bournemouth` businesses
- **HOWEVER:** The `user_id` filter still applies, so you only see YOUR business

---

## **⚠️ THE ACTUAL VULNERABILITY:**

The business dashboard is MOSTLY safe BUT has a subtle weakness:

### **Scenario: What if RLS is disabled or fails?**

If RLS gets disabled (accidentally or maliciously):
```sql
-- If someone runs this:
ALTER TABLE business_profiles DISABLE ROW LEVEL SECURITY;
```

Then the query becomes:
```typescript
SELECT * FROM business_profiles 
WHERE user_id = 'user-123' -- Still filters by user_id
```

**This is STILL SAFE** because `user_id` is the primary filter!

---

## **🔴 THE ACTUAL CRITICAL ISSUES:**

### **1. CLAIM PAGE - DEFINITELY BROKEN**
```typescript
// app/claim/page.tsx line 81
body: JSON.stringify({ query: trimmedQuery, city: 'bournemouth' })
```
**Risk:** Calgary users can ONLY search Bournemouth businesses  
**Fix Required:** YES

---

### **2. CLAIM SEARCH API - ACCEPTS CLIENT CITY**
```typescript
// app/api/claim/search/route.ts line 11
const { query, city = 'bournemouth' } = await request.json()
```
**Risk:** Client can request ANY city  
**Fix Required:** YES

---

### **3. BUSINESS DASHBOARD - NOT BROKEN BUT NOT IDEAL**

**Current State:**
- ✅ Uses authenticated client
- ✅ Filters by `user_id` (primary security)
- ⚠️ Doesn't set city context (secondary security missing)
- ✅ RLS policies exist as backup

**Risk Level:** 🟡 **LOW** (user_id filter is strong)

**Best Practice Fix:** Add explicit city check for defense-in-depth:
```typescript
// Verify business.city matches subdomain.city
if (profile.city !== requestCity) {
  redirect(`https://${profile.city}.qwikker.com/dashboard`)
}
```

---

## **🎯 REVISED PRIORITY:**

### **P0 (Must Fix Before Multi-City Launch):**
1. ✅ Claim page hardcoded city → derive from subdomain
2. ✅ Claim search API accepts client city → derive from headers

### **P1 (Best Practice, Not Critical):**
3. 🟡 Business dashboard add city redirect (defense-in-depth)
4. 🟡 Consolidate two city detection systems

### **P2 (Nice to Have):**
5. Set `app.current_city` in business dashboard for proper RLS
6. Remove hardcoded 'bournemouth' fallbacks in RLS policies

---

## **✅ WHAT'S ACTUALLY SAFE:**

- ✅ Business dashboard (protected by user_id filter + RLS)
- ✅ Admin dashboard (checks isAdminForCity)
- ✅ Admin approval API (validates city at multiple layers)
- ✅ User routes (use getSafeCurrentCity)

---

## **❌ WHAT'S ACTUALLY BROKEN:**

- ❌ Claim page (hardcoded bournemouth)
- ❌ Claim search API (accepts client-supplied city)

---

## **HONEST ANSWER TO: "Will it break the app?"**

**NO - The business dashboard will NOT break because:**
1. It uses `user_id` as the primary filter (very strong)
2. RLS exists as a secondary layer
3. Even without city context, you can't see other users' businesses

**BUT - The claim flow IS broken for multi-city:**
- Calgary users can't find Calgary businesses
- Only searches Bournemouth

---

## **RECOMMENDED ACTION:**

Fix the claim page + API ONLY (low risk):
1. Claim page: detect city client-side
2. Claim API: derive city from request headers

Leave business dashboard alone for now (it's working, don't break it).

**Want me to fix JUST the claim flow?** That's the actual blocker. 🎯

