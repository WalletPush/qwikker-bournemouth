# FREE TIER ROLLBACK & SAFETY PLAN

**Date:** January 6, 2026  
**Branch:** `free-tier-build`  
**Main Branch Status:** Stable (working, some bugs but functional)

---

## 🛡️ Safety Measures In Place

### 1. **Git Branch Protection** ✅

You're currently on `free-tier-build` branch. Main is SAFE.

```bash
# Current status
Current branch: free-tier-build
Main branch: safe, untouched, last commit: 4d81b861
```

**What This Means:**
- All work happens on `free-tier-build`
- Main branch is NOT affected
- You can switch back to main anytime
- Can delete `free-tier-build` branch if things go wrong

---

### 2. **Database Rollback Strategy** 🔄

**CRITICAL:** Migrations are ADDITIVE only (no data deletion!)

All migrations use:
- `ADD COLUMN IF NOT EXISTS` (safe)
- `CREATE TABLE IF NOT EXISTS` (safe)
- NO `DROP COLUMN` (safe)
- NO `DROP TABLE` (safe)
- NO data deletion (safe)

**What We're Adding:**
```sql
-- New columns (all nullable or with defaults)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS owner_user_id UUID,
ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'claimed',
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'ai_enabled',
...

-- New table
CREATE TABLE IF NOT EXISTS claim_requests (...)

-- New franchise config columns
ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
...
```

**Why This Is Safe:**
- ✅ Existing data is NOT modified
- ✅ Existing columns are NOT changed
- ✅ Defaults preserve current behavior
- ✅ Can ignore new columns if needed

---

## 🔙 Rollback Options

### Option 1: Git Rollback (Code Only) - INSTANT ⚡

**If you haven't pushed to production:**

```bash
# 1. Go back to main branch
git checkout main

# 2. Delete the free-tier-build branch
git branch -D free-tier-build

# 3. Your code is back to stable state
# Database columns still exist but are ignored by old code
```

**Result:**
- Code reverts to stable version instantly
- New database columns remain but are unused (harmless)
- Old code doesn't know about new columns, works normally

---

### Option 2: Database Rollback (Remove New Columns) - CAREFUL ⚠️

**Only if you MUST remove new columns:**

```sql
-- Save this as rollback.sql

-- Remove new columns from business_profiles
ALTER TABLE business_profiles
DROP COLUMN IF EXISTS owner_user_id,
DROP COLUMN IF EXISTS claim_status,
DROP COLUMN IF EXISTS visibility,
DROP COLUMN IF EXISTS auto_imported,
DROP COLUMN IF EXISTS google_place_id,
DROP COLUMN IF EXISTS google_data,
DROP COLUMN IF EXISTS claimed_at,
DROP COLUMN IF EXISTS founding_member,
DROP COLUMN IF EXISTS founding_member_discount,
DROP COLUMN IF EXISTS trial_start_date,
DROP COLUMN IF EXISTS trial_end_date;

-- Remove new franchise config columns
ALTER TABLE franchise_crm_configs
DROP COLUMN IF EXISTS resend_api_key,
DROP COLUMN IF EXISTS google_places_api_key,
DROP COLUMN IF EXISTS founding_member_enabled,
DROP COLUMN IF EXISTS founding_member_trial_days,
DROP COLUMN IF EXISTS founding_member_discount_percent,
DROP COLUMN IF EXISTS founding_member_eligibility_days,
DROP COLUMN IF EXISTS auto_approve_claims;

-- Drop new table
DROP TABLE IF EXISTS claim_requests;

-- Delete system user (if created)
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';
```

**⚠️ WARNING:** Only run this if:
- No businesses have been imported via Google
- No claims have been submitted
- No franchise has configured API keys

---

### Option 3: Hybrid Rollback (Best Option) - RECOMMENDED ✅

**Keep database changes, revert code:**

