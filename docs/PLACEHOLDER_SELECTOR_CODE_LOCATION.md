# Placeholder Selector Code Location Guide

## 📍 WHERE TO FIND IT

### 1. Main Admin CRM Card Component
**File:** `components/admin/comprehensive-business-crm-card.tsx`  
**Lines:** 1144-1174

**Location in UI:**
```
Admin Dashboard (/admin)
  → Click on business card to expand
    → "Files & Assets" tab
      → Placeholder Image Selector appears here
```

**Conditional Rendering:**
```typescript
// Line 1145: Only shows for unclaimed businesses with system_category
{business.status === 'unclaimed' && business.system_category && (
  <div className="mb-4">
    <PlaceholderSelector
      businessId={business.id}
      businessName={business.business_name}
      status={business.status}
      systemCategory={business.system_category as SystemCategory}
      placeholderVariant={business.placeholder_variant ?? 0}
      onSave={async (variant: number) => {
        // Calls API to update database
        const response = await fetch('/api/admin/businesses/placeholder-variant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business.id,
            placeholderVariant: variant
          })
        })
        // Refreshes page to show new image
        window.location.reload()
      }}
    />
  </div>
)}
```

---

### 2. Placeholder Selector Component
**File:** `components/admin/placeholder-selector.tsx`  
**Lines:** 1-137

**What it does:**
- Shows preview thumbnail of selected placeholder image
- Displays category and current variant
- Dropdown to select variants 0, 1, or 2
- Save button to update database
- Info message explaining placeholder purpose

**Key Features:**
```typescript
// Line 40-43: Generates preview URL
const previewUrl = useMemo(() => {
  const variantStr = selectedVariant.toString().padStart(2, '0')
  return `/placeholders/${systemCategory}/${variantStr}.webp`
}, [systemCategory, selectedVariant])

// Line 55-67: Hides selector if business is claimed
if (!isUnclaimed) {
  return <div>Claimed listings use real business photos</div>
}
```

---

### 3. API Route (Save Handler)
**File:** `app/api/admin/businesses/placeholder-variant/route.ts`  
**Lines:** 1-93

**What it does:**
- Validates admin has permission
- Checks business is in same franchise/city
- Verifies business status is 'unclaimed'
- Validates variant is 0, 1, or 2
- Updates `business_profiles.placeholder_variant` in database

**Security Checks:**
```typescript
// Line 52-55: Franchise scope check
if (business.franchise_id !== franchise.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Line 58-63: Only unclaimed businesses can use placeholders
if (business.status !== 'unclaimed') {
  return NextResponse.json(
    { error: 'Only unclaimed listings can use placeholder overrides.' },
    { status: 400 }
  )
}
```

---

## 🔄 COMPLETE DATA FLOW

```
1. User Action (Admin Dashboard):
   /admin → Click business → Files & Assets tab
   
2. UI Component:
   components/admin/comprehensive-business-crm-card.tsx (line 1145)
   ↓ Checks: business.status === 'unclaimed' && business.system_category
   ↓ Renders: <PlaceholderSelector />

3. Placeholder Selector:
   components/admin/placeholder-selector.tsx
   ↓ Shows: Preview image + dropdown (0, 1, 2)
   ↓ User: Selects variant and clicks "Save Placeholder"

4. API Call:
   POST /api/admin/businesses/placeholder-variant
   ↓ Body: { businessId, placeholderVariant }

5. API Route:
   app/api/admin/businesses/placeholder-variant/route.ts
   ↓ Validates: Admin permission, franchise scope, unclaimed status
   ↓ Updates: business_profiles.placeholder_variant = X

6. Database:
   business_profiles table
   ↓ Column: placeholder_variant (0, 1, or 2)

7. Refresh:
   window.location.reload()
   ↓ Reloads admin page with new placeholder

8. Display:
   Discover/Detail pages now show the selected variant
   ↓ getPlaceholderUrl() reads placeholder_variant from database
   ↓ Returns: /placeholders/{category}/{variant}.webp
```

---

## 🎯 KEY CONDITIONAL LOGIC

### Why It Might Not Show:

1. **Business Status Check** (Line 1145):
   ```typescript
   business.status === 'unclaimed'
   ```
   **If not 'unclaimed':** Selector doesn't render
   
   **Possible status values:**
   - 'incomplete' ❌
   - 'pending_review' ❌
   - 'approved' ❌
   - 'rejected' ❌
   - 'unclaimed' ✅
   - 'claimed' ❌
   - 'claimed_free' ❌

2. **System Category Check** (Line 1145):
   ```typescript
   business.system_category
   ```
   **If NULL or missing:** Selector doesn't render
   
   **Valid categories:**
   - 'restaurant' ✅
   - 'cafe' ✅
   - 'bar' ✅
   - 'barber' ✅
   - 'bakery' ✅
   - 'dessert' ✅
   - 'salon' ✅ (will use default)
   - NULL ❌

3. **TypeScript Interface** (types/billing.ts):
   ```typescript
   export interface BusinessCRMData {
     status: 'incomplete' | 'pending_review' | 'approved' | 'rejected' | 'unclaimed' | 'claimed' | 'claimed_free'
     system_category: string | null
     placeholder_variant: number | null
     // ... other fields
   }
   ```

