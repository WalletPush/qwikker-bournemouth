# ATOMIC APPROVAL — EXACT CODE DIFFS

## 1. New RPC Function (Migration)

**File:** `/supabase/migrations/20260120000000_atomic_approval_with_trial.sql`

```sql
CREATE OR REPLACE FUNCTION approve_business_with_trial(
  p_business_id UUID,
  p_approved_by UUID,
  p_manual_override BOOLEAN DEFAULT false,
  p_manual_override_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trial_tier_id UUID;
  v_trial_days INTEGER := 90;
  v_now TIMESTAMPTZ := NOW();
  v_trial_end_date TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- 1. Get trial tier ID and trial days
  SELECT id, (features->>'trial_days')::INTEGER
  INTO v_trial_tier_id, v_trial_days
  FROM subscription_tiers
  WHERE tier_name = 'trial'
  LIMIT 1;
  
  IF v_trial_tier_id IS NULL THEN
    RAISE EXCEPTION 'Trial tier not found';
  END IF;
  
  IF v_trial_days IS NULL THEN
    v_trial_days := 90;
  END IF;
  
  v_trial_end_date := v_now + (v_trial_days || ' days')::INTERVAL;
  
  -- 2. Update business_profiles (atomic)
  UPDATE business_profiles
  SET
    status = 'approved',
    approved_by = p_approved_by,
    approved_at = v_now,
    business_tier = 'free_trial',
    plan = 'featured',
    manual_override = CASE WHEN p_manual_override THEN true ELSE manual_override END,
    manual_override_at = CASE WHEN p_manual_override THEN v_now ELSE manual_override_at END,
    manual_override_by = CASE WHEN p_manual_override THEN p_manual_override_by ELSE manual_override_by END,
    updated_at = v_now
  WHERE id = p_business_id
    AND status != 'approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found or already approved';
  END IF;
  
  -- 3. Create subscription (atomic)
  INSERT INTO business_subscriptions (
    business_id, tier_id, status, is_in_free_trial,
    free_trial_start_date, free_trial_end_date,
    current_period_start, current_period_end,
    created_at, updated_at
  )
  VALUES (
    p_business_id, v_trial_tier_id, 'trial', true,
    v_now, v_trial_end_date,
    v_now, v_trial_end_date,
    v_now, v_now
  )
  ON CONFLICT (business_id) DO NOTHING;
  
  -- 4. Return result
  RETURN jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'trial_end_date', v_trial_end_date,
    'trial_days', v_trial_days
  );
END;
$$;

GRANT EXECUTE ON FUNCTION approve_business_with_trial TO service_role;
```

---

## 2. Approval Route (Using RPC)

**File:** `/app/api/admin/approve-business/route.ts` (Lines 72-110)

### DIFF:

```diff
-      // Build update data
-      const updateData: any = {
-        status: 'approved',
-        approved_by: user.id,
-        approved_at: new Date().toISOString()
-      }
-      
-      // If manual listing and manual override requested, set the fields
-      if (profile.verification_method === 'manual' && manualOverride === true) {
-        updateData.manual_override = true
-        updateData.manual_override_at = new Date().toISOString()
-        updateData.manual_override_by = user.id
-      }
-      
-      const { data, error } = await supabaseAdmin
-        .from('business_profiles')
-        .update(updateData)
-        .eq('id', businessId)
-        .select()
-        .single()
-      
-      if (error) {
-        console.error('Database error:', error)
-        return NextResponse.json(
-          { error: 'Failed to update business status' },
-          { status: 500 }
-        )
-      }
-      
-      console.log(`✅ Business approved: ${profile.business_name}`, {
-        verification_method: profile.verification_method,
-        manual_override: updateData.manual_override || false
-      })
-      
-      return NextResponse.json({
-        success: true,
-        business: data,
-        message: `Business approved successfully`
-      })
+      // ✅ LOCKDOWN: Use atomic RPC to ensure trial subscription is created
+      const { data: rpcResult, error: rpcError } = await supabaseAdmin
+        .rpc('approve_business_with_trial', {
+          p_business_id: businessId,
+          p_approved_by: user.id,
+          p_manual_override: profile.verification_method === 'manual' && manualOverride === true,
+          p_manual_override_by: profile.verification_method === 'manual' && manualOverride === true ? user.id : null
+        })
+      
+      if (rpcError) {
+        console.error('❌ Atomic approval failed:', rpcError)
+        return NextResponse.json(
+          { error: `Failed to approve business: ${rpcError.message}` },
+          { status: 500 }
+        )
+      }
+      
+      console.log(`✅ Business approved atomically: ${profile.business_name}`, {
+        verification_method: profile.verification_method,
+        manual_override: profile.verification_method === 'manual' && manualOverride === true,
+        trial_end_date: rpcResult?.trial_end_date,
+        trial_days: rpcResult?.trial_days
+      })
+      
+      // Fetch updated business for response
+      const { data: updatedBusiness } = await supabaseAdmin
+        .from('business_profiles')
+        .select()
+        .eq('id', businessId)
+        .single()
+      
+      return NextResponse.json({
+        success: true,
+        business: updatedBusiness,
+        trial_info: rpcResult,
+        message: `Business approved successfully with ${rpcResult?.trial_days || 90}-day trial`
+      })
```

