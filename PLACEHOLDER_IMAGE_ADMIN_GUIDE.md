# 🔒 PLACEHOLDER IMAGE SYSTEM — ADMIN GUIDE

**Critical Business & Legal Safety System**

---

## 📍 WHERE THIS SYSTEM LIVES

This placeholder image system is integrated into:

1. **Admin Import Tool** (`app/admin/import/page.tsx`)
   - Info panel explaining neutral placeholder rules
   - Automatic assignment of variant 0 on import
   
2. **Admin Business CRM** (future integration)
   - Placeholder override UI for unclaimed listings
   - Preview and variant selection

3. **Code Comments** (`lib/constants/category-placeholders.ts`)
   - Complete library of 176 placeholder variants (16 categories × 11 variants each)
   - Detailed descriptions and safety annotations

4. **This Documentation** (`PLACEHOLDER_IMAGE_ADMIN_GUIDE.md`)
   - Complete rules, examples, and safety guidelines

---

## 🎯 WHAT ARE PLACEHOLDER IMAGES?

Placeholder images are **abstract, category-based images** that display for **unclaimed business listings** until the real business owner:
- Claims their listing
- Uploads their own real photos

**Key principle:** Placeholders are **neutral by design** and **do not represent** the business's exact menu, products, or services.

---

## 🔒 THE 3-LAYER SAFETY SYSTEM

### **Layer 1: Import Enforcement (Automatic)**

✅ **Import tool always sets `placeholder_variant = 0`**
- Variant 0 is **NEUTRAL** (safe for entire category)
- Never auto-assigns cuisine-specific or product-specific images
- Example: Restaurant variant 0 = neutral table setting (works for vegan, steakhouse, family restaurant, etc.)

### **Layer 2: Runtime Safety Assertion (Defensive Programming)**

✅ **`getPlaceholder()` function has built-in guardrail**
- Checks: if `status === 'unclaimed'` AND `placeholder_variant !== 0` → **force variant 0**
- Logs warning for audit trail
- Self-healing if data corruption occurs
- Legal defensibility

### **Layer 3: Claim Enforcement (Already Implemented)**

✅ **Cannot approve claim without real uploaded image**
- Placeholder is a temporary state only
- Business owners MUST upload at least 1 real photo before claim approval
- Prevents long-term "claimed + no images" state

---

## 🎨 PLACEHOLDER LIBRARY STRUCTURE

### **16 Categories × 11 Variants Each = 176 Total Images**

Each category has:
- **Variant 0**: 🔒 NEUTRAL (safe for all businesses in category)
- **Variants 1-10**: Various abstract detail shots, some marked ⚠️ ADMIN ONLY if specific

### **Category Examples:**

#### **Restaurant**
- **Variant 0**: 🔒 NEUTRAL — Table setting (safe for vegan, steakhouse, family, etc.)
- Variant 1: Wine glass with bokeh
- Variant 2: Pasta close-up
- **Variant 3**: ⚠️ ADMIN ONLY — Steak/grill (specific cuisine)
- **Variant 6**: ⚠️ ADMIN ONLY — Burger (specific cuisine)
- **Variant 9**: ⚠️ ADMIN ONLY — Pizza (specific cuisine)

#### **Cafe**
- **Variant 0**: 🔒 NEUTRAL — Coffee cup on table (safe for all)
- Variant 1: Coffee bean pile
- Variant 2: Espresso pouring
- **Variant 7**: ⚠️ ADMIN ONLY — Latte art (specific style)

#### **Bar**
- **Variant 0**: 🔒 NEUTRAL — Backlit bottles (safe for all)
- Variants 1-10: Various bar/drink abstract details

---

## ⚙️ ADMIN RULES & RESPONSIBILITIES

### **✅ Admins CAN:**

1. **Import businesses via Google Places**
   - Businesses are created as `status = 'unclaimed'`
   - `placeholder_variant` is automatically set to `0` (neutral)

2. **Change placeholder images within the same category**
   - Via `PlaceholderSelector` component (future integration)
   - Only for unclaimed businesses
   - Must explicitly enable override and confirm safety

3. **Leave placeholder images until business claims**
   - Unclaimed listings can use placeholders indefinitely
   - Placeholder is replaced when owner uploads real photos

### **❌ Admins CANNOT:**

1. **Approve a business claim without at least one real uploaded image**
   - Hard-blocked in `/api/admin/approve-claim` endpoint
   - Prevents false advertising and misrepresentation

2. **Assign placeholders from another category**
   - Validation enforced in `/api/admin/businesses/placeholder-variant`
   - Only variants that exist for `system_category` are allowed

3. **Use specific food/drink/product imagery as default placeholders**
   - Variant 0 is ALWAYS neutral
   - Specific variants (3, 6, 9, etc.) require explicit admin override

---

## 🚨 SAFETY EXAMPLES

### **✅ OK (Safe Placeholder Usage)**

| Business | Variant | Why It's Safe |
|----------|---------|---------------|
| Any Restaurant | Variant 0 | Neutral table setting works for all cuisines |
| Vegan Restaurant | Variant 2 | Pasta close-up (no meat, safe) |
| Steakhouse | Variant 3 | Admin explicitly chose steak variant |
| Coffee Shop | Variant 0 | Neutral coffee cup (safe for all cafes) |
| Craft Beer Bar | Variant 0 | Neutral backlit bottles (safe for all bars) |

