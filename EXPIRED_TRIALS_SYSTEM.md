# Expired Trials Cleanup System

## Overview
Automated system that handles expired free trials by:
1. ✅ Setting `status = 'expired'` when trial ends
2. 🗑️ **DELETING knowledge base entries** (prevents KB flooding)
3. ⬇️ Downgrading `business_tier` to `'starter'` (removes from AI results)
4. 📊 Logging all cleanups to audit table

---

## How It Works

### Daily Cron Job (2 AM UTC)
```sql
-- Runs: SELECT * FROM cleanup_expired_trials();
```

**What it does:**
1. Finds all businesses where:
   - `is_in_free_trial = true`
   - `free_trial_end_date < NOW()`
   - `status != 'expired'` (not already processed)

2. For each expired trial:
   - **Deletes ALL `knowledge_base` entries** (menus, PDFs, scraped data)
   - Sets `business_subscriptions.status = 'expired'`
   - Sets `business_profiles.business_tier = 'starter'`
   - Sets `business_profiles.plan = 'starter'`
   - Logs to `trial_cleanup_log` table

---

## What Happens When Trial Expires

### Before Expiry:
- Status: `approved` + `trial`
- Tier: `free_trial`
- Visible in: ✅ Live Listings, ✅ AI Chat, ✅ Discover

### After Auto-Cleanup (next day at 2 AM):
- Status: `approved` + `expired`
- Tier: `starter`
- Visible in: ⚠️ Expired Trials Tab ONLY
- Knowledge Base: 🗑️ **DELETED** (all menus/PDFs removed)
- AI Results: ❌ **EXCLUDED** (tier too low)

---

## Admin Actions

### 1. View Expired Trials
Navigate to **Expired Trials** tab in admin dashboard.
Shows count (e.g., "3" in your screenshot).

### 2. Extend Trial
Click **"Extend Trial"** button:
- Choose days (7, 14, 30, 60, 90, custom)
- Automatically:
  - ✅ Updates `free_trial_end_date`
  - ✅ Sets `status = 'trial'` (restores)
  - ✅ Sets `business_tier = 'free_trial'` (back in AI!)
  - ⚠️ **Knowledge base stays deleted** - they must re-add!

### 3. Manual Cleanup (Test)
```sql
-- Test the cleanup function
SELECT * FROM cleanup_expired_trials();
```

---

## Database Schema Changes

### New Function: `cleanup_expired_trials()`
- **Purpose:** Find and clean expired trials
- **Returns:** Table of cleaned businesses
- **Security:** `SECURITY DEFINER` (runs as admin)

### Updated Function: `extend_business_trial()`
- **Added:** Auto-restores `status` and `business_tier` when extended
- **Warning:** Notifies admin that KB entries were deleted

### New Table: `trial_cleanup_log`
```sql
CREATE TABLE trial_cleanup_log (
  id UUID PRIMARY KEY,
  business_id UUID,
  business_name TEXT,
  kb_entries_deleted INTEGER,
  cleaned_at TIMESTAMP,
  restored_at TIMESTAMP,
  notes TEXT
);
```

### New Cron Job: `cleanup-expired-trials`
- **Schedule:** Daily at 2 AM UTC (`0 2 * * *`)
- **Job:** Calls `cleanup_expired_trials()`

---

## File Structure

```
/supabase/
  /functions/
    cleanup_expired_trials.sql   ← Main cleanup + restore functions
    extend_trial.sql             ← Updated to restore status
  /migrations/
    20260119000001_setup_expired_trial_cleanup_cron.sql ← Cron setup + audit log

/fix_alexandras_tier.sql         ← Quick fix for Spotlight mismatch

EXPIRED_TRIALS_SYSTEM.md         ← This file
```

---

## Deployment Steps

### 1. Run the migrations:
```bash
cd /Users/qwikker/qwikkerdashboard
npx supabase db push
```

Or manually in Supabase SQL Editor:
1. Run `supabase/functions/cleanup_expired_trials.sql`
2. Run `supabase/functions/extend_trial.sql` (updated version)
3. Run `supabase/migrations/20260119000001_setup_expired_trial_cleanup_cron.sql`

