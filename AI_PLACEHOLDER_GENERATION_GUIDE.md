# AI-Generated Placeholder Image Workflow

## Why AI Generation is Best for QWIKKER

**Traditional stock sourcing (Unsplash/Pexels):**
- ❌ 2-4 hours of manual searching
- ❌ Inconsistent styles from different photographers
- ❌ Risk of recognizable venues
- ❌ Overused images ("I've seen that photo before")
- ❌ Licensing/attribution tracking

**AI-generated abstract placeholders:**
- ✅ 30-60 minutes total (including conversion)
- ✅ Perfect consistency across all images
- ✅ Truly abstract (impossible to misrepresent)
- ✅ Unique to QWIKKER
- ✅ Zero licensing issues

---

## Step-by-Step Workflow

### Step 1: Generate Images with ChatGPT

**Test Batch (24 images):**
```
Generate 6 dark, moody, abstract restaurant detail shots:
- Elegant cutlery with bokeh background
- Wine glass reflections
- Subtle film grain texture
- No people, no text, no recognizable venues
- Dark premium aesthetic (black/slate tones)
- 16:9 aspect ratio
- High contrast, selective focus

Style: cinematic, minimal, premium
```

Repeat for:
- Coffee (6 images): steam, latte art, beans, espresso details
- Bar (6 images): cocktail glass, bottles backlit, ice close-ups
- Barber (6 images): scissors silhouette, comb, razor, tools

**Full Pack (120 images):**
Once test batch is approved, expand to:
- 10 categories × 12 variants each = 120 images

---

### Step 2: Download & Organize

ChatGPT will provide images. Download them all.

**Initial organization:**
```
~/Downloads/qwikker-placeholders/
  /restaurant/
    restaurant-01.png
    restaurant-02.png
    ...
  /coffee/
  /bar/
  /barber/
```

---

### Step 3: Batch Convert to WebP

#### Option A: Online (Easy, Small Batches)
Use **Squoosh.app**:
1. Upload image
2. Select "WebP" format
3. Set quality to **75%**
4. Check file size (~60-80KB)
5. Download as `restaurant-abstract-01.v1.webp`

#### Option B: CLI (Faster, Large Batches)
Install `cwebp`:
```bash
# macOS
brew install webp

# Batch convert all PNGs in a folder
cd ~/Downloads/qwikker-placeholders/restaurant
for f in *.png; do 
  name=$(basename "$f" .png)
  cwebp -q 75 -resize 800 0 "$f" -o "restaurant-abstract-${name#restaurant-}.v1.webp"
done
```

**Verify sizes:**
```bash
ls -lh *.webp
# Should show: ~60-80KB per file
```

---

### Step 4: Move to Project

```bash
# From your project root
mkdir -p public/placeholders/restaurant
mkdir -p public/placeholders/coffee
mkdir -p public/placeholders/bar
mkdir -p public/placeholders/barber

# Copy converted WebP files
cp ~/Downloads/qwikker-placeholders/restaurant/*.webp public/placeholders/restaurant/
cp ~/Downloads/qwikker-placeholders/coffee/*.webp public/placeholders/coffee/
cp ~/Downloads/qwikker-placeholders/bar/*.webp public/placeholders/bar/
cp ~/Downloads/qwikker-placeholders/barber/*.webp public/placeholders/barber/
```

**Expected structure:**
```
/public/placeholders/
  /restaurant/
    restaurant-abstract-01.v1.webp (65KB)
    restaurant-abstract-02.v1.webp (70KB)
    ...
    restaurant-abstract-10.v1.webp (68KB)
  /coffee/
    coffee-abstract-01.v1.webp (58KB)
    ...
  /bar/
    bar-abstract-01.v1.webp (72KB)
    ...
  /barber/
    barber-abstract-01.v1.webp (60KB)
    ...
```

---

### Step 5: Verify Integration

The code is already set up! Just verify the filenames match the constants in `lib/constants/category-placeholders.ts`.

**Expected format:**
```typescript
{ id: 1, filename: 'restaurant-abstract-01.v1.webp', description: 'Elegant cutlery detail' }
```

