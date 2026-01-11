# Salon Category Refinement - Summary

**Date:** January 11, 2026  
**Triggered by:** ChatGPT feedback on placeholder misrepresentation risk

---

## ✅ **What Was Fixed**

### **1. Semantic Variant Grouping for `salon` Category**

**Before:**
```typescript
'salon': {
  variants: [
    { id: 0, description: 'White towels and spa setting' },
    { id: 1, description: 'Nail polish bottle' }, // Could misrepresent hair salons
    { id: 2, description: 'Makeup brush' }, // Could misrepresent spas
    ...
  ],
  unclaimedMaxVariantId: 10, // ❌ Too permissive
}
```

**Problem:** Hash-based selection could assign nail polish to a hair salon (or vice versa)

---

**After:**
```typescript
'salon': {
  variants: [
    // NEUTRAL GROUP (Variants 0-2, auto-assigned)
    { id: 0, description: '🔒 NEUTRAL: White towels and spa setting (safe for all)' },
    { id: 1, description: '🔒 NEUTRAL: Soft fabric texture (safe for all)' },
    { id: 2, description: '🔒 NEUTRAL: Cream/product texture (safe for all)' },
    
    // BEAUTY / AESTHETICS GROUP (Variants 3-5, admin-only)
    { id: 3, description: '✨ BEAUTY: Makeup brush and palette' },
    { id: 4, description: '✨ BEAUTY: Beauty products on shelf' },
    { id: 5, description: '✨ BEAUTY: Mirror and lighting' },
    
    // NAILS GROUP (Variants 6-8, admin-only)
    { id: 6, description: '💅 NAILS: Nail polish bottles' },
    { id: 7, description: '💅 NAILS: Nail tools and files' },
    { id: 8, description: '💅 NAILS: Manicure station' },
    
    // SPA GROUP (Variants 9-10, admin-only)
    { id: 9, description: '🧘 SPA: Massage stones and candles' },
    { id: 10, description: '🧘 SPA: Essential oils and diffuser' },
  ],
  unclaimedMaxVariantId: 2, // 🔒 CRITICAL: Only 0-2 allowed for unclaimed
}
```

**Result:**
- ✅ All imported businesses get neutral variants (0-2)
- ✅ Admin can manually select beauty/nails/spa variants after verification
- ✅ No misrepresentation

---

## 🚨 **CRITICAL FIX: Removed HAIR Variants from Salon**

**Problem identified by ChatGPT:**
```
Your mapping: hair_salon → "barber" category ✅
Initial placeholders: salon included HAIR variants (scissors, brushes) ❌
Contradiction!
```

**Why this was wrong:**
- Hair salons map to `barber` category (NOT `salon`)
- Including hair imagery in `salon` placeholders would:
  - Create confusion (why does `salon` have hair tools?)
  - Risk accidental use for non-hair businesses
  - Duplicate imagery between `salon` and `barber` categories

**Fixed:**
```
salon variants now include:
✅ NEUTRAL (towels, fabric, cream)
✅ BEAUTY (makeup, mirrors, products)
✅ NAILS (polish, tools, station)
✅ SPA (stones, candles, oils)

❌ NO HAIR variants (hair imagery belongs in "barber" category only)
```

**Takeaway:** Each `system_category` should only have imagery relevant to the Google types that actually map to it.

---

### **2. Verified Google Places Mapping (Hair Salons)**

**Concern raised:** "Hair salons might get dumped into `salon` category"

**Verification (from `lib/constants/system-categories.ts`):**
```typescript
// Line 85-86
if (t.has("hair_care") || t.has("hair_salon") || t.has("barber_shop")) return "barber"; ✅
if (t.has("beauty_salon") || t.has("spa") || t.has("nail_salon")) return "salon"; ✅
```

**Result:**
- ✅ Hair salons → map to `barber` category (NOT `salon`)
- ✅ Nail salons → map to `salon` category
- ✅ Spas → map to `salon` category
- ✅ Beauty salons (general) → map to `salon` category

**No changes needed** - mapping was already correct!

---

## 📂 **Files Modified**

1. **`lib/constants/category-placeholders.ts`**
   - Updated `salon` variants with semantic grouping
   - Changed `unclaimedMaxVariantId` from 10 → 2
   - Added emoji/label prefixes (🔒 NEUTRAL, 💇 HAIR, 💅 NAILS, 🧘 SPA)

2. **`IMPORT_TOOL_IMAGE_SYSTEM.md`**
   - Added new section: "SEMANTIC VARIANT GROUPING (Multi-Type Categories)"
   - Documented salon example
   - Listed other categories that might need grouping

3. **`SEMANTIC_VARIANT_GROUPING.md`** (NEW)
   - Comprehensive guide to semantic variant grouping
   - Before/after comparison
   - Admin UI implications
   - Validation checklist

4. **`SALON_CATEGORY_REFINEMENT_SUMMARY.md`** (NEW, this file)
   - Summary of changes
   - Verification of Google mapping

---

## 🎯 **Key Insights**

### **1. Category ≠ Business Type**

