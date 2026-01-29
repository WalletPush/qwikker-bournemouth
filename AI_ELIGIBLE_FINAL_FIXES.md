# AI Eligible Toggle - FINAL FIXES

## Root Causes Identified and Fixed

### 1. ✅ API Route Query Error
**Problem:** `/api/admin/kb-eligible` was querying `tier_priority` column that doesn't exist in `business_profiles_ai_eligible` view

**Fix:** 
- Removed `.order('tier_priority', { ascending: true })` 
- Removed `.order('effective_tier', ...)` 
- Now just orders by `business_name`

**Files Modified:**
- `app/api/admin/kb-eligible/route.ts`

### 2. ✅ Missing Column in Admin Query
**Problem:** `admin_chat_fallback_approved` was NEVER fetched from database, so component never received it

**Fix:** 
- Added `admin_chat_fallback_approved` to the SELECT statement in admin page

**Files Modified:**
- `app/admin/page.tsx` (line ~89)

```typescript
admin_notes,
status,
visibility,
auto_imported,
admin_chat_fallback_approved,  // ← ADDED THIS
google_place_id,
```

### 3. ✅ Checkbox Showing for AI-Eligible Businesses
**Problem:** Checkboxes remained visible even after businesses were made AI eligible

**Fix:** 
- Wrapped checkbox in conditional: `{!business.admin_chat_fallback_approved && (...)}`
- Checkbox only shows for non-AI-eligible businesses
- AI Eligible badge replaces checkbox in the same position (top-left)

**Files Modified:**
- `components/admin/admin-dashboard.tsx`

### 4. ✅ Select All Logic
**Problem:** "Select All" was trying to select AI-eligible businesses

**Fix:** 
- Updated `toggleSelectAll()` to filter out businesses where `admin_chat_fallback_approved = true`
- Only selects businesses that CAN be made AI eligible
- Header now shows count like "13 businesses (2 already AI eligible)"

**Files Modified:**
- `components/admin/admin-dashboard.tsx`

## What Works Now

### Before Bulk Update:
```
┌──────────────────────────┐
│ ☑  Triangle GYROSS       │  ← Checkbox visible
│  Greek Restaurant        │
│  Status: Unclaimed       │
└──────────────────────────┘

┌──────────────────────────┐
│ ☑  Kalimera Bournemouth  │  ← Checkbox visible
│  Greek Restaurant        │
│  Status: Unclaimed       │
└──────────────────────────┘
```

### After Bulk Update:
```
┌──────────────────────────┐
│ 🔅 AI Eligible            │  ← Purple badge replaces checkbox
│  Triangle GYROSS         │
│  Greek Restaurant        │
│  Status: Unclaimed       │
└──────────────────────────┘

┌──────────────────────────┐
│ 🔅 AI Eligible            │  ← Purple badge replaces checkbox
│  Kalimera Bournemouth    │
│  Greek Restaurant        │
│  Status: Unclaimed       │
└──────────────────────────┘
```

### Header Counts:
- **Before:** "13 businesses"
- **After:** "13 businesses (2 already AI eligible)"
- **With selection:** "2 selected"

### Filter:
- Click "Show AI Eligible" → Only shows the 2 AI-eligible businesses
- Badge visible on filtered results

## Testing Checklist

- [x] API route no longer errors on `tier_priority`
- [x] `admin_chat_fallback_approved` fetched from database
- [ ] Purple "AI Eligible" badge appears on cards
- [ ] Checkboxes hidden for AI-eligible businesses
- [ ] "Select All" only selects non-AI-eligible businesses
- [ ] Header count shows "(X already AI eligible)"
- [ ] Filter toggle works correctly
- [ ] Page refresh shows updated state

## Files Changed

1. `app/api/admin/kb-eligible/route.ts` - Removed non-existent column references
2. `app/admin/page.tsx` - Added `admin_chat_fallback_approved` to SELECT
3. `components/admin/admin-dashboard.tsx` - Conditional checkbox, badge positioning, select all logic

## Database Verification

Run this to verify data is correct:

```sql
SELECT 
  business_name,
  status,
  auto_imported,
  admin_chat_fallback_approved
FROM business_profiles
WHERE city = 'bournemouth'
  AND status = 'unclaimed'
  AND auto_imported = true
ORDER BY business_name;
```

Expected: 2 rows with `admin_chat_fallback_approved = true`
