# ✅ EXPIRED TRIALS FIX - TESTING GUIDE

**Date:** January 8, 2026  
**Status:** Code changes complete, ready to test

---

## 🎯 **What We Just Fixed:**

### **1. Admin Page Query** ✅
**File:** `app/admin/page.tsx`
- Added subscription data to query
- Now fetches `free_trial_start_date`, `free_trial_end_date`, `is_in_free_trial`, `status`

### **2. Expired Trials Filter** ✅
**File:** `components/admin/admin-dashboard.tsx`
- Changed from checking `status === 'trial_expired'`
- Now checks `subscription.free_trial_end_date < NOW()`
- Properly detects the 3 expired businesses

### **3. Removed 120-Day Hardcoded Values** ✅
**File:** `components/admin/admin-dashboard.tsx`
- Replaced `(120 * 24 * 60 * 60 * 1000)` calculations
- Now uses `subscription.free_trial_end_date` from database

### **4. Extend Trial Function** ✅
**File:** `supabase/functions/extend_trial.sql`
- Created database function to extend trials
- Usage: `SELECT * FROM extend_business_trial('uuid', 30)`

### **5. Extend Trial API** ✅
**File:** `app/api/admin/extend-trial/route.ts`
- POST endpoint for extending trials
- Frontend can call this to extend any business

---

## 🧪 **TESTING STEPS:**

### **Step 1: Run the SQL Function**
1. Open Supabase SQL Editor
2. Copy contents of: `supabase/functions/extend_trial.sql`
3. Run it
4. Should see: "Function created successfully"

---

### **Step 2: Restart Dev Server**
```bash
# Kill server (Ctrl+C)
pnpm dev
```

---

### **Step 3: Refresh Admin Dashboard**
1. Go to admin dashboard
2. Hard refresh: `Cmd + Shift + R`
3. Look at sidebar

---

## ✅ **EXPECTED RESULTS:**

### **Before:**
```
Expired Trials: 0  ❌
```

### **After:**
```
Expired Trials: 3  ✅
```

**Click "Expired Trials" and you should see:**
- Julie's Sports pub
- Orchid & Ivy  
- Venezy Burgers

---

## 🔧 **Testing Extend Trial:**

### **Manual SQL Test:**
```sql
-- Extend Julie's Sports pub by 30 days
SELECT * FROM extend_business_trial(
  (SELECT id FROM business_profiles WHERE business_name = 'Julie''s Sports pub'),
  30
);

-- Check the result
SELECT 
  business_name,
  free_trial_end_date,
  EXTRACT(DAY FROM (free_trial_end_date - NOW())) AS days_remaining
FROM business_profiles bp
JOIN business_subscriptions bs ON bs.business_id = bp.id
WHERE business_name = 'Julie''s Sports pub';
```

**Should show:**
- Before: `free_trial_end_date = 2025-12-22` (expired)
- After: `free_trial_end_date = 2026-01-21` (30 days from today)
- `days_remaining = 13` (approximately)

---

## 🐛 **If Something Goes Wrong:**

### **Issue: Still shows 0 expired**
- Check browser console for errors
- Verify subscription data is in the query
- Run this SQL to verify data:
  ```sql
  SELECT 
    business_name,
    subscription
  FROM business_profiles
  WHERE city = 'bournemouth'
  LIMIT 1;
  ```

### **Issue: Error in console**
- Check if `subscription` is an array: `business.subscription?.[0]`
- Might need to adjust how we access subscription data

---

## 🚀 **READY TO TEST!**

1. ✅ Run `extend_trial.sql`
2. ✅ Restart dev server
3. ✅ Refresh admin dashboard
4. ✅ Check if "Expired Trials: 3"

**Let me know what you see!** 🎯

