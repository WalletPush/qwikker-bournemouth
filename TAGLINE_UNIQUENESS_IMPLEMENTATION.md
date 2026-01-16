# Tagline Uniqueness & Category Display Fix

## Problem Statement

1. **Duplicate taglines make the platform look like AI-generated slop**
   - Multiple bakeries with "Fresh bakes, warm welcomes"
   - No differentiation between similar businesses
   
2. **Wrong category labels showing on Discover cards**
   - Showing system_category ("bakery") instead of display_category ("Patisserie")
   - Users see internal classifications instead of human-friendly labels

---

## Solution Architecture

### 1. Three-Layer Tagline Uniqueness Strategy

#### **Layer A: Smarter Generation (Variety + Differentiation)**

**Current (BAD):**
```typescript
// All bakeries get same generic line
"Fresh bakes, warm welcomes"
```

**New (GOOD):**
```typescript
// Template + Differentiator + Variation
"Fresh bakes, daily on Christchurch Rd"        // Location-based
"Pastries worth the detour, near Lansdowne"    // Neighborhood-based
"Croissants, cakes, and good vibes, from 7am"  // Offering-based
"Small-batch bakes, big comfort"               // Style-based
```

**Differentiators to Use:**
- Street name (if available and not too long)
- Neighborhood/area
- Cuisine type (for restaurants)
- Signature items (from Google types)
- Time-based ("from 7am", "late night")
- Style keywords ("family-run", "modern", "traditional")

#### **Layer B: Runtime Uniqueness Check (Retry Loop)**

```typescript
async function generateUniqueTagline(
  businessId: string,
  businessName: string,
  systemCategory: SystemCategory,
  city: string,
  displayCategory: string,
  businessAddress?: string
): Promise<string> {
  const maxRetries = 12
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Generate tagline with attempt number for variation
    const tagline = generateTagline(
      businessId,
      businessName,
      systemCategory,
      city,
      displayCategory,
      businessAddress,
      attempt // Use attempt number to get different variations
    )
    
    // Normalize for collision detection
    const normalized = normalizeTagline(tagline)
    
    // Check for duplicates in the same city
    const { data: existing } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('city', city.toLowerCase())
      .eq('tagline_normalized', normalized)
      .limit(1)
    
    if (!existing || existing.length === 0) {
      return tagline // Unique! Use it
    }
    
    // Collision detected, retry with different variation
    console.log(`⚠️ Tagline collision attempt ${attempt + 1}: "${tagline}"`)
  }
  
  // Fallback: Always unique (location-based)
  const area = extractArea(businessAddress)
  return `${getGenericPrefix(systemCategory)} in ${area || city}`
}

function normalizeTagline(tagline: string): string {
  return tagline
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim()
}
```

#### **Layer C: Database Safety Net (Strongest)**

```sql
-- Add normalized tagline column
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS tagline_normalized TEXT;

-- Create unique index scoped to city
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tagline_per_city 
ON business_profiles(city, tagline_normalized) 
WHERE tagline_normalized IS NOT NULL;

-- Add comment
COMMENT ON COLUMN business_profiles.tagline_normalized IS 
'Lowercase, punctuation-stripped version of business_tagline for uniqueness enforcement within a city';
```

**Why per-city scope?**
- ✅ Prevents "Fresh bakes in Bournemouth" appearing twice in Bournemouth
- ✅ Allows same tagline in different cities (reasonable)
- ✅ Scales better than global uniqueness

---

### 2. Fix Category Display on Discover Cards

**Current Code (WRONG):**
```typescript
// Showing internal system_category
<p className="text-slate-400">{business.system_category}</p>
// Result: "bakery", "restaurant", "cafe" (boring, internal)
```

**Fixed Code (CORRECT):**
```typescript
// Show human-friendly display_category
<p className="text-slate-400">{business.display_category || business.business_category || 'Local business'}</p>
// Result: "Artisan Patisserie", "Italian Restaurant", "Cocktail Bar" (specific, Google-sourced)
```

