# QWIKKER AI CHAT - COMPLETE AUDIT & FIX PLAN
Date: 2026-01-31
Issue: "Indian restaurants" query showing wrong businesses + missing review attribution

## CRITICAL BUGS FOUND

### BUG #1: Showing businesses with relevanceScore = 0
**Location:** `lib/ai/hybrid-chat.ts:982`
**Problem:**
```javascript
const lowerTiersTop = allLowerTiers.slice(0, 6)
```
Takes top 6 businesses from `allLowerTiers` WITHOUT filtering by relevanceScore.
Result: Shows Thai/Mediterranean/Italian for "indian" query (all scored 0).

**Fix:**
```javascript
const lowerTiersTop = allLowerTiers
  .filter(b => b.relevanceScore > 0)
  .slice(0, 6)
```

---

### BUG #2: Only scoring top 10 by rating, not all businesses
**Location:** `lib/ai/hybrid-chat.ts:940-946`
**Problem:**
```javascript
const tier3 = tier3Businesses
  .sort((a, b) => rating)
  .slice(0, 10)  // ❌ ONLY 10 BUSINESSES!

const tier3WithScores = tier3.map(b => score(b))
```
Sorts 104 businesses by rating, takes top 10, THEN scores for "indian".
If Indian restaurants aren't in top 10 by rating → they never get scored.

**Fix:**
```javascript
// Score ALL businesses FIRST
const tier3WithScores = tier3Businesses.map(b => ({
  ...b,
  relevanceScore: scoreBusinessRelevance(b, intent)
}))

// THEN filter & sort by relevance
const tier3Relevant = tier3WithScores
  .filter(b => b.relevanceScore > 0)
  .sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore
    return (b.rating || 0) - (a.rating || 0)
  })
```

---

### BUG #3: Google review snippets shown for wrong context
**Location:** `lib/ai/hybrid-chat.ts:1435-1440` + `components/user-chat-page.tsx:892-893`
**Problem:**
1. Shows reviews for FIRST business when listing 6 businesses
2. User sees "Flairs Thai" reviews but also seeing 5 other restaurants
3. Header doesn't indicate which business the reviews are for

**Current behavior:**
```
Showing: Restaurant A, Restaurant B, Restaurant C, Restaurant D, Restaurant E, Restaurant F
Reviews: "Great food!" (from Restaurant A... but user doesn't know that)
```

**Fix:**
```javascript
// ONLY show reviews when showing exactly 1 business
if (allTier3Businesses && allTier3Businesses.length === 1) {
  // Safe to show reviews - it's clear which business they're for
  const business = allTier3Businesses[0]
  // ... fetch and display reviews
}
```

```tsx
// Frontend: Add business name to header
<p>What People Are Saying About{' '}
  <a href="/user/business/{businessId}">{businessName}</a>
  {' '}on Google
</p>
```

**Result:**
- Multiple businesses shown → No reviews (avoid confusion)
- Single business shown → Show reviews with clear attribution

---

## ROOT CAUSE ANALYSIS

### Why this happened:
1. **Premature optimization**: Took top 10 by rating to "save processing"
2. **Missing validation**: No check for relevanceScore > 0 before showing
3. **UI oversight**: Review attribution exists in data, not shown in UI

### Why it wasn't caught:
1. **No test data**: Bournemouth only has paid businesses (Tier 1)
2. **No Tier 3 testing**: First real test was with investor in Bali
3. **Logs misleading**: "0 relevant" logged, but businesses still shown

---

## FIX IMPLEMENTATION PLAN

### Step 1: Fix relevance scoring (hybrid-chat.ts)
- [ ] Line 940-968: Score ALL Tier 3 businesses, not just 10
- [ ] Line 982: Filter lowerTiersTop by relevanceScore > 0
- [ ] Add validation: Never show businesses with score=0 for intent queries

### Step 2: Fix review attribution (user-chat-page.tsx)
- [ ] Line 892: Add business name to review header
- [ ] Make it a clickable link to the business page

### Step 3: Add safeguards
- [ ] Log warning if showing businesses with score=0
- [ ] Add assertion: intent mode + score=0 = ERROR

### Step 4: Testing checklist
- [ ] "indian in bali" → shows 2 Indian restaurants ONLY
- [ ] "pizza in bali" → shows pizza places, not random Italian
- [ ] "thai in bali" → shows Thai restaurants
- [ ] "show me restaurants" → browse mode, shows all
- [ ] Reviews show business name in header

---

## EXPECTED BEHAVIOR AFTER FIX

### Query: "any indian places?"
**Current (BROKEN):**
```
Showing: Thai, Mediterranean, Italian, Japanese (score=0)
Reviews: "Great food!" — No business name
```

**After Fix:**
```
Showing: Bollywood Indian Cuisine, Olive Mediterranean (only if score > 0)
Reviews: "What People Are Saying About Bollywood Indian Cuisine on Google"
  - "Amazing curry!" — Sarah M. ★★★★★
```

---

## FILES TO CHANGE

1. `lib/ai/hybrid-chat.ts`
   - Lines 940-968: Relevance scoring logic
   - Line 982: Filter before showing

2. `components/user/user-chat-page.tsx`
   - Line 892: Add business name to review header

---

## COMMIT STRATEGY

Single atomic commit:
```
fix: AI chat relevance scoring + review attribution

CRITICAL BUGS (investor demo failure):
1. Showing businesses with relevanceScore=0 for intent queries
2. Only scoring top 10 by rating (Indian restaurants missed)
3. Google reviews missing business name attribution

Fixes:
- Score ALL Tier 3 businesses before filtering (not just top 10)
- Filter by relevanceScore > 0 BEFORE showing
- Add business name to review snippet header

Result:
- "indian in bali" → shows 2 Indian restaurants ONLY
- Reviews clearly attributed to specific business
```

---

## ROLLBACK PLAN

If fix causes issues:
```bash
git revert HEAD
git push origin main --force
```

Falls back to previous behavior (broken but at least shows something).
