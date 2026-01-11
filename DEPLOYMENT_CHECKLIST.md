# 🚀 PLACEHOLDER SYSTEM — DEPLOYMENT CHECKLIST

**Before you deploy, verify these items:**

---

## ✅ **FOLDER STRUCTURE**

Run: `node scripts/verify-placeholder-folders.js`

**Expected Result:**
- ✅ 20/20 folders exist
- ⚠️  0/220 images (empty) ← This is OK for now

**Folders must exist:**
```
/public/placeholders/
  ├── restaurant/
  ├── cafe/
  ├── bar/
  ├── pub/
  ├── bakery/
  ├── fast_food/
  ├── dessert/
  ├── takeaway/
  ├── salon/
  ├── barber/
  ├── tattoo/
  ├── wellness/
  ├── retail/
  ├── fitness/
  ├── sports/
  ├── hotel/
  ├── venue/
  ├── entertainment/
  ├── professional/
  └── other/
```

---

## ✅ **OPERATIONAL RULES**

### **1. Admin Override = DB Only**
- ✅ Admins change `placeholder_variant` (0-10)
- ✅ NO file uploads
- ✅ Instant across all franchises

### **2. Image Versioning**
- ✅ Use versioned filenames: `restaurant-abstract-00.v1.webp`
- ✅ If replacing image → bump version: `.v2.webp`
- ✅ Never overwrite existing version (CDN cache issues)

### **3. Import Defaults**
- ✅ All imports set: `placeholder_variant = 0`
- ✅ All imports set: `status = 'unclaimed'`
- ✅ Variant 0 = always neutral/safe

### **4. Fallback Chain**
```typescript
systemCategory ?? 'other'
placeholderVariant ?? 0
```

---

## ✅ **NEUTRAL MAX VALUES**

**Verify these match your actual image generation:**

| Category | neutralMaxVariantId | Reason |
|----------|---------------------|--------|
| restaurant | 8 | 9-10 = pizza/sushi (specific) |
| cafe | 9 | Most are generic |
| bakery | 8 | 9-10 = croissants/bread (specific) |
| dessert | 8 | 9-10 = cake slices (borderline) |
| Everything else | 10 | All generic |

**Location**: `lib/constants/category-placeholders.ts`

---

## ✅ **RUNTIME SAFETY**

**Verify guardrail is active:**

```typescript
// lib/constants/category-placeholders.ts
if (businessStatus === 'unclaimed' && variantIndex > neutralMax) {
  console.warn(`Neutral range enforcement: forcing variant 0`)
  variantIndex = 0
}
```

**Test:**
1. Manually set `placeholder_variant = 10` for unclaimed restaurant in DB
2. Load business card
3. Should force variant 0
4. Console should show warning

---

## ✅ **MULTI-TENANT COMPATIBILITY**

### **All Franchises Share Static Assets**
- ✅ `/public/placeholders/` served by Vercel/CDN
- ✅ No auth, no RLS, no tenant-specific buckets
- ✅ Each franchise controls `placeholder_variant` per business (DB)

### **Domain Detection Still Works**
- ✅ `bournemouth.qwikker.com` → Bournemouth franchise
- ✅ `london.qwikker.com` → London franchise
- ✅ Both use same placeholder library
- ✅ Each admin controls their businesses only

---

## ✅ **API VALIDATION**

**File**: `app/api/admin/businesses/placeholder-variant/route.ts`