---

## 🐛 DEBUGGING CHECKLIST

If placeholder selector is not showing:

### 1. Check Business Status
```sql
SELECT business_name, status, owner_user_id 
FROM business_profiles 
WHERE business_name = 'The Golden Spoon';
```

**Expected:**
- `status` = 'unclaimed'
- `owner_user_id` = NULL

**If wrong:**
```sql
UPDATE business_profiles 
SET status = 'unclaimed', owner_user_id = NULL 
WHERE business_name = 'The Golden Spoon';
```

### 2. Check System Category
```sql
SELECT business_name, system_category 
FROM business_profiles 
WHERE business_name = 'The Golden Spoon';
```

**Expected:**
- `system_category` = 'restaurant' (or any valid category, not NULL)

**If NULL:**
```sql
UPDATE business_profiles 
SET system_category = 'restaurant' 
WHERE business_name = 'The Golden Spoon';
```

### 3. Check TypeScript Interface
**File:** `types/billing.ts` (line 104+)

Verify interface includes:
```typescript
system_category: string | null
placeholder_variant: number | null
```

**If missing:** Restart dev server after adding

### 4. Check Data Fetch
**File:** `lib/actions/admin-crm-actions.ts`

Verify `.select('*')` includes system_category:
```typescript
const { data: businesses } = await supabaseAdmin
  .from('business_profiles')
  .select('*')  // Must include system_category
  .eq('city', city)
```

### 5. Browser DevTools
```javascript
// In admin dashboard, click on business
// Then in console:
console.log(business.status)          // Should be 'unclaimed'
console.log(business.system_category) // Should NOT be null
console.log(business.placeholder_variant) // Can be null (defaults to 0)
```

---

## 📝 TO ADD NEW PLACEHOLDER VARIANTS

Currently supports 3 variants (0, 1, 2). To add more:

### 1. Add Images
```bash
# Add 03.webp, 04.webp, etc.
public/placeholders/restaurant/03.webp
public/placeholders/cafe/03.webp
# ... for each category
```

### 2. Update Component
**File:** `components/admin/placeholder-selector.tsx` (Line 20-24)

```typescript
const VARIANTS = [
  { id: 0, label: 'Variant 00' },
  { id: 1, label: 'Variant 01' },
  { id: 2, label: 'Variant 02' },
  { id: 3, label: 'Variant 03' }, // Add new variants
  { id: 4, label: 'Variant 04' },
]
```

### 3. Update API Validation
**File:** `app/api/admin/businesses/placeholder-variant/route.ts` (Line 29)

```typescript
// Change from:
if (![0, 1, 2].includes(placeholderVariant)) {

// To:
if (![0, 1, 2, 3, 4].includes(placeholderVariant)) {
```

### 4. Update Database Constraint (Optional)
If you added a CHECK constraint to the database, update it:

```sql
ALTER TABLE business_profiles 
DROP CONSTRAINT IF EXISTS placeholder_variant_check;

ALTER TABLE business_profiles 
ADD CONSTRAINT placeholder_variant_check 
CHECK (placeholder_variant IS NULL OR (placeholder_variant >= 0 AND placeholder_variant <= 4));
```

---

## 🎨 TO CUSTOMIZE SELECTOR UI

### Change Preview Size
**File:** `components/admin/placeholder-selector.tsx` (Line 87-91)

```typescript
<img
  src={previewUrl}
  className="h-16 w-24"  // Change dimensions here
/>
```

### Change Dropdown Style
**File:** `components/admin/placeholder-selector.tsx` (Line 106-111)

```typescript
<select
  className="w-full rounded-md bg-slate-800 ..."
  // Modify Tailwind classes
>
```

### Change Save Button
**File:** `components/admin/placeholder-selector.tsx` (Line 124-131)

```typescript
<Button
  size="sm"        // Change size: xs, sm, md, lg
  variant="default" // Change variant if needed
>
```

---

## 📚 RELATED FILES

### Placeholder Image Generation:
- `lib/placeholders/getPlaceholderImage.ts` - URL generation logic
- `lib/placeholders/getPlaceholderClass.ts` - CSS style variants
- `lib/utils/resolve-system-category.ts` - Category resolution helper

### UI Components:
- `components/ui/simple-placeholder-image.tsx` - Renders placeholders
- `components/ui/business-card-image.tsx` - Business card images

### Debug/Test:
- `app/dev/placeholders/page.tsx` - Debug page to preview all placeholders

---

## 🔍 QUICK SEARCH COMMANDS

Find all placeholder selector references:
```bash
grep -r "PlaceholderSelector" components/
grep -r "placeholder-variant" app/
grep -r "placeholder_variant" lib/
```

Find conditional rendering:
```bash
grep -rn "status === 'unclaimed'" components/admin/
grep -rn "system_category" components/admin/
```

---

**Summary:** The placeholder selector lives in the Files & Assets tab of the comprehensive business CRM card, only shows for unclaimed businesses with a system_category, and updates via a secure admin-only API route.

