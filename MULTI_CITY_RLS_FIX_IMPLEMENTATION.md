# 🔒 MULTI-CITY RLS SECURITY FIX

## **THE PROBLEM**

Your current RLS policies allow cross-city data leakage:

### **Issue 1: Public Discover Bypasses City Isolation**
```sql
-- CURRENT (INSECURE):
CREATE POLICY "Anyone can read discoverable businesses"
USING (status IN ('approved','unclaimed','claimed_free'));
-- ❌ No city check! Calgary users can see Bournemouth data
```

### **Issue 2: Anonymous Inserts Allowed**
```sql
-- CURRENT (RISKY):
WITH CHECK ((auth.uid() IS NULL) OR (auth.uid() = user_id))
-- ❌ Allows spam/abuse from unauthenticated users
```

### **Issue 3: City Context Not Set**
- Middleware doesn't call `set_current_city()`
- RLS policies can't enforce city filtering
- Defaults to 'bournemouth' for everyone

---

## **THE FIX**

### **Files Changed:**
1. ✅ `supabase/migrations/20260112000000_fix_multi_city_rls_security.sql` (created)
2. ✅ `lib/supabase/middleware.ts` (updated)

---

## **STEP-BY-STEP IMPLEMENTATION**

### **Step 1: Run the Migration (5 mins)**

1. Open Supabase SQL Editor
2. Copy/paste: `supabase/migrations/20260112000000_fix_multi_city_rls_security.sql`
3. Run it
4. Verify no errors

**What it does:**
- ✅ Removes insecure public read policy
- ✅ Removes anonymous insert policy  
- ✅ Creates city-aware public read policy
- ✅ Creates authenticated-only insert policy
- ✅ Adds city filtering to business_offers

---

### **Step 2: Verify the Migration (2 mins)**

Run these test queries in Supabase:

```sql
-- Test 1: Set city context to bournemouth
SELECT set_current_city('bournemouth');

-- Test 2: Query discoverable businesses
SELECT city, COUNT(*) as count
FROM business_profiles
WHERE status IN ('approved','unclaimed','claimed_free')
GROUP BY city;

-- Expected: Only bournemouth businesses (if city context is set)
```

```sql
-- Test 3: Try to set a different city
SELECT set_current_city('calgary');

-- Test 4: Query again
SELECT city, COUNT(*) as count
FROM business_profiles
WHERE status IN ('approved','unclaimed','claimed_free')
GROUP BY city;

-- Expected: Only calgary businesses (or 0 if no calgary data yet)
```

---

### **Step 3: Deploy Middleware Changes**

**Already done!** `lib/supabase/middleware.ts` now:
1. Detects city from subdomain (`getCityFromHostname`)
2. Calls `set_current_city()` before any queries
3. Sets RLS context for all public routes

---

### **Step 4: Test in Your App (10 mins)**

#### **Test A: Public Discover Page**

1. **Visit Bournemouth:**
   ```
   http://bournemouth.localhost:3000/user/discover
   ```
   - Should show only Bournemouth businesses

2. **Visit Calgary (if you have data):**
   ```
   http://calgary.localhost:3000/user/discover
   ```
   - Should show only Calgary businesses

3. **Visit via main domain:**
   ```
   http://app.qwikker.com/user/discover
   ```
   - Should default to Bournemouth (per `getCityFromHostname` fallback)

#### **Test B: Anonymous Insert Prevention**

Try this in Supabase SQL Editor:

```sql
-- Should FAIL:
INSERT INTO business_profiles (business_name, city, user_id)
VALUES ('Test Business', 'bournemouth', NULL);

-- Error: new row violates row-level security policy
```

#### **Test C: Authenticated Insert Still Works**

1. Log in as a business user
2. Try to update your profile
3. Should work normally

---

## **WHAT CHANGED & WHY**

### **Before:**
```
User visits calgary.qwikker.com/user/discover
  ↓
Supabase query: SELECT * FROM business_profiles WHERE status = 'approved'
  ↓
RLS: ✅ Allow (no city check)
  ↓
Returns: ALL businesses (bournemouth + calgary + london...)
```

### **After:**
```
User visits calgary.qwikker.com/user/discover
  ↓
Middleware: set_current_city('calgary')
  ↓
Supabase query: SELECT * FROM business_profiles WHERE status = 'approved'
  ↓
RLS: ✅ Allow ONLY if city = 'calgary'
  ↓
Returns: ONLY calgary businesses
```

---

## **ROLLBACK PLAN (If Something Breaks)**

If you need to rollback:

```sql
-- Restore old public read policy (INSECURE but working)
DROP POLICY IF EXISTS "Public can read discoverable businesses in current city" ON business_profiles;

CREATE POLICY "Anyone can read discoverable businesses"
ON business_profiles
FOR SELECT
TO public
USING (status IN ('approved','unclaimed','claimed_free'));
```

Then in `lib/supabase/middleware.ts`, comment out:
```typescript
// await supabase.rpc('set_current_city', { city_name: currentCity })
```

---

## **VERIFICATION CHECKLIST**

Before considering this done:

- [ ] Migration ran without errors
- [ ] `set_current_city()` function exists in Supabase
- [ ] Middleware calls `set_current_city()` without errors
- [ ] Public discover page shows correct city data
- [ ] Anonymous inserts are blocked
- [ ] Authenticated business updates still work
- [ ] No errors in Vercel/Next.js logs

---

## **COMMON ISSUES & FIXES**

### **Issue: "function set_current_city does not exist"**

**Cause:** The function was created in an earlier migration (`20251013000000_add_tenant_isolation_security.sql`)

**Fix:** Run that migration first, or add this to your current migration:

```sql
CREATE OR REPLACE FUNCTION set_current_city(city_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM set_config('app.current_city', city_name, false);
END;
$$;
```

---

### **Issue: Still seeing cross-city data**

**Debug steps:**

1. Check if middleware is actually running:
   ```typescript
   // Add this log in lib/supabase/middleware.ts
   console.log('🌍 Setting city context:', currentCity)
   ```

2. Check if RLS policy is active:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'business_profiles' 
   AND policyname LIKE '%current city%';
   ```

3. Manually test city context:
   ```sql
   SELECT set_current_city('bournemouth');
   SELECT current_setting('app.current_city', true);
   -- Should return: bournemouth
   ```

---

## **NEXT STEPS AFTER THIS FIX**

Once this is working:

1. ✅ Fix claim page hardcoded city (separate task)
2. ✅ Fix claim search API to use server-derived city
3. ✅ Add city validation to business dashboard (defense-in-depth)
4. ✅ Test with multiple subdomains in production

---

## **SECURITY IMPACT**

### **Before:**
- 🔴 Any visitor could see all businesses (all cities)
- 🔴 Bots could spam business_profiles table
- 🔴 No multi-city isolation for public routes

### **After:**
- ✅ Visitors only see their subdomain's city
- ✅ Only authenticated users can create profiles
- ✅ Multi-city isolation enforced at database level

---

**Ready to run the migration?** It's a **CRITICAL** fix for multi-city launch. 🚀

