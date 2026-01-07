# Trial Length Fix: Complete Implementation Plan
**Date:** January 7, 2026  
**Goal:** Change hardcoded 120-day trials to franchise-aware dynamic trial length  
**Default:** 90 days (configurable per franchise)

---

## 📋 **Files That Need Updating:**

### **✅ Database (1 file)**
- [x] `supabase/migrations/20250107200000_franchise_aware_trial_length.sql` - CREATED
  - Helper function: `get_franchise_trial_days(city)`
  - Updated `handle_new_user()` trigger
  - Updated `setup_free_trial_on_approval()` trigger

---

### **📧 Email Templates (3 files)**

#### **1. `lib/email/welcome-email.ts`**
**Lines to change:**
- Line 250: "120-day free trial" → dynamic
- Line 272: "You have 120 days" → dynamic
- Line 387: "120-day free trial" → dynamic  
- Line 390: "You have 120 days" → dynamic

**Strategy:** Add `trialDays` parameter to function

---

#### **2. `lib/email/simple-welcome-email.ts`**
**Lines to change:**
- Line 59: "120-day free trial" → dynamic
- Line 70: "You have 120 days" → dynamic
- Line 144: "120-day free trial" → dynamic
- Line 147: "You have 120 days" → dynamic

**Strategy:** Add `trialDays` parameter to function

---

#### **3. `lib/email/confirmation-welcome-email.ts`**
**Lines to change:**
- Line 266: "120-day free trial" → dynamic
- Line 286: "You'll have 120 days" → dynamic
- Line 342: "120-day free trial" → dynamic
- Line 349: "You'll have 120 days" → dynamic

**Strategy:** Add `trialDays` parameter to function

---

### **🎨 Frontend Components (4 files)**

#### **4. `components/dashboard/settings-page.tsx`**
**Lines to change:**
- Line 24-25: Hardcoded `120` → read from subscription

**Strategy:** Get trial days from business subscription record

---

#### **5. `components/dashboard/dashboard-home.tsx`** (or `improved-dashboard-home.tsx`)
**Lines to change:**
- Line 66-67: Hardcoded `120` → read from subscription

**Strategy:** Calculate from `free_trial_end_date` - `free_trial_start_date`

---

#### **6. `components/dashboard/pricing-plans.tsx`**
**Lines to change:**
- Line 20: Hardcoded `120` → read from subscription

**Strategy:** Get trial days from props/context

---

#### **7. `app/dashboard/support/page.tsx`**
**Lines to change:**
- Line 112: "120-day free trial" → dynamic

**Strategy:** Get trial days from user's subscription

---

### **📝 Other Files (Update Later)**

**These can stay as-is for now (documentation/old code):**
- `supabase/migrations/20250915180000_create_profiles_table.sql` - Old migration (historical)
- `supabase/migrations/20250920180000_create_billing_system.sql` - Old migration (historical)
- `docs/` - Documentation (update after launch)
- `qwikker-clean-export/` - Old backup code (ignore)

---

## 🎯 **Implementation Strategy:**

### **Phase 1: Database (DONE)**
✅ Migration created
✅ Triggers updated
✅ Helper function created

### **Phase 2: Email Templates (NEXT)**
- Add `trialDays` parameter to all email functions
- Default to 90 if not provided
- Update all hardcoded "120" references

### **Phase 3: Frontend Components**
- Read trial length from subscription record
- Calculate days remaining dynamically
- Remove all hardcoded 120 references

### **Phase 4: Testing**
- Create new test business
- Verify trial length is correct (90 days for Bournemouth)
- Check emails say "90-day trial"
- Check dashboard shows correct countdown

---

## 🔧 **How It Works After Fix:**

### **Signup Flow:**
```
1. User signs up in Bournemouth
2. System checks franchise_crm_configs.founding_member_trial_days for 'bournemouth'
3. Gets 90 (default)
4. Creates subscription with: NOW() + INTERVAL '90 days'
5. Sends email: "Your 90-day free trial has started"
6. Dashboard shows: "90 days remaining"
```

### **Franchise Admin Control:**
```sql
-- Bournemouth wants 90 days
UPDATE franchise_crm_configs 
SET founding_member_trial_days = 90 
WHERE city = 'bournemouth';

-- Calgary wants 60 days
UPDATE franchise_crm_configs 
SET founding_member_trial_days = 60 
WHERE city = 'calgary';

-- New York wants 120 days
UPDATE franchise_crm_configs 
SET founding_member_trial_days = 120 
WHERE city = 'newyork';
```

### **Dynamic Email Example:**
```typescript
// BEFORE (hardcoded):
`You have 120 days to explore...`

// AFTER (dynamic):
`You have ${trialDays} days to explore...`
// Bournemouth users see: "You have 90 days to explore..."
// Calgary users see: "You have 60 days to explore..."
```

---

## ✅ **Verification Checklist:**

After all changes:

**Database:**
- [ ] Run migration successfully
- [ ] Verify `get_franchise_trial_days('bournemouth')` returns 90
- [ ] Check trigger uses franchise config

**Emails:**
- [ ] Welcome email says "90-day trial"
- [ ] Confirmation email says "90 days"
- [ ] Simple welcome says "90-day trial"

**Frontend:**
- [ ] Dashboard shows correct days remaining
- [ ] Settings page shows correct trial length
- [ ] Pricing page calculates correctly
- [ ] Support page says correct trial length

**End-to-End Test:**
- [ ] Create new business in Bournemouth
- [ ] Check database: `free_trial_end_date` = NOW() + 90 days
- [ ] Check email: says "90-day trial"
- [ ] Check dashboard: shows "90 days remaining"
- [ ] Change franchise config to 60 days
- [ ] Create another business
- [ ] Verify it gets 60-day trial

---

## 🚀 **Next Steps:**

1. ✅ Run the database migration
2. ⏳ Update email templates (in progress)
3. ⏳ Update frontend components (next)
4. ⏳ Test thoroughly
5. ⏳ Commit changes
6. ✅ Then proceed with Free Tier migration

---

**Estimated Time:** 1-2 hours total  
**Risk Level:** 🟢 Low (mostly number changes, well-tested)  
**Impact:** 🎯 High (all new businesses will get correct trial length)