**Priority Cascade:**
1. `admin_display_category_override` (if admin manually set it)
2. `display_category` (Google's human-readable label)
3. `business_category` (legacy fallback)
4. `'Local business'` (final fallback)

---

### 3. Admin Override Fields (Reversible Control)

**New Columns to Add:**

```sql
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS admin_system_category_override TEXT,
ADD COLUMN IF NOT EXISTS admin_display_category_override TEXT,
ADD COLUMN IF NOT EXISTS admin_placeholder_variant_override INT CHECK (admin_placeholder_variant_override IN (0, 1, 2)),
ADD COLUMN IF NOT EXISTS admin_notes_category TEXT;

-- Comments for clarity
COMMENT ON COLUMN business_profiles.admin_system_category_override IS 
'Admin-selected system category override (e.g., change "restaurant" to "bar")';

COMMENT ON COLUMN business_profiles.admin_display_category_override IS 
'Admin-selected display label override (rare, for incorrect Google labels)';

COMMENT ON COLUMN business_profiles.admin_placeholder_variant_override IS 
'Admin-selected placeholder image variant (0, 1, or 2)';

COMMENT ON COLUMN business_profiles.admin_notes_category IS 
'Admin notes explaining why category was overridden';
```

**Effective Value Logic:**

```typescript
// In code, always use "effective" values
const effectiveSystemCategory = 
  business.admin_system_category_override ?? 
  business.system_category

const effectiveDisplayCategory = 
  business.admin_display_category_override ?? 
  business.display_category ?? 
  business.business_category

const effectivePlaceholderVariant = 
  business.admin_placeholder_variant_override ?? 
  business.placeholder_variant ?? 
  0
```

---

## Implementation Steps

### **Step 1: Database Migration (5 min)**

Run this SQL in Supabase:

```sql
-- Add normalized tagline column
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS tagline_normalized TEXT;

-- Add admin override columns
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS admin_system_category_override TEXT,
ADD COLUMN IF NOT EXISTS admin_display_category_override TEXT,
ADD COLUMN IF NOT EXISTS admin_placeholder_variant_override INT 
  CHECK (admin_placeholder_variant_override IN (0, 1, 2)),
ADD COLUMN IF NOT EXISTS admin_notes_category TEXT;

-- Create unique index for tagline per city
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tagline_per_city 
ON business_profiles(city, tagline_normalized) 
WHERE tagline_normalized IS NOT NULL;

-- Backfill normalized taglines for existing businesses
UPDATE business_profiles
SET tagline_normalized = LOWER(REGEXP_REPLACE(business_tagline, '[^\w\s]', '', 'g'))
WHERE business_tagline IS NOT NULL 
  AND tagline_normalized IS NULL;
```

### **Step 2: Update Tagline Generator (15 min)**

Create `lib/import/tagline-generator-unique.ts`:
- Implement retry loop with uniqueness checking
- Add differentiators (street, area, cuisine, style)
- Use attempt number for variation
- Fallback to location-based format

### **Step 3: Fix Discover Card Display (2 min)**

Update `components/user/business-card.tsx`:
```typescript
// OLD
<p className="text-slate-400">{business.system_category}</p>

// NEW
<p className="text-slate-400">
  {business.admin_display_category_override || 
   business.display_category || 
   business.business_category || 
   'Local business'}
</p>
```

### **Step 4: Add Admin Category Override UI (30 min)**

In CRM modal "Business Controls" tab:
- Show current system_category + why it was chosen
- Dropdown to override system_category (with live placeholder preview)
- Text input to override display_category (rare, for wrong Google labels)
- Show effective values after overrides
- Save to `admin_*_override` columns

### **Step 5: Admin Duplicate Detection Tool (15 min)**

Add to admin dashboard:
```sql
-- Find duplicate taglines in a city
SELECT 
  tagline_normalized,
  COUNT(*) as duplicate_count,
  STRING_AGG(business_name, ', ' ORDER BY business_name) as businesses
FROM business_profiles
WHERE city = 'bournemouth'
  AND tagline_normalized IS NOT NULL
GROUP BY tagline_normalized
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

Button: "Regenerate all duplicate taglines" → runs uniqueness check for each

---

## Testing Checklist

- [ ] Import 5+ bakeries in same city → all have unique taglines
- [ ] Discover card shows "Artisan Patisserie" not "bakery"
- [ ] Admin can override system_category → placeholder changes
- [ ] Admin can override display_category → card label changes
- [ ] Tagline collision prevented by database constraint
- [ ] Effective values prioritize overrides correctly

---

## Files to Modify

1. **Database:**
   - Add migration: `supabase/migrations/YYYYMMDD_add_tagline_uniqueness.sql`

2. **Tagline Generation:**
   - Update: `lib/import/tagline-generator.ts`
   - Add uniqueness check with retry loop
   - Add differentiators (street, area, style)

3. **Import Route:**
   - Update: `app/api/admin/import-businesses/import/route.ts`
   - Use new `generateUniqueTagline()` function
   - Save `tagline_normalized`

4. **Discover Card:**
   - Update: `components/user/business-card.tsx`
   - Change to `display_category` instead of `system_category`

5. **Admin CRM:**
   - Update: `components/admin/comprehensive-business-crm-card.tsx`
   - Add category override controls
   - Show effective values

6. **Admin Tools:**
   - Add: Duplicate tagline detection page
   - Add: Bulk regenerate button

---

## Success Metrics

✅ **Zero duplicate taglines within a city**
✅ **Discover cards show specific, human-friendly categories**
✅ **Admin has full control without breaking Google data**
✅ **Database enforces uniqueness automatically**

---

## Future Enhancements

- Add tagline quality scoring (avoid generic phrases)
- A/B test different tagline styles
- Allow businesses to suggest their own tagline during claim
- Track which taglines get more clicks in Discover
