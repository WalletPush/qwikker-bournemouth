# 🐛 REMAINING BUGS TO FIX - Priority List

**Date:** January 8, 2026  
**Status:** 1/5 Fixed

---

## ✅ **FIXED:**
1. ✅ Expired businesses hidden from Discover page

---

## ❌ **STILL BROKEN:**

### **Bug #2: Business Dashboard Shows "Live" When Expired** 🔥 CRITICAL
**File:** `components/dashboard/improved-dashboard-home.tsx`

**Problem:**
- Orchid & Ivy dashboard shows "Live on Qwikker!" 
- But trial expired 13 days ago!

**Fix Location:** Line ~135 (Business Status card)

**Current:**
```typescript
<div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20...">
  Live on Qwikker!
</div>
```

**Should check:**
```typescript
const isTrialExpired = profile.subscription?.[0]?.is_in_free_trial && 
  new Date(profile.subscription[0].free_trial_end_date) < new Date()

{isTrialExpired ? (
  <div className="bg-gradient-to-br from-red-500/20...">
    🔴 Trial Expired
    Your trial ended {daysExpired} days ago
  </div>
) : (
  <div className="bg-gradient-to-br from-green-500/20...">
    ✅ Live on Qwikker!
  </div>
)}
```

---

### **Bug #3: Admin Cards Say "Live" When Expired** 🔥 HIGH
**File:** `components/admin/admin-dashboard.tsx`

**Problem:**
- Expired business cards in admin show "Status: Live"
- Should show "Status: Trial Expired"

**Fix:** Update CRM card status logic to check trial expiration

---

### **Bug #4: No UI to Extend Trials** 🔥 HIGH
**Files Needed:**
- Create button component in CRM card
- Wire up to API endpoint

**Add button like:**
```typescript
<Button
  onClick={() => handleExtendTrial(business.id, 30)}
  className="bg-yellow-600"
>
  Extend Trial +30 Days
</Button>
```

**Need client-side handler:**
```typescript
const handleExtendTrial = async (businessId: string, days: number) => {
  const res = await fetch('/api/admin/extend-trial', {
    method: 'POST',
    body: JSON.stringify({ businessId, days })
  })
  // Refresh page
  router.refresh()
}
```

---

### **Bug #5: Extend Trial Not Multi-Tenant** 🟡 MEDIUM
**File:** `supabase/functions/extend_trial.sql`

**Problem:**
- Function doesn't check if admin has access to that city
- Any admin could extend any business's trial

**Fix:** Add city check:
```sql
-- Verify admin has access to this city
IF NOT EXISTS (
  SELECT 1 FROM business_profiles bp
  JOIN city_admins ca ON ca.city = bp.city
  WHERE bp.id = p_business_id
  AND ca.id = auth.uid()
) THEN
  RETURN QUERY SELECT false, 'Access denied'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
  RETURN;
END IF;
```

---

## 🎯 **FIX PRIORITY:**

### **DO NOW (Critical - User-facing):**
1. ✅ Hide expired from Discover ✅ DONE
2. 🔥 Fix business dashboard "Live" status (Orchid & Ivy)
3. 🔥 Fix admin card "Live" status

### **DO NEXT (Admin tools):**
4. Add extend trial UI button
5. Make extend trial multi-tenant

---

## 📝 **IMPLEMENTATION PLAN:**

### **Step 1: Fix Business Dashboard Status**

**File:** `components/dashboard/improved-dashboard-home.tsx`

Find the "Live on Qwikker!" section and add trial expiration check.

**Search for:** `Live on Qwikker`
**Add check before rendering**

---

### **Step 2: Fix Admin Card Status**

**File:** `components/admin/comprehensive-business-crm-card.tsx` or similar

Find where it shows "Status: Live" and add expiration logic.

---

### **Step 3: Add Extend Trial Button**

**Create:** `components/admin/extend-trial-button.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function ExtendTrialButton({ businessId, businessName }: { businessId: string, businessName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const handleExtend = async (days: number) => {
    if (!confirm(`Extend trial for ${businessName} by ${days} days?`)) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/admin/extend-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, days })
      })
      
      const data = await res.json()
      
      if (data.success) {
        alert(data.message)
        router.refresh()
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      alert('Failed to extend trial')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="flex gap-2">
      <Button
        onClick={() => handleExtend(30)}
        disabled={loading}
        className="bg-yellow-600 hover:bg-yellow-700"
        size="sm"
      >
        +30 Days
      </Button>
      <Button
        onClick={() => handleExtend(90)}
        disabled={loading}
        className="bg-yellow-600 hover:bg-yellow-700"
        size="sm"
      >
        +90 Days
      </Button>
    </div>
  )
}
```

---

### **Step 4: Make Extend Trial Franchise-Aware**

Update the SQL function with city/admin check.

---

## 🧪 **TESTING CHECKLIST:**

After all fixes:

### **User-Facing:**
- [ ] Discover page: Expired businesses NOT visible
- [ ] Orchid & Ivy dashboard: Shows "Trial Expired" NOT "Live"
- [ ] Only active trials show on Discover

### **Admin-Facing:**
- [ ] Admin cards show correct status (Expired vs Live)
- [ ] Extend trial button visible on expired businesses
- [ ] Clicking "+30 Days" extends the trial
- [ ] Page refreshes and shows new end date
- [ ] Can't extend businesses from other cities

---

## 📊 **CURRENT STATUS:**

**Working:**
- ✅ Dashboard shows 90 days for active trials
- ✅ Database has correct trial dates
- ✅ Admin can see expired count (3)
- ✅ Discover hides expired businesses

**Broken:**
- ❌ Business dashboard shows "Live" when expired
- ❌ Admin cards show "Live" when expired  
- ❌ No way to extend trials
- ❌ Extend function not franchise-aware

---

**Next: Fix #2 (Business Dashboard Status)**

