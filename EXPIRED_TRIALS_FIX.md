# Expired Trials Admin Dashboard - Fix Required

**Date:** January 8, 2026  
**Issue:** Admin dashboard shows 0 expired trials when there are actually 3

---

## 🐛 **The Problems:**

### **Problem 1: Wrong Status Check**
```typescript
// Line 185 in admin-dashboard.tsx
const allExpiredTrialBusinesses = businessList.filter(b => 
  b.status === 'trial_expired' || b.status === 'inactive'  // ❌ WRONG!
)
```

**Why it's wrong:**
- Businesses have status `'approved'` (not `'trial_expired'`)
- Trial expiration is stored in `business_subscriptions.free_trial_end_date`
- Need to JOIN with subscriptions and check date, not status

---

### **Problem 2: Still Using 120 Days Hardcoded**
Found in multiple places:
- Line 2627: `(120 * 24 * 60 * 60 * 1000)`
- Line 2633: `(120 * 24 * 60 * 60 * 1000)`  
- Line 1408: `(120 * 24 * 60 * 60 * 1000)`
- Line 1413: `(120 * 24 * 60 * 60 * 1000)`

---

## ✅ **The Solution:**

### **Fix 1: Update Admin Page Query**

**File:** `app/admin/page.tsx`

**Current:**
```typescript
const { data: businesses } = await supabase
  .from('business_profiles')
  .select('*')
  .eq('city', city)
```

**Should be:**
```typescript
const { data: businesses } = await supabase
  .from('business_profiles')
  .select(`
    *,
    subscription:business_subscriptions!business_id(
      id,
      free_trial_start_date,
      free_trial_end_date,
      is_in_free_trial,
      status
    )
  `)
  .eq('city', city)
```

---

### **Fix 2: Update Expired Trials Filter**

**File:** `components/admin/admin-dashboard.tsx` (Line 185)

**Replace:**
```typescript
const allExpiredTrialBusinesses = businessList.filter(b => 
  b.status === 'trial_expired' || b.status === 'inactive'
)
```

**With:**
```typescript
const allExpiredTrialBusinesses = businessList.filter(b => {
  // Check if business has subscription data
  if (!b.subscription || !b.subscription.free_trial_end_date) return false
  
  // Check if trial is expired
  const endDate = new Date(b.subscription.free_trial_end_date)
  const now = new Date()
  
  return b.subscription.is_in_free_trial && endDate < now
})
```

---

### **Fix 3: Remove All 120-Day Hardcoded Values**

**Find and replace:**
```typescript
// OLD:
const trialEndDate = new Date(approvalDate.getTime() + (120 * 24 * 60 * 60 * 1000))

// NEW:
const trialEndDate = new Date(business.subscription?.free_trial_end_date || approvalDate)
```

**Or better, calculate from subscription data:**
```typescript
trial_days_remaining: business.subscription?.free_trial_end_date ? 
  (() => {
    const endDate = new Date(business.subscription.free_trial_end_date)
    const now = new Date()
    return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  })() : null
```

---

## 🎯 **Fix 4: Add "Extend Trial" Feature**

### **Database Function:**
Created: `supabase/functions/extend_trial.sql`

**Usage:**
```sql
-- Extend by 30 days
SELECT * FROM extend_business_trial('business-uuid', 30);

-- Extend by 90 days
SELECT * FROM extend_business_trial('business-uuid', 90);
```

### **API Route:**
**Create:** `app/api/admin/extend-trial/route.ts`

```typescript
import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { businessId, days } = await request.json()
    
    if (!businessId || !days) {
      return NextResponse.json(
        { error: 'Missing businessId or days' },
        { status: 400 }
      )
    }
    
    const supabase = createServiceRoleClient()
    
    // Call the extend function
    const { data, error } = await supabase.rpc('extend_business_trial', {
      p_business_id: businessId,
      p_additional_days: days
    })
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: data[0]
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### **UI Component:**
Add button in CRM card:

```typescript
<Button
  onClick={() => handleExtendTrial(business.id, 30)}
  className="bg-yellow-600 hover:bg-yellow-700"
>
  Extend Trial +30 Days
</Button>
```

---

## 📋 **Implementation Checklist:**

- [ ] Run `extend_trial.sql` in Supabase SQL Editor
- [ ] Update `app/admin/page.tsx` to fetch subscription data
- [ ] Update `components/admin/admin-dashboard.tsx` line 185
- [ ] Remove all hardcoded 120-day values
- [ ] Create `app/api/admin/extend-trial/route.ts`
- [ ] Add "Extend Trial" button to CRM cards
- [ ] Test: Verify expired count shows 3
- [ ] Test: Extend a trial and verify it works

---

## 🧪 **Testing:**

After fixes, admin dashboard should show:
- ✅ **Expired Trials: 3** (Julie's, Orchid & Ivy, Venezy)
- ✅ CRM cards show accurate trial end dates
- ✅ "Extend Trial" button works

---

**Priority:** HIGH - Admin can't see expired trials currently!