### **❌ NOT OK (Misrepresentation Risk)**

| Business | Variant | Why It's Dangerous | Prevention |
|----------|---------|-------------------|------------|
| Vegan Restaurant | Variant 3 | Shows steak (dietary misrepresentation) | **Runtime safety forces variant 0** |
| Family Cafe | Variant 7 | Shows latte art (implies hipster vibe) | **Admin must explicitly override** |
| Juice Bar | Variant 2 | Shows cocktail (implies alcohol) | **Import defaults to variant 0** |

---

## 💻 TECHNICAL IMPLEMENTATION

### **Database Schema**

```sql
-- business_profiles table
ALTER TABLE business_profiles
ADD COLUMN placeholder_variant INTEGER DEFAULT 0;

-- Stores which variant (0-10) to show for this business
-- 0 = neutral default (safe for all)
-- 1-10 = specific variants (admin manual selection only)
```

### **Admin Override API**

**Endpoint**: `POST /api/admin/businesses/placeholder-variant`

**Request Body**:
```json
{
  "businessId": "uuid",
  "placeholderVariant": 0-10
}
```

**Validation Rules**:
1. ✅ Admin-only (franchise-scoped)
2. ✅ Only for `status === 'unclaimed'`
3. ✅ Variant must exist for business's `system_category`
4. ✅ Returns error if invalid variant

**Response**:
```json
{
  "success": true,
  "businessId": "uuid",
  "placeholderVariant": 3,
  "message": "Placeholder updated to variant 3"
}
```

### **Frontend Component**

**Component**: `PlaceholderSelector` (`components/admin/placeholder-selector.tsx`)

**Features**:
- 🔒 Locked to variant 0 by default for unclaimed
- ⚠️ Admin must explicitly enable override
- ✅ Confirmation checkbox for non-neutral variants
- 🖼️ Live preview of selected variant
- 💾 Save button (disabled until confirmed)

**Usage**:
```tsx
<PlaceholderSelector
  businessId={business.id}
  businessName={business.business_name}
  status={business.status}
  systemCategory={business.system_category}
  googlePlaceId={business.google_place_id}
  placeholderVariant={business.placeholder_variant}
  onSave={async (variant) => {
    await fetch('/api/admin/businesses/placeholder-variant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id, placeholderVariant: variant })
    })
  }}
/>
```

---

## 📋 ADMIN UI MICROCOPY

### **Import Tool — Info Panel**

**Title**: Placeholder Images (Unclaimed Listings)

**Body**:
> Imported businesses are created as UNCLAIMED and will show a neutral placeholder image until the owner uploads real photos.
> Placeholders are category-based and do not represent the business's exact menu, products, or services.

**Rules**:
- ✅ Default is always Neutral (Variant 0) for safety
- ✅ Admins can manually choose a different placeholder within the same category
- ❌ Don't choose images that could misrepresent the business (e.g. steak for vegan)
- 🔒 Claims cannot be approved until the business uploads at least one real image

### **Placeholder Override UI — Confirmation Modal**

**Label**: Confirmation

**Text**:
> You're responsible for ensuring this placeholder is neutral and does not misrepresent the business.

**Checkbox**:
> I confirm this placeholder is appropriate for this business.

**Helper Text**:
> If unsure, keep Neutral (Variant 0).

---

## 🛡️ LEGAL DEFENSIBILITY

This system provides:

✅ **Audit Trail**
- Console warnings when runtime safety override is triggered
- Admin actions logged (who changed what variant when)

✅ **No Misrepresentation Risk**
- Neutral defaults for all unclaimed businesses
- Specific variants require explicit admin confirmation
- Real images required before claim approval

✅ **Scale-Safe**
- Works across all cities/franchises
- No dietary, cultural, or cuisine misrepresentation
- Self-healing if data corruption occurs

✅ **User Trust**
- "UNCLAIMED" badge shows on cards
- "Photos added when claimed" message sets expectation
- Transparent about temporary nature of placeholders

---

## 🚀 LAUNCH CHECKLIST

Before going live with placeholder system:

- [ ] All 16 categories have variant 0 (neutral) defined ✅
- [ ] Import tool sets `placeholder_variant = 0` ✅
- [ ] Runtime safety assertion in `getPlaceholder()` ✅
- [ ] Admin API validates variants ✅
- [ ] Claim approval blocks without images ✅
- [ ] `PlaceholderSelector` component built ✅
- [ ] Admin documentation complete ✅
- [ ] **TODO**: Generate actual 176 placeholder images (40-120KB each, WebP format)
- [ ] **TODO**: Store images in `/public/placeholders/<category>/<filename>.v1.webp`
- [ ] **TODO**: Test full flow (import → override → claim → real images)

---

## 📞 QUESTIONS?

If you're unsure whether a placeholder is safe to use:

1. **Default to Variant 0** (always safe)
2. **Ask yourself**: "Could this image mislead a customer about what this business offers?"
3. **If yes**: Use Variant 0
4. **If no**: Proceed with override + confirmation

**One-line summary:**
> Placeholders are neutral by design. Real images come from the business owner.

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Status**: Production-Ready (pending image generation)

