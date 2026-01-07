# 🚀 Run Trial Migration - Step-by-Step Guide

**⚠️ READ THIS BEFORE RUNNING THE MIGRATION**

---

## ✅ Pre-Flight Checklist

Before running the migration, verify:

- [ ] **Supabase Pro active** (you have automatic backups)
- [ ] **Latest backup available** (check Supabase Dashboard → Database → Backups)
- [ ] **Current baseline recorded:**
  ```sql
  SELECT 
    (SELECT COUNT(*) FROM business_profiles) as business_count,
    (SELECT COUNT(*) FROM business_subscriptions) as subscription_count,
    (SELECT COUNT(*) FROM auth.users) as user_count;
  ```
  - **Your current numbers:** 9 businesses, 8 subscriptions, 14 users

---

## 🎯 **Step 1: Open Supabase SQL Editor**

1. Go to your Supabase dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "+ New query"

---

## 🎯 **Step 2: Copy Migration SQL**

Open the file:
```
supabase/migrations/20250107200000_franchise_aware_trial_length.sql
```

**Copy ALL the contents** (it's a long file, make sure you get everything!)

---

## 🎯 **Step 3: Paste & Run**

1. Paste the SQL into the Supabase SQL Editor
2. **DON'T** run it yet - scroll through and make sure it all pasted correctly
3. Look for these key sections:
   - ✅ `CREATE OR REPLACE FUNCTION get_franchise_trial_days`
   - ✅ `CREATE OR REPLACE FUNCTION public.handle_new_user()`
   - ✅ `CREATE OR REPLACE FUNCTION setup_free_trial_on_approval()`
   - ✅ `UPDATE franchise_crm_configs SET founding_member_trial_days = 90`

4. **Once verified, click "Run"**

---

## ✅ **Step 4: Check for Success**

**You should see:**

```
✅ CREATE FUNCTION (get_franchise_trial_days)
✅ CREATE FUNCTION (handle_new_user)  
✅ CREATE FUNCTION (setup_free_trial_on_approval)
✅ DROP TRIGGER (if exists)
✅ CREATE TRIGGER
✅ UPDATE 1 (franchise_crm_configs)
NOTICE: Bournemouth franchise trial length: 90 days
```

**If you see any ERRORS:**
1. **STOP**
2. Copy the error message
3. Tell me the exact error
4. We'll debug it together

---

## ✅ **Step 5: Verify the Fix**

**Run this test query:**

```sql
-- Test 1: Check helper function works
SELECT get_franchise_trial_days('bournemouth') AS bournemouth_trial_days;
-- Expected: 90

-- Test 2: Check Bournemouth config
SELECT 
  city,
  founding_member_trial_days,
  founding_member_enabled
FROM franchise_crm_configs
WHERE city = 'bournemouth';
-- Expected: 90, true

-- Test 3: Check existing subscriptions (shouldn't change)
SELECT 
  bp.business_name,
  bs.free_trial_start_date,
  bs.free_trial_end_date,
  EXTRACT(DAY FROM (bs.free_trial_end_date - bs.free_trial_start_date)) AS trial_days
FROM business_subscriptions bs
JOIN business_profiles bp ON bp.id = bs.business_id
WHERE bs.is_in_free_trial = true
ORDER BY bs.created_at DESC;
-- Check: Scizzors should still have 120 days (existing trial)
```

---

## 🧪 **Step 6: Test With New Signup**

**Now create a NEW test business to verify the fix works:**

### **Option A: Quick Database Test**

```sql
-- Simulate what happens when a new user signs up
-- This tests the trigger function directly

BEGIN;
  -- Create a test user in auth.users (this will trigger handle_new_user)
  -- NOTE: This is just a simulation - actual signups go through Supabase Auth
  
  -- Instead, let's just call the function manually to test it
  SELECT get_franchise_trial_days('bournemouth');
  -- Should return: 90
  
  SELECT get_franchise_trial_days('calgary');
  -- Should return: 90 (default, since calgary doesn't have a config yet)
  
ROLLBACK; -- Don't actually create anything
```

### **Option B: Full E2E Test (Recommended)**

1. **Go to your founding member signup page**
2. **Create a new test business:**
   - Business name: "Trial Test Business"
   - Email: Use a unique test email
   - Complete onboarding
3. **Check the database:**
   ```sql
   SELECT 
     bp.business_name,
     bs.free_trial_start_date,
     bs.free_trial_end_date,
     EXTRACT(DAY FROM (bs.free_trial_end_date - bs.free_trial_start_date)) AS trial_days
   FROM business_subscriptions bs
   JOIN business_profiles bp ON bp.id = bs.business_id
   WHERE bp.business_name = 'Trial Test Business';
   ```
   **Expected:** `trial_days = 90`

4. **Check the email:**
   - Should say "**90-day** free trial"
   - Should NOT say "120-day"

5. **Check the dashboard:**
   - Login to the test business
   - Should show "**90 days remaining**"

---

## 🎯 **Step 7: Test Franchise Config Change**

**Verify that changing the config works:**

```sql
-- Change Bournemouth to 60 days (for testing)
UPDATE franchise_crm_configs 
SET founding_member_trial_days = 60 
WHERE city = 'bournemouth';

-- Verify
SELECT get_franchise_trial_days('bournemouth');
-- Should return: 60
```

**Now create ANOTHER test business and verify it gets 60 days!**

**Then change it back:**
```sql
UPDATE franchise_crm_configs 
SET founding_member_trial_days = 90 
WHERE city = 'bournemouth';
```

---

## ✅ **Step 8: Final Verification**

**Run the baseline check again:**

```sql
SELECT 
  (SELECT COUNT(*) FROM business_profiles) as business_count,
  (SELECT COUNT(*) FROM business_subscriptions) as subscription_count,
  (SELECT COUNT(*) FROM auth.users) as user_count;
```

**Expected:**
- `business_count` = 9 (or 10/11 if you created test businesses)
- `subscription_count` = 8 (or 9/10 if you created test businesses)
- `user_count` = 14 (or 15/16 if you created test businesses)

**Key point:** Your existing data should be UNCHANGED (except for any new test businesses you created).

---

## 🎉 **Migration Complete!**

**If all tests passed, you're done!**

### **What Changed:**
- ✅ New signups get 90-day trials (franchise-configurable)
- ✅ Emails say "90-day trial"
- ✅ Dashboards show "90 days remaining"
- ✅ Support page doesn't mention "120 days"

### **What Stayed the Same:**
- ✅ Existing businesses keep their trial end dates
- ✅ Scizzors still has 120 days (if not expired)
- ✅ All other data unchanged

---

## 🚨 **If Something Went Wrong:**

### **Option 1: Supabase Backup Restore**
```
1. Supabase Dashboard → Database → Backups
2. Select latest backup (before migration)
3. Click "Restore"
4. Wait 5-10 minutes
5. Verify data is back
```

### **Option 2: Manual Fix**
```sql
-- If function is broken, set all to 90 days
CREATE OR REPLACE FUNCTION get_franchise_trial_days(p_city TEXT)
RETURNS INTEGER
AS $$
  SELECT 90;
$$ LANGUAGE sql;
```

### **Option 3: Git Revert**
```bash
cd /Users/qwikker/qwikkerdashboard
git log --oneline
git revert <commit_hash_of_trial_fix>
git push
```

---

## ❓ **Common Issues:**

### **"Function already exists"**
- ✅ This is FINE! `CREATE OR REPLACE` will update it.

### **"Trigger already exists"**
- ✅ This is FINE! The `DROP TRIGGER IF EXISTS` will remove the old one first.

### **"Column founding_member_trial_days doesn't exist"**
- ⚠️ This means the free tier migration hasn't run yet!
- Run `supabase/migrations/20250107000000_add_free_tier_franchise_config.sql` FIRST

### **"No rows updated" for franchise_crm_configs**
- ⚠️ This means Bournemouth doesn't have a config row yet
- Check: `SELECT * FROM franchise_crm_configs WHERE city = 'bournemouth'`
- If no row, we need to create one first

---

## 📞 **Need Help?**

**If you get stuck:**
1. **DON'T PANIC** - your backups are safe!
2. Copy the error message
3. Tell me what step failed
4. We'll debug together

---

## ✅ **Ready?**

**Copy the migration SQL → Paste into Supabase → Run → Report results!**

**I'll be here to help if anything goes wrong! 🚀**

