# Placeholder Image Sourcing & Optimization Guide

## ⚠️ RECOMMENDED APPROACH: AI Generation

**This guide covers manual sourcing from stock libraries (Unsplash, Pexels). However, AI-generated abstract placeholders are now the recommended approach for QWIKKER because:**

✅ **Faster:** 30 minutes vs. 2-4 hours  
✅ **Consistent style:** All 120 images match your dark, premium brand  
✅ **Zero licensing issues:** No attribution, no tracking  
✅ **Truly abstract:** No risk of "this looks like a real venue"  
✅ **Unique to QWIKKER:** Not overused stock photos  

**To generate AI placeholders:** Use ChatGPT or similar with prompts like:
- "Generate 6 dark, moody, abstract restaurant detail shots: cutlery bokeh, wine glass reflections, subtle grain, no people, 16:9, premium aesthetic"
- Batch generate 6 images per category for consistency
- Convert to WebP (~60-80KB) using Squoosh.app or `cwebp`
- Drop into `/public/placeholders/[category]/`

**The rest of this guide is for reference if you prefer manual stock sourcing.**

---

## Target: 40-100KB per Image (Not 200KB!)

ChatGPT is right - 200KB is too high. Here's how to achieve **40-100KB per image** at card display size:

---

## Image Specifications

### Dimensions
- **Width:** 800px (max)
- **Height:** 600px (max)
- **Aspect ratio:** 4:3 or 16:9 (flexible)
- **Why?** Cards display at ~400-600px wide on most devices. 800px is plenty for 2x retina displays.

### Format
- **WebP only** (30-50% smaller than JPEG)
- **Quality:** 70-80%
- **Compression:** Lossy

### Target File Size
- **Goal:** 60-80KB per image
- **Max:** 100KB
- **Absolute min:** 40KB (below this, quality degrades)

### Color Profile
- **sRGB** (standard web)
- **Bit depth:** 8-bit (no need for 16-bit)

---

## Where to Source Images

### 1. Unsplash (Recommended)
- **License:** Free for commercial use
- **Quality:** Excellent
- **Search tips:**
  - Use specific detail terms: "cutlery macro", "coffee steam close up", "wine glass bokeh"
  - Filter by orientation: Landscape or Square
  - Look for abstract/artistic shots (not recognizable venues)

**Example Searches by Category:**

#### 🍽️ Restaurant
```
- "elegant cutlery close up"
- "wine glass on table dark mood"
- "pasta detail shot"
- "bread basket texture"
- "silverware pattern top view"
- "plate edge detail"
- "napkin fold elegant"
- "candle light bokeh"
- "herb garnish macro"
- "sauce drizzle close up"
```

#### ☕ Café/Coffee
```
- "coffee steam rising dark"
- "latte art top view"
- "coffee beans texture"
- "espresso cup detail"
- "coffee pour close up"
- "pastry crumb detail"
- "saucer pattern top view"
- "coffee grinder close up"
- "sugar crystals macro"
- "milk foam texture"
```

#### 🍷 Bar
```
- "wine glass bokeh"
- "cocktail detail dark"
- "bottles backlit bar"
- "whiskey glass close up"
- "ice cube macro"
- "citrus garnish cocktail"
- "glass rim salt detail"
- "bottle cap close up"
- "liquid pour stream"
- "cork texture close up"
```

#### ✂️ Barber/Salon
```
- "scissors silhouette dark"
- "comb close up"
- "razor detail vintage"
- "brush bristles macro"
- "clippers detail"
- "leather texture barber"
- "towel stack detail"
- "mirror reflection barber"
- "barber tools arrangement"
- "shaving brush close up"
```

### 2. Pexels
- **License:** Free for commercial use
- **Quality:** Good
- **Similar to Unsplash, slightly smaller library**

### 3. Pixabay
- **License:** Free (Pixabay License)
- **Quality:** Variable, but decent options

---

## Optimization Workflow

### Step 1: Download High-Res Image
Download the **medium size** (not largest) from Unsplash:
- Typically 1920x1280 or similar
- This gives you headroom for cropping

### Step 2: Crop & Resize
Use any tool (Photoshop, GIMP, Squoosh.app):
1. Crop to interesting detail (remove distractions)
2. Resize to **800x600px** (or similar aspect ratio)
3. Ensure focus is on the abstract detail (not a recognizable location)

