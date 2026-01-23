# TEST OFFERS TABS NOW ⚡

## What's Fixed

The business dashboard now PROPERLY shows Active + Expired tabs just like Events, with proper empty states.

---

## Quick Test (2 minutes)

### 1. Start Dev Server
```bash
pnpm dev
```

### 2. Login as Ember & Oak Bistro

### 3. Go to Offers Page
```
http://localhost:3000/dashboard/offers
```

---

## What You Should See

### If Business Has Offers:

#### TWO TABS at the top:
```
[Active Offers (X)] [Expired Offers (Y)]
```

#### Active Tab (selected by default):
**IF has active offers:**
- Shows list of active offers
- Each with Edit/Delete buttons
- Shows "X of Y offers used"

**IF NO active offers (but has expired):**
- Shows empty state card:
  ```
  [Icon]
  No Active Offers
  Create your first offer to attract customers
  [Create Your First Offer] button
  ```

#### Expired Tab:
**IF has expired offers:**
- Shows list of expired offers
- Orange border/styling
- "Extend / Re-list" button for each
- Message: "These don't count toward your limit"

**IF NO expired offers:**
- Shows "No expired offers" message

#### Below Tabs:
**IF has active offers AND under limit:**
- Shows "Create Another Offer" button

---

### If Business Has NO Offers:

**NO tabs visible**

**Shows card:**
```
[Icon]
No Offers Created Yet
Create your first offer to attract customers and drive engagement
[Create Your First Offer] button
```

---

## Edge Cases to Verify

### Test 1: Only Active Offers
```
Expected:
✅ Tabs visible
✅ Active tab shows offers
✅ Expired tab shows empty state
✅ Count: "X of Y offers used"
```

### Test 2: Only Expired Offers
```
Expected:
✅ Tabs visible
✅ Active tab shows "No Active Offers" empty state
✅ Expired tab shows expired offers
✅ Count: "0 of Y offers used"
```

### Test 3: Both Active + Expired
```
Expected:
✅ Tabs visible
✅ Active tab shows active offers
✅ Expired tab shows expired offers
✅ Count reflects ONLY active offers
```

### Test 4: No Offers At All
```
Expected:
❌ NO tabs
✅ "No Offers Created Yet" card
✅ Single "Create Your First Offer" button
```

---

## Compare to Events Page

### Events Structure:
```
[Upcoming Events (0)] [Past & Cancelled Events (2)]

Upcoming Events:
└─ No upcoming events. Create your first event to get started!

Past & Cancelled Events:
├─ jazz night
└─ Live Fire Cooking at Ember & Oak
```

### Offers Structure (Should Match):
```
[Active Offers (0)] [Expired Offers (2)]

Active Offers:
└─ No Active Offers
   Create your first offer to attract customers
   [Create Your First Offer]

Expired Offers:
├─ 30% Off Mixed Grill [Extend / Re-list]
└─ 15% Off Cocktails [Extend / Re-list]
```

---

## What to Look For

### ✅ CORRECT Behavior:
- Tabs always show when there are ANY offers (active or expired)
- Active tab shows empty state if no active offers
- Expired tab shows offers with "Extend / Re-list"
- "No Offers Created Yet" ONLY shows if NO tabs at all
- Count reflects ONLY active offers
- Expired offers have orange styling

### ❌ BROKEN Behavior (if you see this, it's still wrong):
- Tabs showing but "No Offers Created Yet" also showing below
- Active tab completely blank (no empty state)
- Expired offers counting toward limit
- "Create Another Offer" showing when at limit

---

## Admin CRM Verification

### Also Test Admin Side:
```
1. Open Admin Dashboard
2. Find Ember & Oak card
3. Check "Offers" tab
Expected: ONLY active offers (not expired)
```

---

## Status Indicators

### Active Offer Card:
```
┌─────────────────────────────────────┐
│ 2-for-1 Bottomless Brunch          │
│ [Offer #1] [approved] [🔥 Featured]│
│ Type: two_for_one | Value: 2 for 1 │
│ End Date: 31/12/2026 (future)      │
│ [Edit] [Delete]                     │
└─────────────────────────────────────┘
```

### Expired Offer Card:
```
┌─────────────────────────────────────┐
│ 🔶 30% Off Mixed Grill              │
│ Expired 21/10/2025                  │
│ Type: percentage | Value: 30% off   │
│ [Extend / Re-list]                  │
└─────────────────────────────────────┘
     ↑ Orange border
```

---

## If Still Broken

### Check Console for Errors:
```javascript
console.log('Active offers:', activeOffers)
console.log('Expired offers:', expiredOffers)
console.log('Has legacy:', hasLegacyOffer)
```

### Check Date Logic:
```javascript
const today = new Date()
today.setHours(0, 0, 0, 0)
console.log('Today:', today)
console.log('Offer end date:', offer.offer_end_date)
console.log('Is active:', new Date(offer.offer_end_date) >= today)
```

---

🎯 **Start with the visual test - if you see proper tabs with empty states like Events, it's working!**
