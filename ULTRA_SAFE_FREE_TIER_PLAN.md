# Ultra-Safe Free Tier Implementation Plan
**Date:** January 7, 2026  
**Risk Level:** 🟢 MINIMIZED (Free Tier Safety Measures)  
**Rollback:** Manual (via exported SQL/CSV files)

---

## 🚨 FREE TIER LIMITATION

**⚠️ Supabase Free Tier does NOT have:**
- Point-in-time recovery
- Automatic backups
- Database branching/staging

**✅ What we CAN do:**
- Manual SQL export via `pg_dump`
- CSV export of critical tables
- Reversible migrations (add columns, don't delete)
- Test queries before applying changes
- One-business-at-a-time testing

---

## 🛡️ SAFETY MEASURES (Before ANY Changes)

### **Step 1: Export Full Database (Required!)**

**Run this command:**
```bash
chmod +x backup-database.sh
./backup-database.sh
```

**What it does:**
- Exports your ENTIRE database to a `.sql` file
- Saves to `./database-backups/` folder
- Can restore later with: `psql [CONNECTION] < backup.sql`

**Time:** 2-3 minutes  
**File size:** ~5-10 MB (your current data)

---

### **Step 2: Export Critical Tables as CSV (Extra Safety)**

**In Supabase SQL Editor, run:**
```sql
-- See: backup-critical-tables.sql
```

**Copy the CSV output and save locally:**
- `business_profiles_backup_jan7.csv`
- `business_subscriptions_backup_jan7.csv`
- `auth_users_backup_jan7.csv`

**Why?** If SQL restore fails, you can manually rebuild from CSV.

---

### **Step 3: Document Current Counts**

**Run this query and WRITE DOWN the numbers:**
```sql
SELECT 
  (SELECT COUNT(*) FROM business_profiles) as business_count,
  (SELECT COUNT(*) FROM business_subscriptions) as subscription_count,
  (SELECT COUNT(*) FROM auth.users) as user_count,
  (SELECT COUNT(*) FROM business_profiles WHERE status = 'approved') as approved_count,
  (SELECT COUNT(*) FROM business_profiles WHERE status = 'incomplete') as incomplete_count;
```

**Example:**
```
business_count: 9
subscription_count: 8
user_count: 12
approved_count: 8
incomplete_count: 1
```

**After migration, these MUST match!**

---

## 📋 ULTRA-SAFE MIGRATION STRATEGY

### **Phase 1: Add Columns ONLY (100% Reversible)**

**Migration 1A: Add new columns (all nullable, no defaults)**
```sql
-- Add new columns (doesn't affect existing data AT ALL)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS lifecycle_status TEXT;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS visibility TEXT;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS auto_imported BOOLEAN DEFAULT false;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS founding_member BOOLEAN DEFAULT false;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS founding_member_discount INTEGER DEFAULT 0;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;
```

**✅ Why this is safe:**
- All columns are NULL (doesn't change existing data)
- No constraints yet (can't break anything)
- 100% reversible: `ALTER TABLE business_profiles DROP COLUMN owner_user_id;`

**🧪 Test after this:**
- [ ] Business dashboard loads
- [ ] Admin dashboard loads
- [ ] Can approve a business
- [ ] AI chat works

**If broken, rollback:**
```sql
ALTER TABLE business_profiles 
DROP COLUMN IF EXISTS owner_user_id,
DROP COLUMN IF EXISTS lifecycle_status,
DROP COLUMN IF EXISTS visibility,
DROP COLUMN IF EXISTS google_place_id,
DROP COLUMN IF EXISTS auto_imported,
DROP COLUMN IF EXISTS claimed_at,
DROP COLUMN IF EXISTS founding_member,
DROP COLUMN IF EXISTS founding_member_discount,
DROP COLUMN IF EXISTS trial_start_date,
DROP COLUMN IF EXISTS trial_end_date;
```

---

### **Phase 2: DRY RUN (See What WOULD Change)**

**Run this query (doesn't modify anything):**
```sql
-- PREVIEW: What would the backfill set?
SELECT 
  business_name,
  status as current_status,
  business_tier as current_tier,
  plan as current_plan,
  user_id as current_user_id,
  
  -- What WOULD be set:
  user_id as proposed_owner_user_id,
  CASE 
    WHEN user_id IS NULL THEN 'unclaimed'
    WHEN business_tier = 'free_trial' THEN 'claimed_trial'
    ELSE 'claimed_paid'
  END as proposed_lifecycle_status,
  
  CASE
    WHEN user_id IS NULL THEN 'discover_only'
    ELSE 'ai_enabled'
  END as proposed_visibility,
  
  created_at as proposed_claimed_at
  
FROM business_profiles
ORDER BY business_name;
```

**Review the output. Does anything look wrong?**
- Does "Mike's Pool Bar" show as `claimed_paid`? ✅ Good
- Does "David's Grill Shack" show as `claimed_trial`? ✅ Good
- Are all `user_id` correctly mapped to `owner_user_id`? ✅ Good

**If anything looks wrong, STOP. We debug the query first.**

---

### **Phase 3: Backfill ONE Business (Test on Real Data)**

**Pick your test business (e.g., "Scizzors" which is incomplete):**
```sql
-- Update JUST ONE business as a test
UPDATE business_profiles
SET 
  owner_user_id = user_id,
  lifecycle_status = CASE 
    WHEN business_tier = 'free_trial' THEN 'claimed_trial'
    ELSE 'claimed_paid'
  END,
  visibility = 'ai_enabled',
  claimed_at = created_at
WHERE business_name = 'Scizzors'
RETURNING *;
```

**🧪 Test THIS specific business:**
1. Can the owner log in?
2. Does the dashboard work?
3. Can they create an offer?
4. Does AI chat show them?

**If broken:**
```sql
-- Revert just this one business
UPDATE business_profiles
SET 
  owner_user_id = NULL,
  lifecycle_status = NULL,
  visibility = NULL,
  claimed_at = NULL
WHERE business_name = 'Scizzors';
```

---

### **Phase 4: Backfill All Existing Businesses**

**ONLY if Phase 3 worked perfectly:**
```sql
-- Backfill all existing businesses
UPDATE business_profiles
SET 
  owner_user_id = user_id,
  lifecycle_status = CASE 
    WHEN user_id IS NULL THEN 'unclaimed'
    WHEN business_tier = 'free_trial' THEN 'claimed_trial'
    ELSE 'claimed_paid'
  END,
  visibility = CASE
    WHEN user_id IS NULL THEN 'discover_only'
    ELSE 'ai_enabled'
  END,
  claimed_at = COALESCE(approved_at, created_at)
WHERE lifecycle_status IS NULL;
```

**✅ Verify counts match:**
```sql
SELECT COUNT(*) FROM business_profiles WHERE lifecycle_status IS NOT NULL;
-- Should equal your original business_count (9 businesses)
```

**🧪 Full test checklist:**
- [ ] All businesses can log in
- [ ] All dashboards work
- [ ] Admin can approve/reject
- [ ] AI chat returns all approved businesses
- [ ] New signup still works

---

### **Phase 5: Add Constraints (Final Step)**

**ONLY after everything works:**
```sql
-- Add check constraints
ALTER TABLE business_profiles
ADD CONSTRAINT lifecycle_status_check 
CHECK (lifecycle_status IN ('unclaimed', 'claimed_free', 'claimed_trial', 'claimed_paid'));

ALTER TABLE business_profiles
ADD CONSTRAINT visibility_check
CHECK (visibility IN ('discover_only', 'ai_enabled'));

-- Add unique index for Google Place ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_place_id 
ON business_profiles(google_place_id) 
WHERE google_place_id IS NOT NULL;
```

---

## 🔄 ROLLBACK PLAN (If Anything Breaks)

### **Option 1: Partial Rollback (Undo Columns)**
```sql
-- Drop all new columns
ALTER TABLE business_profiles 
DROP COLUMN IF EXISTS owner_user_id CASCADE,
DROP COLUMN IF EXISTS lifecycle_status CASCADE,
DROP COLUMN IF EXISTS visibility CASCADE,
DROP COLUMN IF EXISTS google_place_id CASCADE,
DROP COLUMN IF EXISTS auto_imported CASCADE,
DROP COLUMN IF EXISTS claimed_at CASCADE,
DROP COLUMN IF EXISTS founding_member CASCADE,
DROP COLUMN IF EXISTS founding_member_discount CASCADE,
DROP COLUMN IF EXISTS trial_start_date CASCADE,
DROP COLUMN IF EXISTS trial_end_date CASCADE;
```

### **Option 2: Full Database Restore (Nuclear Option)**
```bash
# Restore from your exported backup
psql [YOUR_CONNECTION_STRING] < ./database-backups/qwikker_backup_[TIMESTAMP].sql
```

**⚠️ This will lose ANY data created after the backup!**

---

## 📊 VERIFICATION CHECKLIST

**After each phase, verify:**

### **Data Integrity**
- [ ] Row counts match (business_profiles, subscriptions, users)
- [ ] No NULL values where there shouldn't be
- [ ] All approved businesses still show `status = 'approved'`
- [ ] All existing offers/menus still exist

### **Functionality**
- [ ] Business login works
- [ ] Business dashboard loads
- [ ] Can create an offer
- [ ] Admin dashboard loads
- [ ] Can approve a pending business
- [ ] AI chat returns results
- [ ] New signup creates all 3 records

### **Performance**
- [ ] Pages load in < 2 seconds
- [ ] No new errors in browser console
- [ ] No new errors in Supabase logs

---

## ⏱️ TIMELINE

| Phase | Task | Time | Risk |
|-------|------|------|------|
| **Setup** | Export database + CSV | 10 mins | 🟢 None |
| **Phase 1** | Add columns | 5 mins | 🟢 100% reversible |
| **Phase 2** | Dry run queries | 10 mins | 🟢 Read-only |
| **Phase 3** | Test 1 business | 15 mins | 🟡 Affects 1 row |
| **Phase 4** | Backfill all | 10 mins | 🟡 Affects 9 rows |
| **Phase 5** | Add constraints | 5 mins | 🟢 Just validation |

**Total:** ~1 hour (spread over 2-3 days for safety)

---

## 🎯 DECISION POINT

**You must decide:**

**Option A: Ultra-Safe (Recommended)**
- Do backups TODAY
- Phase 1 (add columns) TOMORROW
- Phase 2-3 (test) DAY 3
- Phase 4-5 (backfill) DAY 4
- **Timeline:** 4 days

**Option B: Cautious**
- Do backups + Phase 1-2 TODAY
- Phase 3-5 TOMORROW
- **Timeline:** 2 days

**Option C: I Trust You (Still Safe)**
- Do backups + all phases TODAY
- Test thoroughly between each phase
- **Timeline:** 2-3 hours

---

## 🚨 CRITICAL RULES

1. **NEVER skip the backup step**
2. **NEVER skip the dry run (Phase 2)**
3. **ALWAYS test on 1 business first (Phase 3)**
4. **ALWAYS verify counts after changes**
5. **IF IN DOUBT, STOP AND ASK**

---

**Which timeline feels right to you?** 🤔

