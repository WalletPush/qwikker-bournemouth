# Import Tool Image System Guide

**How images work for imported businesses**

---

## 🚨 **CRITICAL SAFETY RULE (Read First)**

**For ALL food-adjacent categories (restaurant/takeaway/fast_food/dessert/pizza/bakery/pub):**

❌ **NO identifiable food items**  
❌ **NO meat/fish/dairy imagery**  
❌ **NO branded packaging**

✅ **USE environmental/abstract scenes ONLY** (table setting, lighting, textures, cutlery, bokeh)

**Reason:** Placeholder images appear on unclaimed listings and **MUST NOT** misrepresent dietary/cultural offerings (e.g., vegan restaurant showing steak).

---

## 🎨 **SEMANTIC VARIANT GROUPING (Multi-Type Categories)**

**For categories that encompass multiple distinct business types (e.g., salon, retail, venue):**

### **Problem:**
- `salon` category includes: hair salons, nail salons, spas, beauty salons
- A single "default" placeholder (e.g., hair styling tools) misrepresents nail salons and spas

### **Solution: Semantic Variant Groups**
```
Variants 0-2: NEUTRAL (auto-assigned to unclaimed)
  ✅ Safe for ALL business types in this category
  ✅ Abstract, environmental, non-specific

Variants 3+: SPECIFIC (admin-only, manual selection)
  ⚠️ Only selected by admin after verification
  ⚠️ Clearly labeled by type (e.g., "HAIR", "NAILS", "SPA")
```

### **Example: Salon / Spa Category**
```
{ id: 0, description: '🔒 NEUTRAL: White towels and spa setting (safe for all)' }
{ id: 1, description: '🔒 NEUTRAL: Soft fabric texture (safe for all)' }
{ id: 2, description: '🔒 NEUTRAL: Cream/product texture (safe for all)' }

{ id: 3, description: '💇 HAIR: Scissors and styling tools' }
{ id: 4, description: '💇 HAIR: Brushes and combs' }
{ id: 5, description: '💇 HAIR: Hair product bottles' }

{ id: 6, description: '💅 NAILS: Nail polish bottles' }
{ id: 7, description: '💅 NAILS: Nail tools and files' }
{ id: 8, description: '💅 NAILS: Manicure station' }

{ id: 9, description: '🧘 SPA: Massage stones and candles' }
{ id: 10, description: '🧘 SPA: Essential oils and diffuser' }

unclaimedMaxVariantId: 2  // 🔒 Only variants 0-2 allowed for unclaimed
```

### **Key Points:**
- **Auto-assigned (imported businesses):** Always use variant 0-2 (neutral)
- **Admin-controlled (verified businesses):** Can select variants 3+ if appropriate
- **Claim flow:** Business must upload real images, placeholder becomes irrelevant
- **Admin UI:** Group variants by type for easy selection (NEUTRAL / HAIR / NAILS / SPA)

### **Other categories that might need semantic grouping:**
- `retail` → clothing, gifts, jewelry, home goods
- `venue` → wedding venue, concert hall, theater, sports arena
- `entertainment` → arcade, cinema, bowling, escape room

---

## 🔍 **Quick Reference**

### **What the resolver expects:**
```
Path: /public/placeholders/{system_category}/{category}-abstract-{id}.v1.webp

Examples:
/public/placeholders/restaurant/restaurant-abstract-00.v1.webp ✅
/public/placeholders/cafe/cafe-abstract-00.v1.webp ✅
/public/placeholders/fast_food/fast_food-abstract-00.v1.webp ✅
```

### **Minimum requirements per category:**
```
1 file: {category}-abstract-00.v1.webp (neutral default)
Size: 1200×675px, 40-120KB, WebP, quality 78-85%
Style: Dark, moody, abstract (NO readable text, NO faces)
Safety: Environmental/texture ONLY for food categories
```

---

## 🎯 **Overview**

When you import businesses from Google Places:
- ❌ **We DO NOT download or store Google images** (violates their terms + expensive)
- ✅ **We DO use placeholder images** until business claims their listing
- ✅ **Business uploads real images** when they claim (via Cloudinary)

---

## 📸 **How It Works (Lifecycle)**

### **1. Import (Google Places API)**
```
Business imported → status = 'unclaimed' → placeholder image assigned
```

