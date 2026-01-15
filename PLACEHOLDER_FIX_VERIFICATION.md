# Placeholder Fix - Final Verification Checklist ✅

**Last Updated:** 2026-01-14  
**Status:** All code changes complete, verification required

---

## 🔧 STEP 0: Generate Default Placeholder Image (REQUIRED)

The default placeholder image must be replaced before testing.

### Quick Method (Recommended):
```bash
# If you have ImageMagick installed:
chmod +x scripts/generate-default-placeholder.sh
./scripts/generate-default-placeholder.sh
```

### Alternative Methods:
See: `scripts/GENERATE_DEFAULT_PLACEHOLDER.md`

**Verify file created:**
```bash
ls -lh public/placeholders/default/00.webp
# Should show file ~20-40KB
```

---

## 🚀 STEP 1: Restart Dev Server

**Critical:** TypeScript changes require fresh compilation

```bash
# Kill existing server
pkill -f "next dev"

# Start fresh
cd /Users/qwikker/qwikkerdashboard
pnpm dev
```

**Wait for:** `✓ Compiled successfully`

---

## 🧪 STEP 2: Test Debug Page

### Open:
```
http://localhost:3000/dev/placeholders
```

### Expected Results:

#### Supported Categories (Should show GREEN):
```
✅ restaurant → /placeholders/restaurant/{00|01|02}.webp
✅ cafe       → /placeholders/cafe/{00|01|02}.webp
✅ bar        → /placeholders/bar/{00|01|02}.webp
✅ barber     → /placeholders/barber/{00|01|02}.webp
✅ bakery     → /placeholders/bakery/{00|01|02}.webp
✅ dessert    → /placeholders/dessert/{00|01|02}.webp
```

#### Unknown Category (Should show AMBER):
```
⚠️  salon     → /placeholders/default/00.webp (fallback)
```

### What to Check:
- [ ] All 6 supported categories show their respective images
- [ ] Each category shows 3 different image variants (00, 01, 02)
- [ ] Image variants are deterministic (same ID = same image)
- [ ] Style variants show (0-5)
- [ ] Salon shows default image (should be neutral, not cafe)
- [ ] Images load without 404 errors
- [ ] Resolved category names are correct

### Browser Console (should see):
```
⚠️ Placeholder fallback: "salon" → /placeholders/default/00.webp
```
(Only for salon, not for supported categories)

---

## 🔍 STEP 3: Test Discover Page

### Open:
```
http://localhost:3000/discover
```

### Visual Verification:

#### Restaurants (should show FOOD/DINING imagery):
- [ ] The Golden Spoon → Shows restaurant placeholder
- [ ] The Beachside Bistro → Shows restaurant placeholder
- [ ] Ember & Oak Bistro → Shows restaurant placeholder
- [ ] **NOT cafe/coffee imagery**

#### Cafes (should show COFFEE/LATTE ART):
- [ ] Alexandra's Café → Shows cafe placeholder
- [ ] Coastal Coffee Roasters → Shows cafe placeholder
- [ ] **NOT generic/restaurant imagery**

#### Bars (should show DRINKS/BOTTLES):
- [ ] Adams Cocktail Bar → Shows bar placeholder
- [ ] Mike's Pool Bar → Shows bar placeholder
- [ ] The Vine Wine Bar → Shows bar placeholder
- [ ] **NOT cafe/coffee imagery**

#### Barbers (should show SCISSORS/SALON):
- [ ] Scizzors → Shows barber placeholder
- [ ] Urban Cuts Barbers → Shows barber placeholder
- [ ] **NOT generic imagery**

### Browser Console Check:
- [ ] Open DevTools (F12)
- [ ] Look for console.log statements (DEV mode)
- [ ] Should NOT see fallback warnings for supported categories
- [ ] May see fallback warning for unknown categories (salon, pub, etc.)

### Network Tab Check:
- [ ] Open DevTools → Network tab
- [ ] Filter by "webp"
- [ ] Verify URLs match categories:
  ```
  ✅ /placeholders/restaurant/01.webp
  ✅ /placeholders/cafe/02.webp
  ✅ /placeholders/bar/00.webp
  ✅ /placeholders/barber/01.webp
  ```
- [ ] Should NOT see all businesses loading `/placeholders/default/00.webp`

---

## 🏢 STEP 4: Test Business Detail Pages

Click into individual businesses and verify hero images:

### Restaurant Detail:
```
http://localhost:3000/business/the-golden-spoon
```
- [ ] Shows restaurant placeholder image
- [ ] **NOT cafe/coffee imagery**

### Cafe Detail:
```
http://localhost:3000/business/coastal-coffee-roasters
```
- [ ] Shows cafe placeholder image
- [ ] Latte art or coffee-related imagery

### Bar Detail:
```
http://localhost:3000/business/adams-cocktail-bar
```
- [ ] Shows bar placeholder image
- [ ] Drinks/bottles imagery