**Must enforce:**
1. ✅ Admin-only access
2. ✅ Franchise-scoped (admin can only edit their city's businesses)
3. ✅ Variant exists for category
4. ✅ If unclaimed → variant ≤ neutralMaxVariantId

**Error messages:**
- "For unclaimed listings, variant must be between 0 and {neutralMax}"
- "Cannot use variant {X} — too specific and could misrepresent the business"

---

## ✅ **ADMIN UI**

**File**: `components/admin/placeholder-selector.tsx`

**Behavior:**
- ✅ If `status === 'unclaimed'` → Show dropdown (0 to neutralMax)
- ✅ If `status !== 'unclaimed'` → Hide dropdown + message ("Claimed listings use real photos")
- ✅ Preview thumbnail updates on select
- ✅ Shows "Variant X / neutralMax"

**Microcopy:**
> "This image is shown until the business claims their listing and uploads real photos. Choose a variant to add variety across listings."
>
> "Keep it generic (no specific dishes/brands) to avoid misrepresentation."

---

## ✅ **BUSINESS CARD RENDERING**

**File**: `components/ui/business-card-image.tsx`

**Logic:**
```typescript
if (status === 'unclaimed') {
  // Show placeholder
  const placeholder = getPlaceholder(systemCategory, googlePlaceId, placeholderVariant, status)
  return <img src={placeholder.imagePath} />
} else {
  // Show real Cloudinary images
  return <ImageCarousel images={business.images} />
}
```

**Badge:**
- ✅ "UNCLAIMED" badge shows for unclaimed
- ✅ Hidden for claimed

---

## ✅ **CLAIM FLOW GUARDRAIL**

**File**: `app/api/admin/approve-claim/route.ts`

**Critical rule:**
```typescript
if (!claim.logo_upload_url && !claim.hero_image_upload_url) {
  return NextResponse.json(
    { error: 'Cannot approve claim without at least one uploaded image' },
    { status: 400 }
  )
}
```

**Result**: "Claimed + no images" state is impossible

---

## 🎨 **IMAGE GENERATION (NOT BLOCKING DEPLOYMENT)**

**Can deploy now with empty folders.**

**Placeholder images render as:**
- System will use fallback logic
- Won't break, just won't show variety

**To add images later:**
1. Generate WebP files (40-120KB, 800px max width, 16:9)
2. Drop into `/public/placeholders/<category>/`
3. Name: `<category>-abstract-00.v1.webp` to `<category>-abstract-10.v1.webp`
4. Deploy (or git commit + push)
5. Images available instantly across all franchises

**No DB changes needed.**

---

## 🧪 **TESTING SEQUENCE**

### **Test 1: Import Flow**
1. Import restaurant via Google Places
2. Verify DB: `placeholder_variant = 0`, `status = 'unclaimed'`
3. Load Discover page
4. Verify: placeholder shows (even if folder empty → fallback)
5. Verify: "UNCLAIMED" badge shows

### **Test 2: Admin Override**
1. Open admin → find unclaimed restaurant
2. Open placeholder selector
3. Verify: dropdown shows variants 0-8 only
4. Select variant 5
5. Save
6. Refresh business card
7. Verify: variant 5 path is attempted (may 404 if image not generated yet)

### **Test 3: Runtime Guardrail**
1. Manually set `placeholder_variant = 10` in DB for unclaimed restaurant
2. Load business card
3. Verify: forces variant 0
4. Check console for warning

### **Test 4: Claimed Business**
1. Business claims listing
2. Uploads logo + hero image
3. Admin approves
4. Verify: placeholder selector hidden
5. Verify: real images show on card
6. Verify: no "UNCLAIMED" badge

---

## 🚨 **COMMON PITFALLS**

### **1. Forgetting to bump version when replacing images**
**Problem**: Browser/CDN caches old image  
**Solution**: Always rename `foo.v1.webp` → `foo.v2.webp`

### **2. Admin accidentally selects specific variant for wrong business**
**Solution**: Runtime guardrail forces variant 0 for unclaimed

### **3. Claimed business still shows placeholder**
**Problem**: Claim approval logic not enforcing image upload  
**Solution**: Guardrail blocks approval if no images

### **4. Missing category folder**
**Problem**: Placeholder path 404s  
**Solution**: Run `node scripts/verify-placeholder-folders.js` before deploy

---

## ✅ **DEPLOYMENT COMMAND**

```bash
# 1. Verify folder structure
node scripts/verify-placeholder-folders.js

# 2. Build (should pass with 0 errors)
pnpm build

# 3. Deploy (Vercel)
vercel --prod

# 4. (Optional) Add images later
# Drop WebP files into /public/placeholders/<category>/
# git commit + push
# Auto-deploys
```

---

## 📋 **FINAL PRE-DEPLOY CHECKLIST**

- [ ] Folder structure verified (`scripts/verify-placeholder-folders.js`)
- [ ] `.gitkeep` files added to track empty folders
- [ ] `neutralMaxVariantId` values match your image plan
- [ ] Runtime guardrail logs warnings (test manually)
- [ ] API validation rejects invalid variants
- [ ] Admin UI hides dropdown for claimed businesses
- [ ] Claim approval blocks if no images uploaded
- [ ] TypeScript build passes (`pnpm build`)
- [ ] No linter errors (`pnpm lint`)

---

**Status**: 🟢 **READY TO DEPLOY**

**What's safe to deploy now:**
- ✅ All code logic
- ✅ Empty placeholder folders (.gitkeep tracked)
- ✅ Fallback behavior works

**What to add later (non-blocking):**
- 🎨 Generate 220 placeholder images
- 🎨 Drop into folders
- 🎨 Git commit + push

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Next**: Deploy → Generate images → Drop in → Done

