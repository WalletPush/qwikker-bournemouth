# Abstract Detail Shot Images - Sourcing Guide

## 🎯 Goal
Find 12 abstract, close-up, atmospheric photos that **cannot** be mistaken for a specific venue.

---

## ✅ What We Need

### Image Specs:
- **Format:** JPG or WebP
- **Dimensions:** 1200x800px minimum (3:2 ratio)
- **Size:** Under 300KB after optimization
- **Style:** Dark, moody, close-up, abstract
- **Quality:** High-resolution, professional

### Visual Requirements:
- ✅ **Close-up detail shots** (can't identify location)
- ✅ **Blurred backgrounds** (bokeh effect)
- ✅ **Atmospheric lighting** (dramatic, moody)
- ✅ **Dark tones** (works with overlay gradient)
- ❌ **No full interiors** (too identifiable)
- ❌ **No people** (privacy/model release)
- ❌ **No obvious branding** (logos, signs)

---

## 📸 Exact Images to Find

Save to `/public/placeholders/`:

### 1. `restaurant-cutlery.jpg`
**Search terms:** "cutlery close up dark elegant"
**What to look for:** 
- Fork and knife on dark table
- Blurred background
- Elegant, premium feel
- Dark/moody lighting

**Example:** https://unsplash.com/s/photos/cutlery-dark

---

### 2. `cafe-steam.jpg`
**Search terms:** "coffee steam macro espresso"
**What to look for:**
- Steam rising from coffee cup
- Macro/close-up shot
- Warm tones
- Abstract, dreamy

**Example:** https://unsplash.com/s/photos/coffee-steam

---

### 3. `bar-glasses.jpg`
**Search terms:** "wine glasses bokeh light"
**What to look for:**
- Wine glasses catching light
- Bokeh/blurred background
- Dark, sophisticated
- Light reflections

**Example:** https://unsplash.com/s/photos/wine-glass-bokeh

---

### 4. `pub-tap.jpg`
**Search terms:** "beer tap handle close up"
**What to look for:**
- Tap handle detail
- Warm lighting
- Wooden or brass tones
- Blurred background

**Example:** https://unsplash.com/s/photos/beer-tap-close-up

---

### 5. `salon-brushes.jpg`
**Search terms:** "makeup brushes soft focus elegant"
**What to look for:**
- Makeup brushes arranged elegantly
- Soft focus/shallow depth of field
- Pink or neutral tones
- Professional, premium

**Example:** https://unsplash.com/s/photos/makeup-brushes

---

### 6. `barber-scissors.jpg`
**Search terms:** "barber scissors silhouette tools"
**What to look for:**
- Scissors and comb in dramatic lighting
- Silhouette or high contrast
- Professional barber tools
- Dark, masculine feel

**Example:** https://unsplash.com/s/photos/barber-scissors

---

### 7. `fitness-weights.jpg`
**Search terms:** "dumbbell detail chalk dust gym"
**What to look for:**
- Close-up of weights
- Chalk dust or texture
- Abstract composition
- Dark, powerful mood

**Example:** https://unsplash.com/s/photos/gym-weights-close-up

---

### 8. `retail-shelves.jpg`
**Search terms:** "boutique shelves bokeh products"
**What to look for:**
- Product shelves out of focus
- Warm, inviting bokeh
- Soft focus (not clearly identifiable products)
- Premium retail feel

**Example:** https://unsplash.com/s/photos/boutique-bokeh

---

### 9. `hotel-sheets.jpg`
**Search terms:** "white sheets luxury texture bed"
**What to look for:**
- Crisp white linens detail
- Texture visible
- Luxury, clean feel
- Soft, elegant lighting

**Example:** https://unsplash.com/s/photos/luxury-sheets

---

### 10. `venue-lights.jpg`
**Search terms:** "stage lights bokeh abstract concert"
**What to look for:**
- Stage lights out of focus
- Abstract light patterns
- Bokeh circles
- Colorful or warm tones

**Example:** https://unsplash.com/s/photos/stage-lights-bokeh

---

### 11. `entertainment-neon.jpg`
**Search terms:** "neon glow abstract texture light"
**What to look for:**
- Neon light abstract texture
- Blurred/out of focus
- Vibrant colors
- Modern, urban feel

**Example:** https://unsplash.com/s/photos/neon-abstract

---

### 12. `default-abstract.jpg`
**Search terms:** "dark abstract texture moody"
**What to look for:**
- Generic dark abstract texture
- Professional, neutral
- Works as fallback
- Doesn't represent any specific business type

**Example:** https://unsplash.com/s/photos/dark-abstract-texture

---

## 🎨 Quality Checklist

For each image, verify:
- [ ] Cannot identify a specific place
- [ ] Close-up or abstract composition
- [ ] Dark/moody tones (works with black overlay)
- [ ] High resolution (1200px+ wide)
- [ ] No watermarks
- [ ] Free to use (Unsplash license)
- [ ] Professional quality

---

## 🔧 Optimization Process

After downloading from Unsplash:

### 1. Use TinyPNG
1. Go to https://tinypng.com/
2. Upload all 12 images
3. Download compressed versions
4. Target: < 300KB per image

### 2. Or use ImageOptim (Mac)
1. Download: https://imageoptim.com/
2. Drag images into app
3. Saves ~50-70% file size

### 3. Verify dimensions
- Minimum: 1200x800px (3:2 ratio)
- Next.js will auto-optimize, but starting with correct size helps

---

## 📁 Folder Structure

```
/public/placeholders/
  ├── restaurant-cutlery.jpg
  ├── cafe-steam.jpg
  ├── bar-glasses.jpg
  ├── pub-tap.jpg
  ├── salon-brushes.jpg
  ├── barber-scissors.jpg
  ├── fitness-weights.jpg
  ├── retail-shelves.jpg
  ├── hotel-sheets.jpg
  ├── venue-lights.jpg
  ├── entertainment-neon.jpg
  └── default-abstract.jpg
```

---

## ✅ Quick Start (30 Minutes)

**Step 1: Open Unsplash** (10 min)
- Go to https://unsplash.com/
- Search for each term above
- Download 12 images (click Download → Large)

**Step 2: Optimize** (10 min)
- Upload to https://tinypng.com/
- Download compressed versions

**Step 3: Add to Project** (5 min)
- Create `/public/placeholders/` folder
- Copy all 12 images
- Rename to match filenames above

**Step 4: Test** (5 min)
- Run dev server
- Navigate to Discover page
- Verify images load correctly
- Check mobile looks good

---

## 🎯 Expected Result

**Unclaimed Card:**
```
┌─────────────────────────────────┐
│ ┌────┐               ┌────────┐ │
│ │🍽️  │               │Unclaim-│ │  ← Orange badge
│ │Rest│               │  ed    │ │
│ └────┘               └────────┘ │
│                                 │
│  [ABSTRACT CUTLERY              │  ← Real photo, but
│   CLOSE-UP, BLURRED             │     clearly abstract
│   BACKGROUND]                   │
│                                 │
│               ┌───────────────┐ │
│               │Photos added   │ │
│               │when claimed   │ │
│               └───────────────┘ │
└─────────────────────────────────┘
```

**Result:**
- ✅ Looks premium and photographic
- ✅ Cannot be mistaken for the venue
- ✅ Clear "Unclaimed" badge visible
- ✅ Professional, curated feel

---

## 🚀 Deployment Checklist

- [ ] All 12 images sourced from Unsplash
- [ ] Images optimized (< 300KB each)
- [ ] Saved to `/public/placeholders/`
- [ ] Correct filenames (matches config)
- [ ] Tested on desktop
- [ ] Tested on mobile
- [ ] Verified "Unclaimed" badge visible
- [ ] Checked text is readable over images
- [ ] Deploy and monitor

---

## 💡 Pro Tips

1. **Favor dark images** - Works better with text overlays
2. **Check mobile** - Some images crop differently on small screens
3. **Test with real data** - Create test unclaimed businesses to see live
4. **A/B test** - Try different images if one doesn't feel right
5. **Update gradually** - Can swap images later if you find better ones

---

**Total time: ~30-60 minutes for production-ready abstract detail shots! 🎯**

