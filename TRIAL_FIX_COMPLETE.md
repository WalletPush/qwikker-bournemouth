# ✅ Trial Length Fix - COMPLETE

**Date:** January 7, 2026  
**Status:** ✅ All Changes Applied  
**Ready for:** Testing & Deployment

---

## 🎯 **What Was Fixed:**

Changed hardcoded **120-day trials** to **franchise-aware dynamic trial length** (default: 90 days).

Each franchise can now set their own trial length via `franchise_crm_configs.founding_member_trial_days`.

---

## 📝 **Files Changed:**

### ✅ Database (1 file)
**`supabase/migrations/20250107200000_franchise_aware_trial_length.sql`**
- Created `get_franchise_trial_days(city)` helper function
- Updated `handle_new_user()` trigger to use franchise config
- Updated `setup_free_trial_on_approval()` trigger to use franchise config
- Set Bournemouth default to 90 days

---

### ✅ Email Templates (3 files)

**1. `lib/email/welcome-email.ts`**
- Added `trialDays?` parameter to interface
- Updated HTML: "120-day free trial" → `${trialDays}-day free trial`
- Updated HTML: "You have 120 days" → `You have ${trialDays} days`
- Updated text version (2 changes)

**2. `lib/email/simple-welcome-email.ts`**
- Added `trialDays?` parameter to interface
- Updated HTML: "120-day free trial" → `${trialDays}-day free trial`
- Updated HTML: "You have 120 days" → `You have ${trialDays} days`
- Updated text version (2 changes)

**3. `lib/email/confirmation-welcome-email.ts`**
- Added `trialDays?` parameter to interface
- Updated HTML: "120-day free trial" → `${trialDays}-day free trial`
- Updated HTML: "You'll have 120 days" → `You'll have ${trialDays} days`
- Updated text version (2 changes)

---

### ✅ Frontend Components (2 files)

**4. `components/dashboard/founding-member-banner.tsx`**
- Changed trial end date calculation from hardcoded 120 days to use `trialDaysLeft` prop
- **Before:** `new Date(profile.created_at).getTime() + (120 * 24 * 60 * 60 * 1000)`
- **After:** `new Date().getTime() + (trialDaysLeft * 24 * 60 * 60 * 1000)`

**5. `app/dashboard/support/page.tsx`**
- Changed FAQ text from "Your 120-day free trial" to "Your free trial"
- Added "Check your dashboard to see how many days remain"

---

### ✅ Already Correct (No Changes Needed)

**These were already using 90 days:**
- `components/dashboard/improved-dashboard-home.tsx` - Uses subscription data first, fallback to 90 days
- `components/dashboard/dashboard-home.tsx` - Uses 90 days
- `components/dashboard/settings-page.tsx` - Uses 90 days
- `components/dashboard/pricing-plans.tsx` - No hardcoded trial days

---

## 🚀 **How It Works Now:**

### **For Bournemouth (Default: 90 days)**
```
1. User signs up
2. System checks: franchise_crm_configs.founding_member_trial_days for 'bournemouth'
3. Gets: 90 days
4. Creates subscription: free_trial_end_date = NOW() + 90 days
5. Sends email: "Your 90-day free trial has started"
6. Dashboard shows: "90 days remaining"
```

### **For Other Franchises (Customizable)**
```sql
-- Calgary wants 60 days
UPDATE franchise_crm_configs 
SET founding_member_trial_days = 60 
WHERE city = 'calgary';

-- New York wants 120 days
UPDATE franchise_crm_configs 
SET founding_member_trial_days = 120 
WHERE city = 'newyork';
```

---

## 🧪 **Next Steps: Testing**

### **Step 1: Run the Migration**

```bash
# In Supabase SQL Editor, run:
# supabase/migrations/20250107200000_franchise_aware_trial_length.sql
```

Expected output:
```
✅ Function created: get_franchise_trial_days
✅ Trigger updated: handle_new_user
✅ Trigger updated: setup_free_trial_on_approval
✅ Bournemouth config updated: 90 days
NOTICE: Bournemouth franchise trial length: 90 days
```

---

### **Step 2: Test Bournemouth Signup**

**Create a new test business:**
1. Go to founding member signup page
2. Complete onboarding
3. Check database:
   ```sql
   SELECT 
     business_name,
     free_trial_start_date,
     free_trial_end_date,
     (free_trial_end_date - free_trial_start_date) AS trial_length
   FROM business_subscriptions bs
   JOIN business_profiles bp ON bp.id = bs.business_id
   WHERE bp.business_name = 'YOUR_TEST_BUSINESS'
   ORDER BY bs.created_at DESC
   LIMIT 1;
   ```