### 2. Fix Alexandra's Café:
```bash
psql $DATABASE_URL -f fix_alexandras_tier.sql
```

Or run in Supabase SQL Editor:
```sql
UPDATE business_profiles 
SET business_tier = 'qwikker_picks'
WHERE business_name = 'Alexandra''s Café' AND city = 'bournemouth';
```

### 3. Verify cron is scheduled:
```sql
SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-trials';
```

Should show:
```
jobname: cleanup-expired-trials
schedule: 0 2 * * *
active: true
```

---

## Testing

### Test Cleanup Function:
```sql
-- Find expired trials
SELECT 
  bp.business_name,
  bs.free_trial_end_date,
  bs.status
FROM business_profiles bp
JOIN business_subscriptions bs ON bp.id = bs.business_id
WHERE bs.is_in_free_trial = true
  AND bs.free_trial_end_date < NOW();

-- Run cleanup (CAUTION: Actually deletes KB entries!)
SELECT * FROM cleanup_expired_trials();

-- Check audit log
SELECT * FROM trial_cleanup_log ORDER BY cleaned_at DESC;
```

### Test Extend Trial:
```sql
-- Extend Mike's Pool Bar by 30 days
SELECT * FROM extend_business_trial(
  'business-id-here'::UUID, 
  30
);

-- Verify restoration
SELECT business_name, business_tier, plan 
FROM business_profiles 
WHERE business_name = 'Mike''s Pool Bar';
```

---

## Current Expired Trials (Your Data)

From your screenshot, you have **3 expired trials**:
1. **Julie's Sports pub** - Expired Dec 22, 2025
2. **Mike's Pool Bar** - Expired Jan 13, 2026
3. **Venezy Burgers** - Expired Dec 25, 2025

These are currently showing as:
- Tier: `featured` (WRONG - should be `starter`)
- Status: `Live` (WRONG - should be in Expired Trials tab)

**Once you run the migration**, the cron will:
- Move them to **Expired Trials tab** ✅
- Downgrade their tier to `starter` ✅
- Delete their KB entries ✅

---

## Important Notes

⚠️ **Knowledge Base Deletion is PERMANENT!**
- When trial expires → all KB entries deleted
- Admin extends trial → KB still deleted
- Business owner must manually re-add menus/PDFs

✅ **Why This Approach:**
- Prevents KB from filling with stale data from expired businesses
- Forces businesses to update info when they return
- Cleaner AI results (no outdated menus)

🔄 **Status Flow:**
```
Active Trial → [expires] → Auto-Cleanup → Expired (KB deleted)
                                ↓
                         Admin Extends Trial
                                ↓
                     Active Again (must re-add KB)
```

---

## Monitoring

### Check Cron Run History:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-expired-trials')
ORDER BY start_time DESC 
LIMIT 10;
```

### Check Cleanup Audit Log:
```sql
SELECT 
  business_name,
  kb_entries_deleted,
  cleaned_at,
  notes
FROM trial_cleanup_log
ORDER BY cleaned_at DESC
LIMIT 20;
```

### Current Expired Count:
```sql
SELECT COUNT(*) as expired_count
FROM business_subscriptions
WHERE is_in_free_trial = true
  AND free_trial_end_date < NOW()
  AND status = 'expired';
```

---

## Troubleshooting

### Cron not running?
```sql
-- Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check cron job exists
SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-trials';

-- Check for errors
SELECT * FROM cron.job_run_details 
WHERE status = 'failed' 
ORDER BY start_time DESC;
```

### Expired trials not showing in tab?
Refresh the admin dashboard - the fix to `admin-crm-actions.ts` (subscription as array) now makes them visible!

### Business tier not updating?
Check if the `cleanup_expired_trials()` function has proper permissions:
```sql
-- Should show SECURITY DEFINER
\df+ cleanup_expired_trials
```

---

## Future Enhancements

- [ ] Email notification to business owner 7 days before expiry
- [ ] Grace period (3 days after expiry before KB deletion)
- [ ] Auto-backup KB entries before deletion
- [ ] Restore KB from backup if trial extended within 30 days

---

**Questions?** Check the admin dashboard **Expired Trials** tab or run the test queries above!
