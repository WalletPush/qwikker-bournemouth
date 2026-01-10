# Placeholder Image System - Complete Solution

## 🎯 Problems Solved

### 1. **Repetition Issue**
**Problem:** 8 restaurants in a row = 8 identical cutlery photos = looks terrible

**Solution:** 4-5 image variants per category, selected based on business ID

**Result:** Each restaurant gets a different image (cutlery, wine glass, pasta, bread)

---

### 2. **Multi-Tenant Issue**
**Problem:** Images in `/public/` only work for one franchise

**Solution:** Store all placeholder images in Cloudinary (accessible across ALL franchises)

**Result:** Bournemouth, London, Manchester all use same placeholder library

---

### 3. **Admin Control Issue**
**Problem:** Pizza place categorized wrong → shows coffee cup → no way to fix

**Solution:** Add admin controls to:
- Change business category
- Override placeholder image
- Select specific variant

**Result:** Admin can fix miscat egorizations instantly

---

## 📊 Database Changes Needed

### Add to `business_profiles` table:

```sql
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS placeholder_variant_id INTEGER,
ADD COLUMN IF NOT EXISTS placeholder_override_url TEXT;

COMMENT ON COLUMN business_profiles.placeholder_variant_id 
IS 'Selected variant ID for unclaimed business placeholder (1-4)';

COMMENT ON COLUMN business_profiles.placeholder_override_url 
IS 'Admin can override with custom Cloudinary URL if categorization is wrong';
```

### Logic:
```
1. If placeholder_override_url exists → use that (admin override)
2. Else if placeholder_variant_id exists → use that specific variant
3. Else → auto-select based on business ID hash (default)
```

---

## 🎨 Image Structure

### 12 Categories × 4 Variants = 48 Total Images

**Storage:** Cloudinary folder `/placeholders/`

**Naming convention:**
```
/placeholders/restaurant-cutlery.jpg
/placeholders/restaurant-wine.jpg
/placeholders/restaurant-pasta.jpg
/placeholders/restaurant-bread.jpg
/placeholders/cafe-steam.jpg
/placeholders/cafe-latte.jpg
... etc
```

---

## 🔧 Admin Interface

### In Business CRM Card:

**For Unclaimed Businesses:**

```
┌─────────────────────────────────┐
│ Business Profile                │
│                                 │
│ Status: Unclaimed               │
│ Category: Restaurant            │
│                                 │
│ Placeholder Image:              │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│ │Cut- │ │Wine │ │Pasta│ │Bread││ ← 4 variants
│ │lery │ │Glass│ │     │ │     ││
│ │ ✓   │ │     │ │     │ │     ││ ← Selected
│ └─────┘ └─────┘ └─────┘ └─────┘│
│                                 │
│ Or upload custom:               │
│ [Choose File] [Upload]          │
│                                 │
│ Change Category:                │
│ [Dropdown: Restaurant ▼]        │
└─────────────────────────────────┘
```

**Actions:**
- Click variant → Updates `placeholder_variant_id`
- Upload custom → Uploads to Cloudinary → Updates `placeholder_override_url`
- Change category → Updates `business_category` + reloads variants

---

## 💻 Component Logic

### BusinessCardImage.tsx:

```typescript
// Priority order:
1. Claimed business → hero_image (Cloudinary)
2. Unclaimed + admin override → placeholder_override_url
3. Unclaimed + selected variant → variants[placeholder_variant_id]
4. Unclaimed + auto → variants[hash(businessId) % 4]
```

---

## 📝 Implementation Steps

### Phase 1: Multi-Variant System (Today)
- [x] Update category-placeholders.ts with variants
- [ ] Upload 48 images to Cloudinary
- [ ] Update BusinessCardImage to use variants
- [ ] Test with multiple restaurants

### Phase 2: Database Schema (Tomorrow)
- [ ] Run SQL to add columns
- [ ] Update import API to store variant selection
- [ ] Test variant persistence

### Phase 3: Admin Controls (Day 3)
- [ ] Add variant selector to CRM card
- [ ] Add custom upload button
- [ ] Add category change dropdown
- [ ] Test admin workflow

---

## 🎯 Expected Results

### Discover Page (8 Restaurants):

**Before (Terrible):**
```
[Cutlery] [Cutlery] [Cutlery] [Cutlery]
[Cutlery] [Cutlery] [Cutlery] [Cutlery]
```

**After (Beautiful):**
```
[Cutlery] [Wine] [Pasta] [Bread]
[Cutlery] [Wine] [Pasta] [Bread]
```

Each gets consistent image (same restaurant = same photo), but grid looks varied!

---

## 🖼️ Cloudinary Setup

### 1. Create Folder Structure:
```
/placeholders/
  /restaurant/
    - cutlery.jpg
    - wine.jpg
    - pasta.jpg
    - bread.jpg
  /cafe/
    - steam.jpg
    - latte.jpg
    - pastry.jpg
    - beans.jpg
  ... etc
```

### 2. Get URLs:
```
https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/placeholders/restaurant/cutlery.jpg
```

### 3. Add to Config:
Update `category-placeholders.ts` with real Cloudinary URLs

---

## 🚀 Quick Win (Temporary Solution)

**For NOW (before sourcing 48 images):**

Use the SAME 12 images we were going to get, but:
- Add slight CSS transforms per business ID
- `filter: hue-rotate(${businessId % 360}deg)` 
- `transform: scale(${1 + (businessId % 10) * 0.02})`

This gives SOME visual variety until you source more images!

---

## 💰 Cost Analysis

### Image Storage:
- 48 images × 200KB = ~10MB
- Cloudinary free tier = 25GB storage
- **Cost: £0**

### Image Delivery:
- Cached on Vercel Edge
- Served from CDN
- 10,000 views × 48KB (optimized) = 480MB
- Cloudinary free tier = 25GB bandwidth/month
- **Cost: £0**

---

## ✅ Success Criteria

- [ ] No repeated images in a 4×4 grid
- [ ] All franchises access same image library
- [ ] Admin can fix miscategorizations
- [ ] Admin can override specific images
- [ ] Same business always shows same image
- [ ] Different businesses show different images
- [ ] Works offline (cached)
- [ ] Fast page load (< 2s)

---

## 🎨 Image Sourcing (Revised)

**Instead of 12 images, source 48:**

### Restaurant (4 variants):
1. Cutlery on dark table
2. Wine glass on table setting
3. Pasta dish close-up
4. Artisan bread detail

### Café (4 variants):
1. Coffee steam rising
2. Latte art detail
3. Pastry close-up
4. Coffee beans texture

... and so on for all 12 categories

**Time:** ~2-3 hours (but worth it for varied grid!)

---

## 🔄 Migration Path

### Today:
- Start with 12 images (1 per category)
- Use CSS transforms for variety
- Deploy and test

### This Week:
- Source remaining 36 images (3 more per category)
- Upload to Cloudinary
- Update config
- Deploy improved version

### Next Week:
- Add admin controls
- Add database columns
- Enable custom overrides

---

**This solves ALL three problems you identified! 🎯**