1. Switch to main branch (code reverts)
2. Leave database columns (they're harmless)
3. New columns simply aren't used by old code
4. Can re-enable free tier later without re-migrating

**Why This Is Best:**
- Zero data loss
- Zero breaking changes
- Can try again later
- Migrations are idempotent (can re-run safely)

---

## 📸 Pre-Implementation Backup Plan

### Step 1: Create Database Snapshot (BEFORE ANY CHANGES)

**Option A: Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard
2. Settings → Database → Backups
3. Create manual backup: "pre-free-tier-backup-2026-01-06"
4. Download backup file (optional, for extra safety)

**Option B: Manual Export (Command Line)**

```bash
# Export current database schema + data
pg_dump $DATABASE_URL > pre-free-tier-backup-$(date +%Y%m%d).sql

# Or just schema (no data)
pg_dump --schema-only $DATABASE_URL > pre-free-tier-schema-$(date +%Y%m%d).sql
```

**Restore from backup:**
```bash
psql $DATABASE_URL < pre-free-tier-backup-20260106.sql
```

---

### Step 2: Tag Main Branch

```bash
# Create a git tag for current stable state
git tag -a stable-pre-free-tier -m "Stable state before free tier implementation"
git push origin stable-pre-free-tier

# Can always revert to this exact commit
git checkout stable-pre-free-tier
```

---

### Step 3: Test Migrations on Development First

**CRITICAL:** Test on dev database before production!

```bash
# 1. Get a copy of production schema
npx supabase db dump --db-url $PROD_URL > prod-schema.sql

# 2. Apply to local dev database
psql $DEV_URL < prod-schema.sql

# 3. Test migrations on dev
psql $DEV_URL < supabase/migrations/20260107000000_add_free_tier_system.sql

# 4. Verify nothing broke
# 5. Only then apply to production
```

---

## ✅ Final Safety Checklist (RUN THIS BEFORE STARTING)

### Pre-Implementation

- [ ] Currently on `free-tier-build` branch (not main)
- [ ] Main branch is stable and pushed to GitHub
- [ ] Created Supabase backup: "pre-free-tier-backup-2026-01-06"
- [ ] Created git tag: `stable-pre-free-tier`
- [ ] Downloaded backup file to local machine (optional but recommended)
- [ ] Verified backup can be restored (test on dev)
- [ ] All team members/stakeholders notified of changes
- [ ] Have rollback SQL ready (saved as `rollback.sql`)

### During Implementation

- [ ] Test each migration on dev database first
- [ ] Verify existing functionality still works after each step
- [ ] Run `npm run build` to check for TypeScript errors
- [ ] Check that existing test businesses still work
- [ ] Monitor Supabase logs for errors
- [ ] Keep a terminal window open to `main` branch (quick switch if needed)

### Post-Implementation

- [ ] All existing features still work (offers, events, menus)
- [ ] Dashboard loads for existing businesses
- [ ] AI chat still works (with proper filtering)
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Test user can still claim offers
- [ ] Admin can still approve businesses

---

## 🚨 Emergency Rollback Procedure

**If something breaks during implementation:**

### Immediate Actions (< 5 minutes)

```bash
# 1. STOP - Don't make more changes
# Take a breath, assess the damage

# 2. Switch to main branch (code rollback)
git checkout main

# 3. Restart dev server
npm run dev

# 4. Test if main branch still works
# (It should - database columns don't break old code)
```

### If Main Branch Still Broken

```bash
# 1. Restore from backup
psql $DATABASE_URL < pre-free-tier-backup-20260106.sql

# 2. Verify restoration worked
# Check a few businesses, test AI chat, etc.

# 3. Document what went wrong
# So we can fix it before trying again
```

---

## 🎯 What Can Actually Break?

### ❌ Unlikely to Break (Safe)

- Existing business profiles ✅
- Existing offers ✅
- Existing events ✅
- Existing subscriptions ✅
- User authentication ✅
- Dashboard access ✅

**Why:** We're only ADDING columns, not modifying existing data

### ⚠️ Could Break (Needs Testing)

- AI chat (if filter is too aggressive)
- Feature access checks (if new columns interfere)
- Subscription lookups (if we change tier logic)
- Dashboard components (if they rely on specific fields)

**Mitigation:** Test on dev first, implement filters gradually

### 🔴 Will Definitely Change (Expected)

- Free tier businesses won't appear in AI (INTENDED)
- Claim flow adds new workflow (INTENDED)
- Google import creates new businesses (INTENDED)

---

## 📋 Migration Order (Safest Path)

### Phase 1: Non-Breaking Additions (Week 1)
1. ✅ Create system user (harmless)
2. ✅ Add columns to `business_profiles` (with safe defaults)
3. ✅ Add columns to `franchise_crm_configs` (nullable)
4. ✅ Create `claim_requests` table (new, isolated)
5. ✅ Test: Verify old code still works

**Rollback Risk:** 🟢 LOW - Can ignore new columns

### Phase 2: Code Changes (Week 2)
6. ⚠️ Add AI visibility filter
7. ⚠️ Build claim flow
8. ⚠️ Build admin import tool

**Rollback Risk:** 🟡 MEDIUM - Switch to main branch reverts code

### Phase 3: Integration (Week 3)
9. ⚠️ Dashboard integration
10. ⚠️ Feature locks
11. ⚠️ UI updates

**Rollback Risk:** 🟡 MEDIUM - Branch switch reverts everything

### Phase 4: Testing (Week 4)
12. ✅ Full system test
13. ✅ Document any issues
14. ✅ Merge to main (only if everything works!)

**Rollback Risk:** 🟢 LOW - We've tested everything

---

## 🎓 Key Insights

### Why This Approach Is Safe:

1. **Additive Only:** We're not deleting anything
2. **Branch Isolation:** Work happens on separate branch
3. **Defaults Preserve Behavior:** New columns have sensible defaults
4. **Old Code Ignores New Columns:** Existing code doesn't break
5. **Idempotent Migrations:** Can re-run safely (IF NOT EXISTS)
6. **Backups Ready:** Can restore anytime
7. **Git Tags:** Can revert to exact stable point

### What Would Actually Break Things:

❌ **DON'T DO THESE:**
- `DROP COLUMN` on existing columns
- `ALTER COLUMN` to change existing types
- `DELETE FROM` existing data
- Removing NOT NULL from critical fields
- Changing primary keys
- Breaking foreign key relationships

✅ **SAFE TO DO:**
- `ADD COLUMN` with defaults
- `CREATE TABLE`
- `INSERT INTO` new data
- `UPDATE` with safe defaults
- New indexes
- New RLS policies

---

## 🚀 Ready to Proceed?

**Current Status:**
- ✅ Branch: `free-tier-build` (isolated from main)
- ✅ Main: Stable and safe
- ✅ Migrations: All additive (safe)
- ✅ Rollback: Multiple options available
- ✅ Backup: Instructions provided

**Final Confirmation Needed:**

1. [ ] I've created a Supabase backup
2. [ ] I've tagged the main branch
3. [ ] I understand I can switch back to main anytime
4. [ ] I understand new database columns won't break old code
5. [ ] I'm ready to start Phase 1

**Once you check these boxes, we'll start building!** 🎯

---

**Emergency Contact (If Things Go Wrong):**
- Rollback file: `/Users/qwikker/qwikkerdashboard/rollback.sql` (will be created)
- This document: `/Users/qwikker/qwikkerdashboard/ROLLBACK_PLAN.md`
- Safe branch: `main` (stable-pre-free-tier tag)
- Backup: Supabase Dashboard → Backups

**You're in safe hands! Everything is reversible!** 🛡️