**Actual file:**
```
public/placeholders/restaurant/restaurant-abstract-01.v1.webp
```

If filenames don't match, either:
- **Option A:** Rename files to match constants
- **Option B:** Update constants to match files

---

### Step 6: Test Locally

```bash
# Start dev server
pnpm dev

# Visit discover page
# Unclaimed businesses should show placeholders
# Check Network tab: images should be ~60-80KB
```

---

### Step 7: Commit & Deploy

```bash
git add public/placeholders/
git add lib/constants/category-placeholders.ts  # if you updated
git commit -m "Add AI-generated category placeholders for unclaimed businesses (24 images)"
git push
```

---

## Prompt Templates for ChatGPT

### Restaurant Category
```
Generate 6 dark, moody, abstract restaurant detail shots in 16:9 aspect ratio:
1. Elegant silver cutlery with warm bokeh background
2. Wine glass reflection on dark table
3. Pasta detail with shallow depth of field
4. Bread basket texture close-up
5. Silverware pattern from above
6. Candle light bokeh with plate edge

Style: cinematic, dark premium, subtle grain, no people, no text, no recognizable branding
Color palette: blacks, deep browns, warm golds
```

### Coffee Category
```
Generate 6 dark, moody, abstract coffee shop detail shots in 16:9 aspect ratio:
1. Steam rising from coffee cup (dark background)
2. Latte art top-down view
3. Coffee beans texture close-up
4. Espresso cup handle detail with bokeh
5. Coffee pour stream close-up
6. Milk foam texture macro

Style: cinematic, dark premium, subtle grain, no people, no text
Color palette: blacks, deep browns, cream tones
```

### Bar Category
```
Generate 6 dark, moody, abstract bar detail shots in 16:9 aspect ratio:
1. Wine glass with bokeh lights behind
2. Cocktail glass detail with garnish
3. Bottles backlit on bar shelf
4. Whiskey glass with ice close-up
5. Citrus garnish macro
6. Liquid pour stream close-up

Style: cinematic, dark premium, subtle grain, no people, no text
Color palette: blacks, deep purples, amber lights
```

### Barber Category
```
Generate 6 dark, moody, abstract barber shop detail shots in 16:9 aspect ratio:
1. Scissors silhouette with dramatic lighting
2. Vintage comb close-up
3. Straight razor detail
4. Brush bristles macro
5. Clippers detail with selective focus
6. Leather chair texture close-up

Style: cinematic, dark premium, subtle grain, no people, no text
Color palette: blacks, silvers, deep leather browns
```

---

## Quality Checklist (Before Committing)

For each image, verify:

✅ **File size:** 40-100KB (ideally 60-80KB)  
✅ **Format:** WebP  
✅ **Dimensions:** Max 800px width (automatically handled by resize)  
✅ **Content:** Abstract detail (no recognizable venues/brands/people)  
✅ **Mood:** Dark, moody, premium (matches QWIKKER UI)  
✅ **Naming:** `[category]-abstract-[01-10].v1.webp`  
✅ **Location:** `/public/placeholders/[category]/`  
✅ **Consistency:** All images in a category feel cohesive  

---

## Timeline Estimate

**Test Batch (24 images):**
- ChatGPT generation: 10 minutes (4 prompts × 6 images)
- Download & organize: 5 minutes
- Batch WebP conversion: 5 minutes
- Move to project & verify: 5 minutes
- Test locally: 5 minutes
- **Total: ~30 minutes**

**Full Pack (120 images):**
- ChatGPT generation: 30 minutes (10 categories × 12 images)
- Batch processing: 15 minutes
- Verification & testing: 15 minutes
- **Total: ~60 minutes**

**vs. manual stock sourcing:** 8+ hours

---

## Next Steps

1. **Ask ChatGPT:** "Generate the 24 test images now" (provide prompt templates above)
2. **Download & convert** to WebP
3. **Move to `/public/placeholders/`**
4. **Test on dev server**
5. **If approved:** Expand to full 120-image pack
6. **Commit & deploy**

---

**Status:** Ready to generate! 🚀