### Step 3: Convert to WebP
#### Option A: Online Tool (Easy)
- **Squoosh.app** (Google's free tool)
  1. Upload image
  2. Select "WebP" format
  3. Set quality to **75%**
  4. Check file size in bottom-right (aim for 60-80KB)
  5. Adjust quality slider if needed
  6. Download

#### Option B: CLI Tool (Batch Processing)
Install `cwebp` (part of libwebp):
```bash
# macOS
brew install webp

# Convert single image
cwebp -q 75 input.jpg -o restaurant-abstract-01.v1.webp

# Batch convert all JPGs in folder
for f in *.jpg; do cwebp -q 75 "$f" -o "${f%.jpg}.v1.webp"; done
```

#### Option C: ImageMagick (Advanced)
```bash
# macOS
brew install imagemagick

# Convert with optimization
magick input.jpg -resize 800x600 -quality 75 restaurant-abstract-01.v1.webp
```

### Step 4: Verify File Size
```bash
ls -lh restaurant-abstract-01.v1.webp
# Should show: ~60-80KB
```

If over 100KB:
- Lower quality to 70% or 65%
- Reduce dimensions to 700x525px

If under 40KB:
- Raise quality to 80% or 85%
- Image might be too simple (try a richer detail shot)

---

## Naming Convention

**Format:** `[category]-abstract-[number].v[version].webp`

### Examples:
```
restaurant-abstract-01.v1.webp
restaurant-abstract-02.v1.webp
coffee-abstract-01.v1.webp
bar-abstract-01.v1.webp
barber-abstract-01.v1.webp
```

**Rules:**
- Lowercase category
- Zero-padded numbers (01, 02, not 1, 2)
- Version starts at v1
- Always `.webp` extension

---

## Folder Structure

```
/public/placeholders/
  /restaurant/
    restaurant-abstract-01.v1.webp (60KB)
    restaurant-abstract-02.v1.webp (65KB)
    restaurant-abstract-03.v1.webp (70KB)
    ...
    restaurant-abstract-10.v1.webp (75KB)
  /coffee/
    coffee-abstract-01.v1.webp (58KB)
    coffee-abstract-02.v1.webp (62KB)
    ...
  /bar/
    bar-abstract-01.v1.webp (68KB)
    ...
  /barber/
    barber-abstract-01.v1.webp (72KB)
    ...
```

**Total Storage Estimate:**
- 10 images × 4 categories = 40 images
- ~70KB average per image
- **Total: ~2.8MB** (very reasonable for git repo)

---

## Quality Checklist

Before committing an image, verify:

✅ **File size:** 40-100KB (ideally 60-80KB)  
✅ **Format:** WebP  
✅ **Dimensions:** Max 800px width  
✅ **Content:** Abstract detail (no recognizable venues/brands)  
✅ **Mood:** Dark, moody, premium (matches QWIKKER UI)  
✅ **Focus:** Sharp detail (not blurry/generic)  
✅ **Naming:** Correct format with .v1.webp  
✅ **Location:** Correct `/public/placeholders/[category]/` folder  

---

## Art Direction Guidelines

### ✅ DO:
- **Close-ups and macro shots** (fill the frame)
- **Dark/moody lighting** (matches your UI)
- **Selective focus** (bokeh backgrounds)
- **Textures and patterns** (visual interest)
- **Neutral/abstract** (no specific branding)
- **High contrast** (pops on cards)

### ❌ DON'T:
- Wide shots of venues (too recognizable)
- Bright/overexposed images (clashes with dark UI)
- Generic stock photos (boring)
- Images with text/logos (branding issues)
- People's faces (privacy/misrepresentation)
- Dated/cheesy aesthetics (hurts brand)

---

## Example Perfect Placeholder

**Category:** Restaurant  
**Search Term:** "elegant cutlery close up dark"  
**Unsplash Result:** Fork and knife on dark tablecloth, selective focus, warm candlelight bokeh in background  
**Downloaded Size:** 1920x1280, 800KB  
**After Processing:**
- Crop to just fork tines in focus
- Resize to 800x600px
- Convert to WebP at 75% quality
- **Final:** 68KB, sharp detail, moody, abstract

**Perfect!** Commit to `/public/placeholders/restaurant/restaurant-abstract-01.v1.webp`

---

## Batch Processing Script (Optional)

If you're processing many images at once:

```bash
#!/bin/bash
# optimize-placeholders.sh

# Usage: ./optimize-placeholders.sh input_folder output_category
# Example: ./optimize-placeholders.sh ~/Downloads/restaurant restaurant

INPUT_DIR=$1
CATEGORY=$2
OUTPUT_DIR="public/placeholders/${CATEGORY}"

mkdir -p $OUTPUT_DIR

counter=1
for file in "$INPUT_DIR"/*.{jpg,jpeg,png,JPG,JPEG,PNG}; do
  [ -e "$file" ] || continue
  
  padded=$(printf "%02d" $counter)
  output="${OUTPUT_DIR}/${CATEGORY}-abstract-${padded}.v1.webp"
  
  # Resize to 800px width, maintain aspect ratio, convert to WebP at 75% quality
  magick "$file" -resize 800x -quality 75 "$output"
  
  size=$(ls -lh "$output" | awk '{print $5}')
  echo "✅ Created: $output ($size)"
  
  counter=$((counter + 1))
done

echo "🎉 Done! Processed $((counter - 1)) images."
```

**Make it executable:**
```bash
chmod +x optimize-placeholders.sh
```

**Run it:**
```bash
./optimize-placeholders.sh ~/Downloads/restaurant-images restaurant
```

---

## Need Help?

If you're struggling to find the right images or optimize them, let me know and I can:
- Suggest specific Unsplash images by URL
- Adjust the art direction guidelines
- Help with batch processing commands

---

## Next Steps

1. **Source 10 images for "restaurant" category** (test with one category first)
2. **Optimize to 60-80KB each**
3. **Commit to repo**
4. **Test on dev server** (check visual quality at card size)
5. **Repeat for remaining categories**

**Estimated time:** 30-60 minutes per category (10 images)  
**Total for 4 categories:** 2-4 hours of careful sourcing and optimization

