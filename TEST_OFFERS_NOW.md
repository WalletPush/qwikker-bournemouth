# TEST OFFERS FIX NOW ⚡

## Critical Bug Fixed
Chat was showing **expired offers from David's Grill Shack** instead of only active offers.

---

## Test Immediately

### 1. Start Dev Server
```bash
pnpm dev
```

### 2. Open Chat
Navigate to: `http://localhost:3000/discover`

### 3. Ask About Offers
```
User: "any offers in bournemouth?"
```

---

## Expected Results ✅

### Console Logs
```
🎫 Fetching ALL active offers in bournemouth
🎫 Found 2 wallet actions (all from eligible businesses, all valid)
🎫 Tier distribution: Ember & Oak Bistro(featured), Ember & Oak Bistro(featured)
📋 Current Deals:
  - Ember & Oak Bistro | Midweek Fire Feast for only £22 | ends 2/12/2026
  - Ember & Oak Bistro | Complimentary Fire-Cooked Side with Mains | ends 2/12/2026
```

### Chat Response
Should mention ONLY:
- ✅ Ember & Oak Bistro (2 offers)
- ❌ NO David's Grill Shack offers
- ❌ NO expired offers

---

## Additional Tests

### Test 2: Specific Business
```
User: "does David's have any offers?"
Expected: "I don't see any active offers for David's Grill Shack right now"
```

### Test 3: Ask About Expired Offer
```
User: "tell me about David's 30% off mixed grill"
Expected: Should NOT find this expired offer
```

---

## What Changed

**File:** `lib/ai/hybrid-chat.ts` (lines 372-442)

**Before:** Only fetched offers for TOP search result (1 business)  
**After:** Fetches ALL active offers for general queries

**View filtering ensures:**
- Only `status = 'approved'`
- Only `offer_start_date <= TODAY` (or NULL)
- Only `offer_end_date >= TODAY` (or NULL)

---

## If It Still Shows Expired Offers

### Check Console Logs
1. Look for: `🎫 Fetching ALL active offers in bournemouth`
2. Look for: `📋 Current Deals:` with list of offers
3. Verify offer end dates are in the future

### Check Database
Run the verification SQL:
```bash
# In Supabase SQL Editor
SELECT * FROM business_offers_chat_eligible;
```

Expected:
- 2 rows total
- Both from Ember & Oak Bistro
- Both with `offer_end_date >= CURRENT_DATE`

### Check View Definition
```sql
-- Should filter by date
SELECT view_definition 
FROM information_schema.views 
WHERE table_name = 'business_offers_chat_eligible';
```

---

## Next Steps After Verification

Once you confirm this fix works:

1. ✅ Run the RLS migration for city isolation (from `QUICK_START_TENANT_FIX.md`)
2. ⏳ Consider adding offer expiry notifications
3. ⏳ Consider adding "past offers" tab like events

---

## Status

🟢 **READY TO TEST** - Dev server should show correct offers now!

---

## Quick Verification Command

```bash
# Test in one command
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "any offers in bournemouth?",
    "city": "bournemouth"
  }'
```

Check the response JSON for `walletActions` - should have exactly 2 offers, both from Ember & Oak Bistro.
