# TEST EXPIRED OFFERS (EVENTS-STYLE) ⚡

## What Changed

Offers now work **like events** with:
- ✅ Active/Expired tabs
- ✅ Expired offers DON'T count toward limits
- ✅ "Extend / Re-list" button
- ✅ Users NEVER see expired (chat/discover)

---

## Quick Test (5 minutes)

### 1. Start Dev Server
```bash
pnpm dev
```

---

### 2. Test Business Dashboard

#### Open Offers Page
```
http://localhost:3000/dashboard/offers
```

#### ✅ Expected Results:

**Should see TWO tabs:**
- **Active Offers (X)** ← current offers
- **Expired Offers (Y)** ← past offers

**Active tab should:**
- Show offers with `offer_end_date >= today` (or NULL)
- Count shows "X/Y offers used" (only active offers count)
- Have Edit/Delete buttons

**Expired tab should:**
- Show offers with `offer_end_date < today`
- Have orange border/badge
- Have "Extend / Re-list" button
- Show message: "These don't count toward your limit"

**Click "Extend / Re-list":**
- Form opens with offer pre-filled
- End date is cleared (ready for new date)
- User can pick new date and save
- Offer moves back to Active tab ✅

---

### 3. Test Chat (Critical!)

#### Open Discover Chat
```
http://localhost:3000/discover
```

#### Ask About Offers
```
User: "any offers in bournemouth?"
```

#### ✅ Expected Results:

**Console logs:**
```
🎫 Fetching ALL active offers in bournemouth
🎫 Found 2 wallet actions (all from eligible businesses, all valid)
📋 Current Deals:
  - Ember & Oak Bistro | Midweek Fire Feast | ends 2/12/2026
  - Ember & Oak Bistro | Complimentary Side | ends 2/12/2026
```

**Chat response should:**
- ✅ Show ONLY Ember & Oak (2 offers)
- ❌ NO David's expired offers (Oct 2025)
- ❌ NO expired offers from ANY business

---

### 4. Test Admin CRM

#### Open Admin Dashboard
```
http://localhost:3000/admin
```

#### Find David's Grill Shack Card

#### Expand Card → Click "Offers" Tab

#### ✅ Expected Results:
- Shows ALL offers (active + expired)
- Can see full offer history
- Expired offers clearly marked with date
- Admin can see everything for support purposes

---

## Edge Cases to Test

### Test 1: Offer with NULL end date
```sql
-- Should appear in Active tab (never expires)
UPDATE business_offers 
SET offer_end_date = NULL 
WHERE id = '<some-offer-id>';
```

### Test 2: Offer expiring TODAY
```sql
-- Should appear in Active tab (expires end of today)
UPDATE business_offers 
SET offer_end_date = CURRENT_DATE 
WHERE id = '<some-offer-id>';
```

### Test 3: Offer expired YESTERDAY
```sql
-- Should appear in Expired tab
UPDATE business_offers 
SET offer_end_date = CURRENT_DATE - INTERVAL '1 day' 
WHERE id = '<some-offer-id>';
```

### Test 4: Extend expired offer
1. Go to Expired tab
2. Click "Extend / Re-list"
3. Pick date 30 days in future
4. Save
5. Verify offer moves to Active tab
6. Ask chat "any offers?" → should now see it ✅

---

## Database Verification

### Check View Filters Correctly
```sql
-- Should return 0 (no expired offers in view)
SELECT COUNT(*) 
FROM business_offers_chat_eligible 
WHERE offer_end_date < CURRENT_DATE;
```

### Check Active vs Expired Counts
```sql
-- Active offers
SELECT COUNT(*) 
FROM business_offers 
WHERE status = 'approved' 
AND (offer_end_date IS NULL OR offer_end_date >= CURRENT_DATE);

-- Expired offers
SELECT COUNT(*) 
FROM business_offers 
WHERE status = 'approved' 
AND offer_end_date < CURRENT_DATE;
```

### Show All Offers with Status
```sql
SELECT 
  offer_name,
  business_id,
  offer_end_date,
  CASE
    WHEN offer_end_date IS NULL THEN '⚠️ No expiry'
    WHEN offer_end_date < CURRENT_DATE THEN '❌ EXPIRED'
    ELSE '✅ Active'
  END as status,
  CASE
    WHEN offer_end_date < CURRENT_DATE 
    THEN CURRENT_DATE - offer_end_date 
    ELSE NULL
  END as days_expired
FROM business_offers
WHERE status = 'approved'
ORDER BY offer_end_date;
```

---

## Visual Verification

### Active Offers Tab:
```
┌─────────────────────────────────────┐
│ Active Offers | Expired Offers      │
│ ━━━━━━━━━━━━                        │
│                                     │
│ Active Offers (2 of 5 used)        │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ 🎫 Midweek Fire Feast          ││
│ │ £22 special menu               ││
│ │ Expires: 12 Feb 2026           ││
│ │ [Edit] [Delete]                ││
│ └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

### Expired Offers Tab:
```
┌─────────────────────────────────────┐
│ Active Offers | Expired Offers      │
│               ━━━━━━━━━━━━━━━━      │
│                                     │
│ Expired Offers                      │
│ ℹ️ These don't count toward limit   │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ 🔶 30% Off Mixed Grill         ││
│ │ Expired 21 Oct 2025            ││
│ │ [Extend / Re-list]             ││
│ └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

---

## Common Issues & Fixes

### Issue 1: "I don't see expired offers tab"
**Fix:** Check `profile.business_offers` includes expired offers
```typescript
// In app/dashboard/offers/page.tsx
console.log('All offers:', profileData.business_offers)
console.log('Expired:', expiredOffers)
```

### Issue 2: "Chat still shows expired offers"
**Fix:** View is wrong - run:
```sql
SELECT COUNT(*) FROM business_offers_chat_eligible 
WHERE offer_end_date < CURRENT_DATE;
```
If > 0, the view needs fixing.

### Issue 3: "Expired offers count toward limit"
**Fix:** Check `currentOfferCount` calculation:
```typescript
// Should ONLY count active offers
const currentOfferCount = activeOffers.length // NOT approvedOffers.length
```

---

## Success Criteria

- [  ] Business dashboard has Active/Expired tabs
- [ ] Expired tab shows past offers
- [ ] Expired offers have "Extend / Re-list" button
- [ ] Expired offers DON'T count in "X/Y used"
- [ ] Chat NEVER shows expired offers
- [ ] Admin CRM shows ALL offers
- [ ] Extending expired offer moves it to Active
- [ ] Extended offer appears in chat ✅

---

## If Everything Works

You should be able to:
1. See David's expired offers in Expired tab ✅
2. Click "Extend / Re-list" on one ✅
3. Pick new end date ✅
4. Save ✅
5. See it move to Active tab ✅
6. Ask chat "any offers?" → see the extended offer ✅

---

🎯 **Start with the business dashboard test - it's the most visual way to verify the tabs work!**
