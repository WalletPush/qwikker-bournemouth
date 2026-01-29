# ✅ Vibes System Test Checklist

## Quick Test (5 minutes)

### Test 1: Vibe Prompt Appears
1. Go to any business detail page (e.g., `/user/business/davids-grill-shack`)
2. Click **"Get Directions"**
3. **Expected**: After 3 seconds, bottom sheet appears with 3 vibe options
4. **Result**: ✅ Pass / ❌ Fail

### Test 2: Vibe Submission Works
1. In the vibe prompt, click **"Loved it"**
2. **Expected**: Success animation, sheet closes after 1.5s
3. **Result**: ✅ Pass / ❌ Fail

### Test 3: Duplicate Prevention
1. Go back to same business
2. Click "Get Directions" again
3. Submit another vibe
4. **Expected**: Updates existing vibe (no duplicate in DB)
5. **Verify in SQL**:
```sql
SELECT * FROM qwikker_vibes 
WHERE business_id = '<business_id>' 
ORDER BY created_at DESC;
```
6. **Expected**: Only 1 row for this user/business combo
7. **Result**: ✅ Pass / ❌ Fail

### Test 4: Vibe Stats Display
1. Refresh the business page
2. Look at "What People Think" tab (or "Reviews" tab if not renamed yet)
3. **Expected**: Shows vibe count/percentage
4. **Result**: ✅ Pass / ❌ Fail (⚠️ Might need UI update)

---

## Debug Commands

### Check if vibes are being saved:
```sql
SELECT 
  bp.business_name,
  qv.vibe_rating,
  qv.vibe_user_key,
  qv.created_at
FROM qwikker_vibes qv
JOIN business_profiles bp ON qv.business_id = bp.id
ORDER BY qv.created_at DESC
LIMIT 10;
```

### Check aggregate stats for a business:
```sql
SELECT 
  business_id,
  COUNT(*) as total_vibes,
  COUNT(*) FILTER (WHERE vibe_rating IN ('loved_it', 'it_was_good')) as positive_vibes,
  ROUND(
    COUNT(*) FILTER (WHERE vibe_rating IN ('loved_it', 'it_was_good'))::numeric / 
    COUNT(*)::numeric * 100
  ) as positive_percentage
FROM qwikker_vibes
WHERE business_id = '<business_id>'
GROUP BY business_id;
```

---

## Known Issues to Check

1. **walletPassId might be null**: API uses `vibe_user_key` as primary identifier, `wallet_pass_id` column is nullable in DB
2. **Tab might still say "Reviews"**: Needs renaming to "What People Think"
3. **Stats might not display yet**: Need to verify `getBusinessVibeStats()` is called when loading page

---

## Status

- ✅ SQL migration run
- ✅ API endpoint exists (`/api/vibes/submit`)
- ✅ Component created (`VibePromptSheet`)
- ✅ Triggers wired (Get Directions, Call Now)
- ⚠️ Display UI needs verification
- ⚠️ End-to-end test needed
