# Placeholder Image System Guide

## Current Status

### ✅ Categories WITH Placeholders (3 variants each)
- `restaurant` → 00.webp, 01.webp, 02.webp
- `cafe` → 00.webp, 01.webp, 02.webp
- `bakery` → 00.webp, 01.webp, 02.webp
- `bar` → 00.webp, 01.webp, 02.webp
- `dessert` → 00.webp, 01.webp, 02.webp
- `barber` → 00.webp, 01.webp, 02.webp
- `default` → 00.webp (fallback)

### ❌ Categories MISSING Placeholders
- `pub` (uses `bar` or `default` fallback)
- `takeaway` (uses `restaurant` or `default` fallback)
- `fast_food` (uses `restaurant` or `default` fallback)
- `salon` (uses `barber` or `default` fallback)
- `tattoo` (NO fallback - needs images!)
- `wellness` (NO fallback - needs images!)
- `retail` (NO fallback - needs images!)
- `fitness` (NO fallback - needs images!)
- `sports` (NO fallback - needs images!)
- `hotel` (NO fallback - needs images!)
- `venue` (NO fallback - needs images!)
- `entertainment` (NO fallback - needs images!)
- `professional` (NO fallback - needs images!)
- `other` (uses `default`)

---

## File Structure & Naming Convention

```
public/placeholders/
├── restaurant/
│   ├── 00.webp  ← Default variant (REQUIRED)
│   ├── 01.webp  ← Variant 1
│   ├── 02.webp  ← Variant 2
│   ├── 03.webp  ← Variant 3 (NEW)
│   └── 04.webp  ← Variant 4 (NEW)
├── cafe/
│   ├── 00.webp
│   ├── 01.webp
│   └── 02.webp
└── [category]/
    ├── 00.webp  ← ALWAYS create 00 first
    ├── 01.webp
    └── ...
```