```
system_category: "salon"
  ├─ Hair salons (but these actually map to "barber")
  ├─ Nail salons ✅
  ├─ Spas ✅
  └─ Beauty salons ✅
```

**Important distinction:**
- `system_category` is for **logic** (filtering, placeholders, etc.)
- `display_category` is for **UI** (what users see)
- **Business type** (hair/nails/spa) is for **visual representation** (placeholder variants)

---

### **2. Neutral Defaults Are Non-Negotiable**

For multi-type categories, you **must** have ultra-neutral defaults that work for ALL subtypes.

**Examples:**
- `salon` → Towels, fabric, abstract spa setting (NOT hair tools, NOT nail polish)
- `retail` → Shopping bag, neutral packaging (NOT dresses, NOT jewelry)
- `venue` → Empty stage, lighting (NOT wedding arch, NOT sports field)

---

### **3. Admin Control > Automation**

It's better to:
- ✅ Auto-assign safe/neutral imagery
- ✅ Let admin manually select specific imagery after verification

Than to:
- ❌ Try to "guess" business type from Google data
- ❌ Risk misrepresentation with overly specific defaults

---

## 🚀 **What Happens Next**

### **Immediate (No Changes Needed)**
```
✅ Salon category is production-ready
✅ Google mapping is correct
✅ Documentation is complete
```

### **When You Generate Placeholder Images**
```
1. Create 3 neutral variants (0-2):
   - White towels/spa setting
   - Soft fabric texture
   - Cream/product texture

2. Create 3 beauty/aesthetics variants (3-5):
   - Makeup brush and palette
   - Beauty products on shelf
   - Mirror and lighting

3. Create 3 nail variants (6-8):
   - Nail polish bottles
   - Nail tools and files
   - Manicure station

4. Create 2 spa variants (9-10):
   - Massage stones and candles
   - Essential oils and diffuser
```

**Note:** NO HAIR variants (hair salons use `barber` category, NOT `salon`)

**Naming convention:**
```
/public/placeholders/salon/salon-abstract-00.v1.webp
/public/placeholders/salon/salon-abstract-01.v1.webp
...
/public/placeholders/salon/salon-abstract-10.v1.webp
```

---

### **When You Build Admin UI for Placeholder Selection (Optional)**

**Current dropdown (flat list):**
```
Variant 0 - White towels and spa setting
Variant 1 - Soft fabric texture
Variant 2 - Cream/product texture
Variant 3 - Scissors and styling tools
...
```

**Improved dropdown (grouped):**
```
━━━━━━ NEUTRAL (Safe for All) ━━━━━━
🔒 Variant 0 - White towels and spa setting
🔒 Variant 1 - Soft fabric texture
🔒 Variant 2 - Cream/product texture

━━━━━━ BEAUTY / AESTHETICS SPECIFIC ━━━━━━
✨ Variant 3 - Makeup brush and palette
✨ Variant 4 - Beauty products on shelf
✨ Variant 5 - Mirror and lighting

━━━━━━ NAIL SALON SPECIFIC ━━━━━━
💅 Variant 6 - Nail polish bottles
💅 Variant 7 - Nail tools and files
💅 Variant 8 - Manicure station

━━━━━━ SPA / WELLNESS SPECIFIC ━━━━━━
🧘 Variant 9 - Massage stones and candles
🧘 Variant 10 - Essential oils and diffuser
```

**Note:** HAIR imagery belongs in `barber` category only (hair salons map to `barber`, not `salon`)

**Implementation:**
- Show thumbnail previews
- Add section headers
- Disable specific variants for unclaimed businesses
- Add confirmation modal when selecting specific variants

---

## 🤔 **Should You Apply This to Other Categories?**

### **Candidates for Semantic Grouping:**

| Category | Current Scope | Needs Grouping? |
|----------|---------------|-----------------|
| `retail` | All retail shops | Maybe - if clothing/gifts/jewelry feel distinct |
| `venue` | All event spaces | Maybe - if wedding/concert/theater feel distinct |
| `entertainment` | All entertainment | Maybe - if arcade/cinema/bowling feel distinct |
| `restaurant` | All restaurants | No - food safety rules already handle this |
| `bar` | All bars/pubs | Probably not - "bar" imagery works for all |

**Recommendation:**
- Wait for user feedback
- If you hear "this placeholder doesn't match my business," then add grouping
- Otherwise, keep it simple

---

## ✅ **Final Validation**

- [x] `salon` category has semantic variant grouping
- [x] `unclaimedMaxVariantId` set to 2 (neutral-only for unclaimed)
- [x] Variant descriptions have emoji/label prefixes
- [x] Google mapping verified (hair → barber, nails → salon)
- [x] Documentation updated
- [ ] Generate actual placeholder images (Wave 2, after Wave 1 is complete)
- [ ] Update admin UI for grouped variant selection (optional)

---

**Status:** Complete and production-ready! 🎉

**Triggered by:** ChatGPT feedback - "Unless I create a few images and let admin decide?"  
**Answer:** Yes, that's exactly the right solution. ✅