**Expected:**
- `trial_length` = **90 days**

---

### **Step 3: Check Email**

**Open the welcome email and verify:**
- Says "**90-day** free trial" (NOT "120-day")
- Says "You have **90 days** to explore..."

---

### **Step 4: Check Dashboard**

**Login to the test business dashboard:**
- Trial status card shows "**90 days remaining**"
- Founding member banner shows correct end date
- Settings page shows "**90 days remaining**"

---

### **Step 5: Test Franchise Config Change**

```sql
-- Change Bournemouth to 60 days
UPDATE franchise_crm_configs 
SET founding_member_trial_days = 60 
WHERE city = 'bournemouth';

-- Verify
SELECT get_franchise_trial_days('bournemouth');
-- Should return: 60
```

**Then create another test business and verify it gets 60 days.**

---

## ✅ **Rollback Plan (If Needed)**

If anything breaks:

### **Option A: Database Backup Restore**
```
1. Go to Supabase Dashboard → Database → Backups
2. Select backup from before migration
3. Click "Restore"
```

### **Option B: Manual Rollback SQL**
```sql
-- Revert function to hardcoded 90 days
CREATE OR REPLACE FUNCTION get_franchise_trial_days(p_city TEXT)
RETURNS INTEGER
LANGUAGE sql
AS $$
  SELECT 90; -- Always return 90
$$;

-- Or just set all franchises to 90
UPDATE franchise_crm_configs
SET founding_member_trial_days = 90;
```

### **Option C: Code Rollback**
```bash
# Revert code changes
git log --oneline
git revert <commit_hash>
```

---

## 📊 **Verification Checklist**

**Before Deployment:**
- [ ] Run migration in Supabase SQL Editor
- [ ] Verify no SQL errors
- [ ] Check: `SELECT get_franchise_trial_days('bournemouth')` returns 90

**After Deployment:**
- [ ] Create test business
- [ ] Database shows 90-day trial
- [ ] Email says "90-day trial"
- [ ] Dashboard shows "90 days remaining"
- [ ] Founding member banner shows correct end date
- [ ] Support page doesn't say "120 days"

**Franchise Config:**
- [ ] Test changing trial days
- [ ] New business gets updated trial length
- [ ] Old businesses keep original trial length

---

## 🎉 **Benefits of This Fix:**

### **For You (Bournemouth)**
- ✅ New businesses get **90-day trials** (not 120)
- ✅ More realistic conversion timeline
- ✅ Easier to manage trial expirations
- ✅ Consistent messaging across all touchpoints

### **For Franchises**
- ✅ Each franchise can set their own trial length
- ✅ Calgary can do 60 days (aggressive)
- ✅ New York can do 120 days (generous)
- ✅ Flexibility for different markets

### **For Users**
- ✅ Clear, accurate trial information
- ✅ Consistent countdown across dashboard
- ✅ No confusion about trial length

---

## 🚨 **Important Notes:**

### **Existing Businesses**
- ⚠️ This fix does NOT change existing trial end dates
- Businesses with 120-day trials will keep them
- Only NEW signups will get the new trial length

### **If You Want to Fix Existing Businesses**
```sql
-- OPTIONAL: Update existing 120-day trials to 90 days
UPDATE business_subscriptions
SET free_trial_end_date = free_trial_start_date + INTERVAL '90 days'
WHERE 
  is_in_free_trial = true
  AND free_trial_end_date = free_trial_start_date + INTERVAL '120 days'
  AND free_trial_end_date > NOW(); -- Only future trials

-- Check first:
SELECT COUNT(*) FROM business_subscriptions
WHERE is_in_free_trial = true
  AND free_trial_end_date = free_trial_start_date + INTERVAL '120 days'
  AND free_trial_end_date > NOW();
```

---

## 🎯 **Ready to Deploy?**

**You now have:**
- ✅ Database migration file
- ✅ All email templates updated
- ✅ All frontend components updated
- ✅ Comprehensive testing plan
- ✅ Rollback strategy

**Next step:** Run the migration!

```sql
-- Copy the contents of:
-- supabase/migrations/20250107200000_franchise_aware_trial_length.sql
-- Paste into Supabase SQL Editor
-- Click "Run"
```

---

**Questions? Check `TRIAL_LENGTH_FIX_PLAN.md` for full implementation details.**