### Barber Detail:
```
http://localhost:3000/business/scizzors
```
- [ ] Shows barber placeholder image
- [ ] Scissors/salon imagery

---

## 🛠️ STEP 5: Test Admin Dashboard (Optional)

If you have unclaimed businesses:

```
http://localhost:3000/admin
```

### For Unclaimed Business:
1. Click on an unclaimed business (e.g., The Golden Spoon)
2. Navigate to "Files & Assets" tab
3. Check for Placeholder Selector component

**Expected:**
- [ ] Placeholder selector appears
- [ ] Shows current category (restaurant, cafe, etc.)
- [ ] Shows current variant (00, 01, 02)
- [ ] Can change variant
- [ ] Save button works
- [ ] Page refreshes with new image

**Note:** Selector only appears for `status='unclaimed'` businesses

---

## 🧹 STEP 6: Clean Browser Cache (If Issues)

If placeholder images don't update:

```bash
# Hard refresh
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + R
```

Or:
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

---

## ✅ SUCCESS CRITERIA

### Code:
- [x] Created `lib/utils/resolve-system-category.ts`
- [x] Updated `components/user/business-card.tsx`
- [x] Updated `components/user/user-business-detail-page.tsx`
- [x] Enhanced `app/dev/placeholders/page.tsx`
- [x] Added DEV-only logging to `getPlaceholderUrl()`
- [x] Verified no legacy `.v1.webp` usage
- [x] Linter passed
- [x] TypeScript compilation passed

### Assets:
- [ ] Default placeholder replaced with neutral image
- [ ] File is 16:9 aspect ratio
- [ ] File is WebP format
- [ ] File size < 50KB

### Functionality:
- [ ] Debug page shows correct categories
- [ ] Discover page shows category-appropriate images
- [ ] Restaurants show food imagery (not cafe)
- [ ] Cafes show coffee imagery
- [ ] Bars show drinks imagery
- [ ] Barbers show scissors/salon imagery
- [ ] Unknown categories show neutral default
- [ ] No 404 errors for placeholder images
- [ ] Browser console shows no errors
- [ ] Network requests match expected URLs

---

## 🚨 TROUBLESHOOTING

### Issue: Restaurants still show cafe images

**Cause:** Database `system_category` might be wrong or cache issue

**Fix:**
```sql
-- Check database
SELECT business_name, system_category 
FROM business_profiles 
WHERE city = 'bournemouth';

-- Update if needed
UPDATE business_profiles 
SET system_category = 'restaurant' 
WHERE business_name = 'The Golden Spoon';
```

Then hard refresh browser.

---

### Issue: All categories show default image

**Cause:** Category resolution failing, or default not replaced yet

**Fix:**
1. Check browser console for errors
2. Verify `system_category` exists in database
3. Hard refresh browser
4. Check Network tab for actual URLs being requested

---

### Issue: Placeholder selector not showing in admin

**Cause:** Business might not be `unclaimed` status

**Fix:**
```sql
-- Check status
SELECT business_name, status, owner_user_id 
FROM business_profiles 
WHERE business_name = 'The Golden Spoon';

-- Should be:
-- status = 'unclaimed'
-- owner_user_id = NULL
```

Only unclaimed businesses show the placeholder selector.

---

### Issue: Console shows fallback warnings for supported categories

**Cause:** `system_category` might be `NULL` or incorrect

**Fix:**
```sql
-- Check for NULL
SELECT business_name, system_category 
FROM business_profiles 
WHERE system_category IS NULL;

-- Update if needed
UPDATE business_profiles 
SET system_category = 'restaurant' 
WHERE business_name = 'The Golden Spoon' 
AND system_category IS NULL;
```

---

## 📊 VERIFICATION SUMMARY

After completing all steps above, you should have:

✅ **Neutral default placeholder** - No cafe/coffee imagery  
✅ **Category-appropriate placeholders** - Restaurants look like restaurants  
✅ **Deterministic selection** - Same business always gets same image  
✅ **No legacy paths** - Clean codebase  
✅ **Debug tools** - Easy to verify and troubleshoot  
✅ **Production-ready** - No console spam, proper fallbacks  

---

## 📝 FINAL CHECKLIST

Before marking complete:

- [ ] Default placeholder replaced with neutral image
- [ ] Dev server restarted successfully
- [ ] Debug page shows all categories correctly
- [ ] Discover page shows category-appropriate images
- [ ] No 404 errors in browser console
- [ ] No TypeScript errors
- [ ] No linter errors
- [ ] Business detail pages show correct placeholders
- [ ] Admin placeholder selector works (if applicable)
- [ ] Hard refresh confirmed changes persist

---

**If all checkboxes are ticked:** ✅ Placeholder fix is complete!

**If issues remain:** Review troubleshooting section or check:
- `docs/PLACEHOLDER_SYSTEM_FINAL_AUDIT.md` (technical details)
- `MASTER_TASK_COMPLETION_REPORT.md` (full audit report)
- `scripts/GENERATE_DEFAULT_PLACEHOLDER.md` (image generation help)