### Naming Rules
✅ **DO:**
- Use lowercase category names (match `system_category` exactly)
- Use 2-digit zero-padded numbers: `00.webp`, `01.webp`, `02.webp`, `03.webp`, etc.
- Always create `00.webp` first (it's the default)
- Use `.webp` format (optimized for web)

❌ **DON'T:**
- Use uppercase: ~~`Restaurant/00.webp`~~
- Skip zero-padding: ~~`0.webp`~~, ~~`1.webp`~~
- Use other formats: ~~`.jpg`~~, ~~`.png`~~ (unless you want to add fallback support)
- Create gaps: If you have `00`, `01`, `02`, the next should be `03` (not `05`)

---

## Recommended Expansion Plan

### Phase 1: Add MORE variants to existing categories (HIGH PRIORITY)
**Goal:** Give variety to the most common categories

```
public/placeholders/
├── restaurant/
│   ├── 00.webp  ✅ Exists
│   ├── 01.webp  ✅ Exists
│   ├── 02.webp  ✅ Exists
│   ├── 03.webp  🆕 ADD (Italian/pasta vibe)
│   ├── 04.webp  🆕 ADD (Asian/sushi vibe)
│   ├── 05.webp  🆕 ADD (Fine dining vibe)
│   └── 06.webp  🆕 ADD (Casual dining vibe)
│
├── cafe/
│   ├── 00.webp  ✅ Exists
│   ├── 01.webp  ✅ Exists
│   ├── 02.webp  ✅ Exists
│   ├── 03.webp  🆕 ADD (Modern minimal vibe)
│   ├── 04.webp  🆕 ADD (Cozy corner vibe)
│   └── 05.webp  🆕 ADD (Outdoor seating vibe)
│
├── bar/
│   ├── 00.webp  ✅ Exists
│   ├── 01.webp  ✅ Exists
│   ├── 02.webp  ✅ Exists
│   ├── 03.webp  🆕 ADD (Cocktail bar vibe)
│   ├── 04.webp  🆕 ADD (Wine bar vibe)
│   └── 05.webp  🆕 ADD (Sports bar vibe)
```

### Phase 2: Add NEW categories (MEDIUM PRIORITY)
**Categories to add next (based on common Google Place types):**

```
public/placeholders/
├── pub/          🆕 NEW FOLDER
│   ├── 00.webp  (Classic British pub)
│   ├── 01.webp  (Gastropub)
│   └── 02.webp  (Beer garden)
│
├── takeaway/     🆕 NEW FOLDER
│   ├── 00.webp  (Generic takeaway counter)
│   ├── 01.webp  (Street food vibe)
│   └── 02.webp  (Food truck vibe)
│
├── fast_food/    🆕 NEW FOLDER
│   ├── 00.webp  (Generic fast food)
│   ├── 01.webp  (Burgers)
│   └── 02.webp  (Pizza)
│
├── salon/        🆕 NEW FOLDER
│   ├── 00.webp  (Beauty salon)
│   ├── 01.webp  (Spa vibe)
│   └── 02.webp  (Nail salon)
│
├── tattoo/       🆕 NEW FOLDER (HIGH PRIORITY - no fallback!)
│   ├── 00.webp  (Tattoo studio)
│   ├── 01.webp  (Piercing studio)
│   └── 02.webp  (Art/flash sheets vibe)
│
├── wellness/     🆕 NEW FOLDER (HIGH PRIORITY - no fallback!)
│   ├── 00.webp  (Massage/spa)
│   ├── 01.webp  (Yoga/pilates)
│   └── 02.webp  (Physio/therapy)
```

### Phase 3: Service businesses (LOWER PRIORITY)
```
public/placeholders/
├── fitness/      🆕 NEW FOLDER
│   ├── 00.webp  (Gym equipment)
│   ├── 01.webp  (Yoga studio)
│   └── 02.webp  (Personal training)
│
├── retail/       🆕 NEW FOLDER
│   ├── 00.webp  (Shop interior)
│   ├── 01.webp  (Boutique vibe)
│   └── 02.webp  (Gift shop)
│
├── hotel/        🆕 NEW FOLDER
│   ├── 00.webp  (Hotel lobby)
│   ├── 01.webp  (Hotel room)
│   └── 02.webp  (B&B exterior)
│
├── venue/        🆕 NEW FOLDER
│   ├── 00.webp  (Event space)
│   ├── 01.webp  (Wedding venue)
│   └── 02.webp  (Conference room)
```

---

## How to Add Placeholders

### Step 1: Create the folder
```bash
mkdir -p public/placeholders/[category]
```

Example:
```bash
mkdir -p public/placeholders/tattoo
```

### Step 2: Add images in order
1. **ALWAYS start with `00.webp`** (the default)
2. Then add `01.webp`, `02.webp`, etc.

### Step 3: Update the variant count in code
**File:** `components/admin/placeholder-selector.tsx`

```typescript
// Current: Only 3 variants (00, 01, 02)
const VARIANTS = [
  { id: 0, label: 'Variant 00' },
  { id: 1, label: 'Variant 01' },
  { id: 2, label: 'Variant 02' },
]

// NEW: Add more variants
const VARIANTS = [
  { id: 0, label: 'Variant 00' },
  { id: 1, label: 'Variant 01' },
  { id: 2, label: 'Variant 02' },
  { id: 3, label: 'Variant 03' },  // 🆕
  { id: 4, label: 'Variant 04' },  // 🆕
  { id: 5, label: 'Variant 05' },  // 🆕
  { id: 6, label: 'Variant 06' },  // 🆕
]

// Update the helper text too:
<p className="text-xs text-slate-400">
  7 variants available (00-06)  {/* Update this */}
</p>
```

### Step 4: Test
1. Go to Admin → Unclaimed Listings
2. Select a business with the new category
3. Open "Placeholder Selector"
4. Verify all variants show in the dropdown
5. Change variant and save
6. Check Discover page to see the new image

---

## Image Guidelines

### Technical Requirements
- **Format:** `.webp` (optimized for web, smaller file size)
- **Size:** 1200x800px (3:2 aspect ratio) or 1600x900px (16:9)
- **File size:** < 150KB per image (ideally < 100KB)
- **Quality:** 80-85% WebP quality

### Content Guidelines
✅ **DO:**
- Use generic, representative images
- Show atmosphere/vibe
- Keep it professional
- Show empty spaces/products (not people)
- Use diverse styles for variants

❌ **DON'T:**
- Show specific brands/logos
- Use copyrighted images without permission
- Show recognizable people's faces
- Show specific dishes (e.g., "Margherita pizza" - too specific)
- Use stock photos with watermarks

### Variant Strategy
- **Variant 00:** Generic/safe/professional
- **Variant 01:** Slightly different angle/vibe
- **Variant 02:** Different aesthetic (modern vs rustic, etc.)
- **Variant 03+:** More specific sub-categories or moods

**Example for `restaurant`:**
- `00.webp` → Generic restaurant interior
- `01.webp` → Fine dining vibe
- `02.webp` → Casual dining vibe
- `03.webp` → Italian/Mediterranean vibe
- `04.webp` → Asian/sushi vibe
- `05.webp` → Outdoor terrace vibe
- `06.webp` → Modern/minimal vibe

---

## Priority Order (Recommended)

1. **🔥 URGENT:** Add `tattoo`, `wellness`, `fitness` (no fallbacks!)
2. **📈 HIGH:** Add more variants to `restaurant`, `cafe`, `bar` (most common)
3. **🎯 MEDIUM:** Add `pub`, `takeaway`, `fast_food`, `salon`
4. **📦 LOW:** Add `retail`, `hotel`, `venue`, `entertainment`, `professional`

---

## Fallback Logic (Current)

**File:** `lib/placeholders/getPlaceholderImage.ts`

If a category doesn't have images, it falls back to:
1. Check for exact match: `/placeholders/[category]/[variant].webp`
2. If not found → fallback to `/placeholders/default/00.webp`

To avoid the generic default for specific categories, you MUST create their folders.

---

## Quick Commands

```bash
# Create all missing category folders at once
mkdir -p public/placeholders/{pub,takeaway,fast_food,salon,tattoo,wellness,retail,fitness,sports,hotel,venue,entertainment,professional}

# Check what exists
ls -la public/placeholders/

# Count variants per category
for dir in public/placeholders/*/; do echo "$(basename "$dir"): $(ls "$dir" | wc -l) variants"; done
```

---

## Summary

**CURRENT STATE:**
- 7 categories with 3 variants each = 21 images
- 13 categories with NO placeholders

**RECOMMENDED EXPANSION:**
- Add 3-4 more variants to existing categories (7 × 4 = 28 new images)
- Add 3 variants to 5 priority categories (5 × 3 = 15 new images)
- **Total new images needed:** ~40-50

**THIS WILL:**
- Give variety to common categories (restaurant, cafe, bar)
- Cover critical missing categories (tattoo, wellness, fitness)
- Make imported/unclaimed businesses look more professional