**What we store:**
- Business name, address, phone, hours, rating, etc. ✅
- Google Place ID (for reference) ✅
- Category (restaurant, cafe, bar, etc.) ✅
- **NO images stored** ❌

**What displays:**
- Placeholder image based on `system_category`
- Selected variant determined by hash of `google_place_id`

---

### **2. Claim Flow**
```
Business owner claims → uploads logo + hero image → status = 'claimed_free'
```

**Required:**
- At least 1 real image (logo OR hero)
- **Policy enforcement:** Admin approval endpoint checks for uploaded images before approval
- **Recommended:** Require at least one uploaded image before admin can approve claim

**What displays:**
- Owner-uploaded images from Cloudinary ✅
- Placeholder images hidden ✅

**Note:** Image requirement is enforced server-side in `app/api/admin/approve-claim/route.ts`

---

### **3. Upgrade**
```
Business upgrades → status = 'approved' / 'free_trial' / 'paid'
```

**What displays:**
- Owner-uploaded images (same as claimed_free)
- No change to image system

---

## 🖼️ **Placeholder Image System**

### **Purpose**
- Populate Discover page with unclaimed businesses
- Look premium (not broken/empty)
- **Generic enough to avoid misrepresentation**
- Category-specific but **neutral** (no specific cuisine/products)

---

## 📁 **File Structure**

```
/public/placeholders/
├── restaurant/
│   ├── restaurant-abstract-00.v1.webp (neutral default)
│   ├── restaurant-abstract-01.v1.webp
│   ├── restaurant-abstract-02.v1.webp
│   └── ... (up to 10 variants per category)
├── cafe/
│   ├── cafe-abstract-00.v1.webp
│   ├── cafe-abstract-01.v1.webp
│   └── ...
├── bar/
│   ├── bar-abstract-00.v1.webp
│   ├── bar-abstract-01.v1.webp
│   └── ...
├── takeaway/
│   ├── takeaway-abstract-00.v1.webp
│   └── ...
├── dessert/
│   ├── dessert-abstract-00.v1.webp
│   └── ...
├── salon/
│   ├── salon-abstract-00.v1.webp
│   └── ...
├── barber/
│   ├── barber-abstract-00.v1.webp
│   └── ...
├── tattoo/
│   ├── tattoo-abstract-00.v1.webp
│   └── ...
├── retail/
│   ├── retail-abstract-00.v1.webp
│   └── ...
├── fitness/
│   ├── fitness-abstract-00.v1.webp
│   └── ...
├── hotel/
│   ├── hotel-abstract-00.v1.webp
│   └── ...
├── venue/
│   ├── venue-abstract-00.v1.webp
│   └── ...
├── entertainment/
│   ├── entertainment-abstract-00.v1.webp
│   └── ...
└── other/
    ├── other-abstract-00.v1.webp
    └── ...
```

---

## 🔍 **Placeholder Resolver Logic**

### **How the system finds images:**

```typescript
// Expected path format:
/placeholders/{system_category}/{category}-abstract-{id}.v{version}.webp

// Examples:
/placeholders/restaurant/restaurant-abstract-00.v1.webp ✅
/placeholders/cafe/cafe-abstract-01.v1.webp ✅
/placeholders/fast_food/fast_food-abstract-00.v1.webp ✅
```

### **Critical requirements:**
1. **Folder name** = `system_category` enum value (exact match, lowercase, underscores for multi-word)
2. **Filename** = `{category}-abstract-{id}.v1.webp` (category matches folder name)
3. **Variant 00** = MUST exist for every category (required fallback)

---

### **Fallback Behavior (Important)**

**If category folder missing:**
```
restaurant missing → falls back to /other/other-abstract-00.v1.webp
```

**If requested variant missing:**
```
restaurant-abstract-05 missing → falls back to restaurant-abstract-00.v1.webp
```

**If variant 00 missing:**
```
restaurant-abstract-00 missing → falls back to first available variant (array index 0)
```

**Never 404 an image on Discover**
- System always returns a valid image path
- Broken images = bad UX (looks unprofessional)
- Always provide fallback to `other` category

---

### **Category Folder Naming (EXACT MATCH REQUIRED)**

Your folder names MUST match your `SystemCategory` enum values exactly:

```
Enum Value       → Folder Name
──────────────────────────────────
restaurant       → restaurant/
cafe             → cafe/
bar              → bar/
fast_food        → fast_food/     ← Note: underscore!
coffee_shop      → coffee_shop/   ← If enum has underscore
salon            → salon/
barber           → barber/
other            → other/
```

**Common mistakes:**
- ❌ `fast-food/` (hyphen instead of underscore)
- ❌ `FastFood/` (wrong case)
- ❌ `fast food/` (space not allowed)
- ✅ `fast_food/` (matches enum exactly)

---

## 📝 **File Naming Rules**

### **Format**
```
{category}-abstract-{id}.v{version}.webp
```

### **Examples**
```
restaurant-abstract-00.v1.webp  ← Variant 0 (neutral default)
restaurant-abstract-01.v1.webp  ← Variant 1
restaurant-abstract-02.v1.webp  ← Variant 2
cafe-abstract-00.v1.webp        ← Cafe neutral default
bar-abstract-00.v1.webp         ← Bar neutral default
```

### **Rules**
1. ✅ **Category name** = `system_category` enum value (lowercase, underscore for multi-word)
   - `restaurant`, `cafe`, `bar`, `takeaway`, `fast_food`, `salon`, etc.
2. ✅ **`abstract`** = Required keyword (indicates it's a placeholder, not real venue)
3. ✅ **ID** = Two-digit number (00-99, but typically 00-10)
   - `00` = ALWAYS the neutral/safe default
   - `01-10` = Variants (optional, for visual variety)
4. ✅ **Version** = `v1`, `v2`, etc. (for cache-busting if you replace images)
5. ✅ **Format** = `.webp` (best quality/size ratio)

---

## 🎨 **Variant System**

### **Variant 0 (Required)**
```
restaurant-abstract-00.v1.webp
```

**Rules:**
- ✅ **MUST exist for every category**
- ✅ **MUST be neutral** (no specific cuisine/product/style)
- ✅ **Used for ALL unclaimed imports by default**
- ✅ **Safe for any business in that category**

**Examples:**
- Restaurant: Generic plated food, table setting, neutral textures
- Cafe: Coffee beans, abstract coffee textures, neutral cup
- Bar: Backlit bottles (no labels), glass reflections, abstract lighting
- Salon: Scissors, combs, brushes (no people, no branded products)

---

### **Variants 1-10 (Optional)**
```
restaurant-abstract-01.v1.webp
restaurant-abstract-02.v1.webp
...
```

**Purpose:**
- Visual variety (avoid repetition in grids)
- Selected **deterministically** based on `google_place_id` hash
- Still **neutral** (not cuisine-specific)

**How selection works:**
```typescript
// Deterministic hash-based selection
const hash = hashString(business.google_place_id)
const variantId = hash % numberOfVariants
// Example: hash = 1234 → 1234 % 10 = 4 → variant 04
```

**Result:**
- Same business always shows same variant
- Different businesses show different variants
- Grid of 10 restaurants = 10 different images (if 10 variants exist)

---

## 🚨 **SAFETY RULES (NON-NEGOTIABLE)**

### **🔥 CRITICAL: NO FOOD IMAGERY FOR FOOD-ADJACENT CATEGORIES**

For these categories, **BAN ALL identifiable food/drink imagery**:
- `restaurant`
- `takeaway`
- `fast_food`
- `dessert`
- `pizza`
- `bakery`
- `pub` (food side)
- Any cuisine-adjacent category

**Reason:** Placeholder images appear on unclaimed listings and **MUST NOT misrepresent dietary/cultural offerings**.

❌ **ABSOLUTELY FORBIDDEN:**
- Meat, fish, dairy imagery (e.g., steak, salmon, burger)
- Specific cuisine items (e.g., sushi, pasta, tacos, pizza)
- Identifiable dishes or drinks
- Branded packaging or products
- People/faces (AI artifacts + privacy issues)
- Readable text (menus, signs, labels)

✅ **SAFE FOR RESTAURANT CATEGORIES:**
- Table setting / cutlery / napkin / **empty plate**
- Warm bokeh lights in generic dining space (no branding)
- Textured wood table + candle glow
- Service bell / "pass" window (macro, no context)
- Menu paper texture (no readable text)
- Abstract glass reflections (no identifiable drink type)
- Silverware patterns / napkin folds
- Dark lighting / atmospheric textures

✅ **SAFE FOR BAR/PUB:**
- Backlit bottles (no labels visible)
- Beer taps (no branding)
- Glass textures / ice / condensation
- Wooden bar counter texture
- Abstract nightlife lighting
- **NO identifiable cocktails or beer styles**

---

### **Variant Selection Logic**

**How it actually works:**
```typescript
// Unclaimed businesses: HASH-BASED selection (for grid variety)
const variantId = hash(google_place_id) % (unclaimedMaxVariantId + 1)

// Example: hash = 1234 → 1234 % 9 = 6 → uses variant 06
```

**CRITICAL IMPLICATION:**
- Unclaimed businesses do NOT always use variant 0
- They hash into variants 0 through `unclaimedMaxVariantId`
- **EVERY VARIANT (0-10) MUST be neutral/safe**

**If you want grid variety:**
- ✅ Create 10 variants per category
- ✅ **ALL must follow the no-food rule** (table settings, lighting, textures)
- ✅ Variety comes from different angles/compositions, NOT different food items

**If you want absolute safety:**
- ✅ Set `unclaimedMaxVariantId: 0` in code
- ✅ All unclaimed businesses use variant 00 only
- ✅ Variants 1-10 become admin-only override options

---

### **Admin Override**
Admins CAN manually select specific variants for unclaimed businesses:
- ⚠️ **Manual action only** (explicit selection in CRM)
- ⚠️ **Admin responsibility** (must ensure no misrepresentation)
- ⚠️ **UI shows confirmation** before allowing override

---

## 📏 **Image Specifications**

### **Dimensions**
```
Width: 1200px (required)
Height: 675px (16:9 aspect ratio)
```

**Why 16:9?**
- Matches most card layouts
- Works well in grids
- Standard for hero images
- Consistent across all categories

---

### **File Size & Format**
```
Format: WebP only
Target: 40-120KB per image
Max: 200KB
Quality: 78-85% (sweet spot)
```

**Compression tips:**
- Use WebP (better compression than JPEG/PNG)
- Quality 78-85% is the sweet spot
- Avoid complex gradients (compress poorly)
- Solid colors and textures compress best

---

### **Style Guidelines (CRITICAL)**
```
Theme: Dark, moody, premium, soft
Colors: Muted, neutral tones
Lighting: Soft, ambient, shallow depth of field
Focus: Abstract details, NOT full scenes
Grain: Subtle grain adds premium feel
Sharpness: Slightly soft (feels premium, less literal)
```

**Additional rules:**
- ❌ **NO readable text** (menus, signs, labels, packaging)
- ❌ **NO faces/people** (avoids AI artifacts + privacy concerns)
- ❌ **NO branded products** (avoid trademark issues)
- ✅ **Shallow depth of field** (keeps images "soft" and premium)
- ✅ **Visually ambiguous** (texture over context)

**Examples:**
- Restaurant: Empty table setting, bokeh candle glow, dark wood grain, silverware macro
- Cafe: Abstract coffee steam, dark counter texture, ceramic detail (no identifiable cup)
- Bar: Backlit bottles (no labels), ice texture, glass reflections (no drink type)

---

## 🔧 **How to Add New Placeholders**

### **Step 1: Create Images**
1. Generate or source images (AI, stock, photographer)
2. Ensure they follow safety rules (neutral, no misrepresentation)
3. Resize to 1200×675px
4. Convert to WebP format
5. Optimize to 40-120KB

---

### **Step 2: Name Files Correctly**
```bash
# Neutral default (REQUIRED)
restaurant-abstract-00.v1.webp

# Optional variants
restaurant-abstract-01.v1.webp
restaurant-abstract-02.v1.webp
restaurant-abstract-03.v1.webp
```

---

### **Step 3: Place in Correct Folder**
```
/public/placeholders/restaurant/restaurant-abstract-00.v1.webp
/public/placeholders/cafe/cafe-abstract-00.v1.webp
/public/placeholders/bar/bar-abstract-00.v1.webp
```

**Path format:**
```
/public/placeholders/{system_category}/{filename}
```

---

### **Step 4: Update Category Config (if adding new category)**
Only needed if adding a NEW category (not just new variants):

```typescript
// lib/constants/category-placeholders.ts
export const CATEGORY_PLACEHOLDERS: Record<SystemCategory, CategoryPlaceholder> = {
  restaurant: {
    label: 'Restaurant',
    folder: 'restaurant',
    variants: [
      { id: 0, description: 'Neutral plated food', filename: 'restaurant-abstract-00.v1.webp' },
      { id: 1, description: 'Table setting', filename: 'restaurant-abstract-01.v1.webp' },
      // ... more variants
    ],
    unclaimedMaxVariantId: 10 // Max variant selectable for unclaimed businesses
  },
  // ... other categories
}
```

---

### **Step 5: Test**
1. Import a test business in that category
2. Check Discover page → should show placeholder
3. Refresh → should show same placeholder (deterministic)
4. Import another business → should show different variant
5. Check admin CRM → should have placeholder selector

---

## 🧪 **Testing Checklist**

Before deploying new placeholders:

- [ ] Files named correctly (`{category}-abstract-{id}.v1.webp`)
- [ ] Files in correct folder (`/public/placeholders/{category}/`)
- [ ] Variant 0 exists for every category (required)
- [ ] Images are WebP format
- [ ] Images are 1200×675px (16:9)
- [ ] File sizes are 40-120KB
- [ ] Images are neutral (no misrepresentation risk)
- [ ] Test import shows placeholder correctly
- [ ] Grid shows variety (if multiple variants)
- [ ] Claimed business hides placeholder (shows real images)

---

## 🎯 **Quick Reference**

### **Minimum Requirements (Per Category)**
```
1 file: {category}-abstract-00.v1.webp (neutral default)
Location: /public/placeholders/{category}/
Size: 1200×675px, 40-120KB, WebP
Style: Dark, moody, neutral, abstract
```

### **Recommended Setup (Per Category)**
```
10 files: {category}-abstract-00.v1.webp through 09.v1.webp
Purpose: Visual variety in grids
Same rules as variant 0 (neutral, abstract)
```

### **Current Categories (20 total)**
```
restaurant, cafe, bar, dessert, takeaway, fast_food, pizza,
salon, barber, tattoo, retail, bakery, pub, wellness,
fitness, sports, hotel, venue, entertainment, professional, other
```

---

## 📋 **Example: Adding Restaurant Placeholders**

```bash
# 1. Create images (AI/stock/photographer)
# 2. Resize to 1200×675px
# 3. Convert to WebP
# 4. Optimize to ~80KB each
# 5. Name files:

restaurant-abstract-00.v1.webp  # Neutral plated food
restaurant-abstract-01.v1.webp  # Table setting with cutlery
restaurant-abstract-02.v1.webp  # Bread basket macro
restaurant-abstract-03.v1.webp  # Wine glass silhouette
restaurant-abstract-04.v1.webp  # Candle glow texture
restaurant-abstract-05.v1.webp  # Abstract sauce drizzle
restaurant-abstract-06.v1.webp  # Dark wood table texture
restaurant-abstract-07.v1.webp  # Chef's pass abstract
restaurant-abstract-08.v1.webp  # Plating garnish macro
restaurant-abstract-09.v1.webp  # Neutral pasta close-up

# 6. Place in folder:
/public/placeholders/restaurant/

# 7. Deploy (files in /public are automatically served)
# 8. Test import → should show variant based on hash
```

---

## ✅ **Before You Test Import: Critical Checklist**

**Complete this checklist BEFORE importing any businesses:**

1. **Confirm `SystemCategory` enum list**
   ```typescript
   // Check: lib/constants/system-categories.ts
   // Verify exact enum values (case, underscores, etc.)
   ```

2. **Create at least variant 00 for each category you'll import first**
   ```
   Minimum categories for testing:
   - restaurant/restaurant-abstract-00.v1.webp
   - cafe/cafe-abstract-00.v1.webp
   - bar/bar-abstract-00.v1.webp
   - other/other-abstract-00.v1.webp ← REQUIRED fallback
   ```

3. **Check each image URL loads in browser directly**
   ```
   Test URLs:
   https://yourdomain.com/placeholders/restaurant/restaurant-abstract-00.v1.webp
   https://yourdomain.com/placeholders/cafe/cafe-abstract-00.v1.webp
   https://yourdomain.com/placeholders/other/other-abstract-00.v1.webp
   ```

4. **Confirm fallback to 'other' category works**
   ```
   Import a business with unknown category
   → should display /placeholders/other/other-abstract-00.v1.webp
   → should NOT show broken image
   ```

5. **Verify folder names match enum EXACTLY**
   ```bash
   # Check your actual enum values:
   grep "SystemCategory =" lib/constants/system-categories.ts
   
   # Compare with folder names:
   ls public/placeholders/
   ```

---

## 🚀 **Deployment**

### **Auto-deployed:**
Files in `/public/` are automatically served by Next.js/Vercel at:
```
https://yourdomain.com/placeholders/{category}/{filename}
```

### **No build step needed:**
Just add files → commit → push → live immediately

### **Cache busting:**
Version numbers in filename (`v1`, `v2`) handle cache invalidation

### **Recommended rollout:**
1. Start with 5-6 critical categories (restaurant, cafe, bar, other)
2. Test import with 5-10 businesses
3. Verify placeholders display correctly
4. Add remaining categories as needed
5. Don't try to create all 20 categories before testing

---

## 🔍 **Troubleshooting**

### **Placeholder not showing**
1. Check file exists: `/public/placeholders/{category}/{category}-abstract-00.v1.webp`
2. Check filename spelling (exact match required)
3. Check category name matches `system_category` enum
4. Clear browser cache

### **Wrong placeholder showing**
1. Check `system_category` in database (not `display_category`)
2. Check folder name matches category
3. Check business status (claimed businesses should NOT show placeholder)

### **Blank/broken image**
1. File might be corrupted
2. File might be too large (> 10MB causes issues)
3. Filename might have typo
4. Check browser console for 404 errors

---

## 📚 **Related Documentation**

- `PLACEHOLDER_SYSTEM_V3_FINAL_REFINED.md` - Full placeholder system design
- `COUNTRY_CONSTRAINT_FIX.md` - Import tool country constraints
- `GEOCODING_OPTIMIZATION.md` - Import tool technical implementation
- `lib/constants/category-placeholders.ts` - Placeholder configuration

---

## 🔧 **Current Resolver Code**

### **Location:** `lib/constants/category-placeholders.ts`

**Function:** `getPlaceholder(systemCategory, googlePlaceId, manualVariantId, businessStatus)`

**What it expects:**

```typescript
// Folder structure:
/public/placeholders/{systemCategory}/

// Filename format:
{category}-abstract-{id}.v{version}.webp

// Example full path:
/public/placeholders/restaurant/restaurant-abstract-03.v1.webp
```

**Variant selection logic:**
```typescript
// If manual variant provided → use it (with unclaimed clamping)
const requestedId = manualVariantId ?? (hash(googlePlaceId) % (unclaimedMaxVariantId + 1))

// For unclaimed businesses, clamp to safe range
const safeId = businessStatus === 'unclaimed' 
  ? Math.min(requestedId, categoryData.unclaimedMaxVariantId)
  : requestedId

// Find variant by ID (not array index)
const chosenVariant = variants.find(v => v.id === safeId) 
  ?? variants.find(v => v.id === 0)  // Fallback to variant 0
  ?? variants[0]                      // Fallback to first variant

// Build image path
imagePath: `/placeholders/${category}/${chosenVariant.filename}`
```

**Fallback chain:**
1. Try requested variant ID
2. Fallback to variant 0
3. Fallback to first variant in array
4. If category missing → fallback to 'other' category

**Key insight:** 
- Unclaimed businesses DO hash into variants (not always variant 0)
- **ALL variants for food categories MUST be neutral** (no specific food items)
- Hash ensures same business always shows same placeholder

---

## 📋 **Priority Categories (Start Here)**

Don't try to create all 20 categories before testing. Start with these:

### **Must-Have (Test First)**
```
1. restaurant ← Most common
2. cafe       ← Very common
3. bar        ← Common
4. other      ← REQUIRED fallback for unknown categories
```

### **Should-Have (Second Wave)**
```
5. pub
6. takeaway
7. dessert
8. salon
9. barber
10. fitness
```

### **Nice-to-Have (Later)**
```
11-20: retail, bakery, wellness, sports, hotel, venue, etc.
```

**This gives you 80%+ coverage for initial testing.**

---

**Last updated:** January 11, 2026  
**Version:** 1.1 (Production-Safe)

