# CORRECTED: Offers System - Final Rules ✅

## I FUCKED UP - HERE'S THE CORRECTION

**What I got wrong:** Admin CRM showing ALL offers (including expired)  
**What you wanted:** Admin CRM showing ONLY CURRENT offers

---

## THE CORRECT SYSTEM (FINAL)

### 1. Business Dashboard Offers Tab ✅
**Shows BOTH Active + Expired in TABS (like events)**

```
┌─────────────────────────────────────┐
│ [Active Offers] [Expired Offers]   │
└─────────────────────────────────────┘
```

**Active Tab:**
- Current offers (not expired)
- Count toward tier limit
- Can edit/delete

**Expired Tab:**
- Past offers
- DON'T count toward tier limit
- Can "Extend / Re-list"
- Still in database, just marked as expired

**Deleted:**
- Removed/archived from database
- Gone completely

---

### 2. Admin CRM Cards ✅
**Shows ONLY CURRENT (ACTIVE) OFFERS**

❌ NO expired offers  
❌ NO deleted offers  
✅ ONLY offers that are currently active

**Why:** Admin needs clean view of what's currently live, not cluttered with history

---

### 3. Chat / Discover ✅
**Shows ONLY ACTIVE OFFERS**

Users NEVER see expired offers

---

### 4. Email Notification 📧
**1 week before expiry:**

```
Subject: ⏰ Your offer "2-for-1 Bottomless Brunch" expires in 7 days

Hi Ember & Oak!

Your offer is about to expire:
- 2-for-1 Bottomless Brunch
- Expires: 31/12/2025

[Click Here to Extend It]

Don't want to extend? After it expires, you can still 
re-list it anytime from your Expired Offers tab.
```

---

## WHAT EACH PLACE SHOWS

| Location | Shows | Logic |
|----------|-------|-------|
| **Business Dashboard** | Active + Expired (tabs) | All approved offers, separated by date |
| **Admin CRM** | ONLY Active | `status='approved'` AND `end_date >= today` |
| **Chat/Discover** | ONLY Active | Uses `business_offers_chat_eligible` view |
| **Deleted offers** | Nowhere | Removed from database |

---

## DATABASE STATES

### Active Offer:
```sql
status = 'approved'
offer_end_date >= CURRENT_DATE (or NULL)
```
→ Shows in: Business Dashboard (Active tab), Admin CRM, Chat ✅

### Expired Offer:
```sql
status = 'approved'
offer_end_date < CURRENT_DATE
```
→ Shows in: Business Dashboard (Expired tab) ONLY ✅  
→ Hidden from: Admin CRM, Chat ✅

### Deleted Offer:
```sql
-- Removed from database OR archived
-- (depending on implementation)
```
→ Shows: Nowhere ✅

---

## WHAT I FIXED

### Before (WRONG):
```typescript
// Admin CRM - showing ALL offers
.from('business_offers')
.select('*')
// ❌ No filtering - showed expired offers
```

### After (CORRECT):
```typescript
// Admin CRM - showing ONLY current offers
.from('business_offers')
.select('*')
.eq('status', 'approved')
.or(`offer_end_date.is.null,offer_end_date.gte.${TODAY}`) // ✅ Filter expired
```

---

## BUSINESS DASHBOARD (CORRECT - NO CHANGE NEEDED)

```typescript
// Active offers (shown in Active tab)
const activeOffers = offers.filter(o => 
  o.status === 'approved' && 
  (!o.offer_end_date || new Date(o.offer_end_date) >= today)
)

// Expired offers (shown in Expired tab)
const expiredOffers = offers.filter(o => 
  o.status === 'approved' && 
  o.offer_end_date && 
  new Date(o.offer_end_date) < today
)
```

---

## VERIFICATION

### Test 1: Admin CRM ✅
```
1. Open Admin Dashboard
2. Find Ember & Oak card
3. Check "Offers" tab
Expected: ONLY active offers (end_date >= today)
Expected: NO expired offers from October
```

### Test 2: Business Dashboard ✅
```
1. Login as Ember & Oak
2. Go to Dashboard > Offers
3. See TWO tabs: Active | Expired
Expected Active: Current offers
Expected Expired: Past offers (Oct offers if any)
```

### Test 3: Chat ✅
```
1. Ask: "any offers?"
Expected: ONLY active offers
Expected: NO expired offers
```

---

## EMAIL NOTIFICATION (TO IMPLEMENT)

**When:** 7 days before `offer_end_date`

**Trigger:** Supabase Edge Function (cron: daily at 9am)

**Email:**
- Subject: "Your offer [name] expires in 7 days"
- CTA: "Extend This Offer" button
- Links to: `/dashboard/offers?extend=[offer_id]`
- Dashboard pre-fills form with new end date

**Database tracking:**
```sql
ALTER TABLE business_offers
ADD COLUMN expiry_notification_sent BOOLEAN DEFAULT FALSE;
```

---

## FILES CHANGED

1. ✅ `lib/actions/admin-crm-actions.ts` - NOW shows ONLY active offers
2. ✅ `components/dashboard/offers-page.tsx` - Shows Active + Expired tabs
3. ✅ `app/dashboard/offers/page.tsx` - Fetches all offers for tabs
4. ✅ `lib/ai/hybrid-chat.ts` - Already correct (only active)

---

## WHAT YOU SEE NOW

### Admin CRM:
```
Ember & Oak Bistro
├─ Offers (2)
│  ├─ 2-for-1 Bottomless Brunch (expires 31/12/2025) ✅
│  └─ Midweek Fire Feast (expires 12/02/2026) ✅
│
David's Grill Shack
└─ Offers (0) ← Expired offers hidden ✅
```

### Business Dashboard (Ember & Oak):
```
[Active Offers] [Expired Offers]

Active Offers (2 of 5 used)
├─ 2-for-1 Bottomless Brunch
└─ Midweek Fire Feast

[Switch to Expired tab...]

Expired Offers (0)
└─ No expired offers
```

### Business Dashboard (David's):
```
[Active Offers] [Expired Offers]

Active Offers (0 of 5 used)
└─ No active offers

[Switch to Expired tab...]

Expired Offers (2) ← These don't count!
├─ 30% Off Mixed Grill (expired Oct 2025)
└─ 15% Off Cocktails (expired Oct 2025)
   [Extend / Re-list] button
```

---

## STATUS

🟢 **CORRECTED & READY**

### ✅ Fixed:
- Admin CRM now shows ONLY current offers (not expired)
- Business dashboard shows Active + Expired tabs
- Chat shows only active offers
- Deleted offers removed from database

### ⏳ To Implement:
- Email notification system (1 week before expiry)

---

## SORRY FOR THE CONFUSION!

I misunderstood and removed the filter from admin CRM when you wanted the opposite.

**NOW CORRECT:**
- ✅ Admin CRM = ONLY current offers
- ✅ Business Dashboard = Active + Expired in tabs
- ✅ Chat = ONLY active offers
- ✅ Email = 1 week warning (planned)

---

🎯 **Test admin CRM now - it should show ONLY current offers, NOT expired ones!**