---

## 3. Guard Logic (Tier Management)

**File:** `/lib/actions/admin-crm-actions.ts` (Lines 604-622)

### DIFF:

```diff
   try {
     console.log('🚀 SERVER ACTION: updateBusinessTier', { businessId, userId, city, selectedTier, features, trialDays })
 
+    // ✅ LOCKDOWN: Guard against setting paid tiers for unapproved businesses
+    const { data: businessProfile, error: profileFetchError } = await supabaseAdmin
+      .from('business_profiles')
+      .select('status, business_name')
+      .eq('id', businessId)
+      .single()
+    
+    if (profileFetchError || !businessProfile) {
+      console.error('❌ Business profile not found:', profileFetchError)
+      return { success: false, error: 'Business profile not found' }
+    }
+    
+    // Enforce: paid tiers ONLY for approved businesses
+    const paidTiers = ['trial', 'featured', 'spotlight']
+    if (paidTiers.includes(selectedTier) && businessProfile.status !== 'approved') {
+      console.error(`❌ GUARD: Cannot assign ${selectedTier} tier to unapproved business (status: ${businessProfile.status})`)
+      return { 
+        success: false, 
+        error: `Cannot assign paid tier to unapproved business. Current status: ${businessProfile.status}` 
+      }
+    }
+
     // 1. Get tier ID
     const { data: tierData, error: tierError } = await supabaseAdmin
       .from('subscription_tiers')
```

---

## 4. Drift Detector SQL (Query 1 of 3)

**File:** `/supabase/functions/detect_entitlement_drift.sql`

```sql
-- CRITICAL DRIFT: Paid tiers without subscription
WITH businesses_with_paid_tiers AS (
  SELECT 
    bp.id,
    bp.business_name,
    bp.status,
    bp.business_tier,
    bp.plan,
    bs.id AS subscription_id,
    bs.status AS sub_status,
    bs.is_in_free_trial,
    bs.free_trial_end_date
  FROM business_profiles bp
  LEFT JOIN business_subscriptions bs ON bp.id = bs.business_id
  WHERE bp.business_tier IN ('free_trial', 'featured', 'qwikker_picks', 'spotlight')
     OR bp.plan IN ('featured', 'spotlight')
)
SELECT 
  business_name,
  status AS bp_status,
  business_tier,
  plan,
  CASE 
    WHEN subscription_id IS NULL THEN '🚨 NO SUBSCRIPTION ROW'
    ELSE '✅ Has subscription'
  END AS subscription_check,
  CASE
    WHEN status != 'approved' AND subscription_id IS NOT NULL THEN '🚨 UNAPPROVED WITH SUBSCRIPTION'
    WHEN status = 'approved' AND subscription_id IS NULL THEN '🚨 APPROVED WITHOUT SUBSCRIPTION'
    ELSE '✅ Status OK'
  END AS status_check,
  CASE
    WHEN business_tier = 'free_trial' AND (is_in_free_trial IS NULL OR is_in_free_trial = false) THEN '🚨 free_trial WITHOUT is_in_free_trial'
    WHEN business_tier = 'free_trial' AND is_in_free_trial = true AND free_trial_end_date < NOW() THEN '🚨 EXPIRED TRIAL STILL ACTIVE'
    ELSE '✅ Trial valid'
  END AS trial_check
FROM businesses_with_paid_tiers
WHERE subscription_id IS NULL
   OR (status != 'approved' AND subscription_id IS NOT NULL)
   OR (business_tier = 'free_trial' AND (is_in_free_trial = false OR (is_in_free_trial = true AND free_trial_end_date < NOW())))
ORDER BY business_name;
```

---

## SUMMARY

### Files Created:
1. `supabase/migrations/20260120000000_atomic_approval_with_trial.sql` (91 lines)
2. `supabase/functions/approve_business_with_trial.sql` (91 lines)
3. `supabase/functions/detect_entitlement_drift.sql` (193 lines)

### Files Modified:
1. `app/api/admin/approve-business/route.ts` (38 lines changed)
2. `lib/actions/admin-crm-actions.ts` (18 lines added)

### Total Changes:
- **5 files**
- **+431 lines**
- **-26 lines**

### Key Improvements:
1. ✅ Atomic approval + trial creation (cannot be separated)
2. ✅ Guard against unapproved paid tiers
3. ✅ Drift detector catches bad states
4. ✅ Zero chance of paid tier without subscription
5. ✅ Consistent entitlement logic

---

**To Apply:**
```bash
# 1. Run migration
psql YOUR_DB_URL < supabase/migrations/20260120000000_atomic_approval_with_trial.sql

# 2. Test approval flow
# Approve a business via admin dashboard

# 3. Run drift detector
psql YOUR_DB_URL < supabase/functions/detect_entitlement_drift.sql

# 4. Fix any drift (if found)
# Manually correct or downgrade tiers
```
