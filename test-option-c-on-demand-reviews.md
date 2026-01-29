# Test Script: Verify Option C On-Demand Review Fetch

## Purpose
Confirm that on-demand review fetching is wired correctly and rate limiting works.

---

## Prerequisites
1. Find an unclaimed business with `google_place_id` set
2. Ensure business has `status = 'unclaimed'` and `auto_imported = true`

---

## Test 1: Fresh Fetch (Rate Limit Allowed)

### Setup
```sql
-- Find a test business
SELECT id, business_name, google_place_id, google_reviews_highlights
FROM business_profiles
WHERE status = 'unclaimed'
  AND auto_imported = true
  AND google_place_id IS NOT NULL
LIMIT 1;

-- Clear cached reviews to force on-demand fetch
UPDATE business_profiles
SET google_reviews_highlights = NULL
WHERE id = '<business_id_from_above>';
```

### Execute Test
1. Open chat at `/user/chat`
2. Send message: **"show me restaurants with good reviews"** (triggers `shouldAttachCarousel = true`)
3. Check browser console for logs

### Expected Logs
```
🎨 UI Mode: suggestions, shouldAttachCarousel: true
💰 Attempting on-demand review fetch for [Business Name] (est. cost: ~$0.014-$0.025 depending on Google SKU)
✅ Fetched 3 fresh reviews on-demand
```

### Expected UI
- Business appears in chat response
- Google review snippets section shows:
  - "From Google Reviews (Verbatim)"
  - 1-3 review snippets (4★ or 5★ only)
  - "Read all reviews →" link
  - Each snippet shows author name and rating

### Verify in Network Tab
- Look for `POST /api/ai/chat`
- Response should include `googleReviewSnippets` object with `snippets` array

---

## Test 2: Rate Limit Block (Immediate Retry)

### Execute Test
**Immediately** send the same query again:
**"show me restaurants with good reviews"**

### Expected Logs
```
🎨 UI Mode: suggestions, shouldAttachCarousel: true
⏱️ Skipping on-demand reviews (rate limited until 2026-01-28T12:35:00.000Z)
```

### Expected UI
- Business still appears in chat response
- NO Google review snippets section (because fetch was blocked)
- OR shows cached snippets if they were stored after first fetch

### Expected Behavior
- No new Google Places API call made
- No additional cost incurred
- Chat still works, just without fresh review snippets

---

## Test 3: Conversational Mode (No Fetch)

### Setup
Same business with `google_reviews_highlights = NULL`

### Execute Test
Send conversational query: **"what's good to eat?"**

### Expected Logs
```
🎨 UI Mode: conversational, shouldAttachCarousel: false
```

### Expected Behavior
- NO on-demand fetch triggered (because `shouldAttachCarousel = false`)
- Business may be mentioned in text, but no carousel or snippets
- $0 cost

---

## Test 4: Bad Reviews Filtered Out

### Setup
Manually inspect Google reviews for test business:
```bash
curl "https://places.googleapis.com/v1/places/<place_id>" \
  -H "X-Goog-Api-Key: <your_key>" \
  -H "X-Goog-FieldMask: reviews"
```

Note if any reviews have `rating < 4`.

### Execute Test
Trigger on-demand fetch (Test 1 steps)

### Expected Behavior
- Only reviews with `rating >= 4` appear in UI
- 1★, 2★, 3★ reviews are filtered out
- Max 3 snippets shown
- Text clamped to 280 characters

---

## Test 5: No Reviews Available

### Setup
Find a business with no Google reviews:
```sql
SELECT id, business_name, review_count
FROM business_profiles
WHERE status = 'unclaimed'
  AND auto_imported = true
  AND google_place_id IS NOT NULL
  AND (review_count = 0 OR review_count IS NULL)
LIMIT 1;
```

### Execute Test
Trigger fetch for this business

### Expected Logs
```
💰 Attempting on-demand review fetch for [Business Name] (est. cost: ~$0.014-$0.025 depending on Google SKU)
ℹ️ No reviews returned from on-demand fetch
```

### Expected Behavior
- No error thrown
- Chat response still includes business (graceful degradation)
- No review snippets section
- Google Places API still called (cost incurred, but returns empty)

---

## Success Criteria

✅ **Test 1 passes**: Fresh reviews fetched and displayed  
✅ **Test 2 passes**: Rate limit blocks second fetch within cooldown  
✅ **Test 3 passes**: Conversational mode doesn't trigger fetch  
✅ **Test 4 passes**: Only 4★+ reviews shown, text clamped  
✅ **Test 5 passes**: No crash when reviews unavailable  

---

## Cleanup

```sql
-- Restore cached reviews if needed
UPDATE business_profiles
SET google_reviews_highlights = '<original_value>'
WHERE id = '<test_business_id>';
```

---

## Cost Verification

After running all tests, check Google Cloud Console:
1. Go to **APIs & Services → Google Places API → Quotas**
2. Look for recent "Place Details" requests
3. Verify billing aligns with expected calls

**Expected cost for full test suite**: ~$0.03-$0.05 (2-3 fresh fetches)

---

## Known Limitations (OK for MVP)

1. **Rate limiting resets on cold start** (serverless)  
   → Acceptable for launch, upgrade to DB-based locks later

2. **Anonymous users share same rate limit bucket**  
   → Acceptable if most users have `walletPassId`

3. **No IP-based fallback for anonymous users**  
   → Low priority, can add later

4. **Cost logged as estimate, not actual billing**  
   → Acceptable, Google billing is source of truth
