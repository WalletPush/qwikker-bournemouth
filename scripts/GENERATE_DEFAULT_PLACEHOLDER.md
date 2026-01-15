# Generate Neutral Default Placeholder Image

The default placeholder (`/public/placeholders/default/00.webp`) is used for categories that don't have dedicated images (salon, pub, tattoo, fitness, etc.).

**Current issue:** It shows a cafe/coffee image (category-specific)  
**Needed:** Neutral, abstract, non-category-specific image

---

## Option 1: Using ImageMagick (Recommended)

### Install ImageMagick:
```bash
# macOS
brew install imagemagick

# Linux
sudo apt-get install imagemagick
```

### Run the script:
```bash
chmod +x scripts/generate-default-placeholder.sh
./scripts/generate-default-placeholder.sh
```

This creates a neutral slate gradient (matches Qwikker's dark theme).

---

## Option 2: Using Existing Image (Quick Fallback)

Copy and desaturate an existing neutral placeholder:

```bash
# Copy barber placeholder (neutral - shows tools, not hair)
cp public/placeholders/barber/00.webp public/placeholders/default/00.webp
```

OR manually:
1. Open `public/placeholders/barber/00.webp` in an image editor
2. Apply: Desaturate/Grayscale + slight blur
3. Save as: `public/placeholders/default/00.webp`
4. Quality: 85%, WebP format

---

## Option 3: Online Tool (No Install)

1. Visit: https://www.photopea.com/ (free online editor)
2. Create new image: **1920 × 1080px**
3. Add: Gradient (#1e293b → #334155)
4. Apply: Gaussian blur (~8px radius)
5. Export as WebP (85% quality)
6. Save to: `/public/placeholders/default/00.webp`

---

## Option 4: Use Figma/Design Tool

1. Create artboard: **1920 × 1080px** (16:9)
2. Add rectangle with linear gradient:
   - Color 1: `#1e293b` (slate-800)
   - Color 2: `#334155` (slate-700)
3. Apply blur effect (~8px)
4. Export as WebP (85% quality)
5. Save to: `/public/placeholders/default/00.webp`

---

## Requirements:

✅ **Resolution:** 1920 × 1080px (16:9 aspect ratio)  
✅ **Format:** WebP  
✅ **Quality:** 80-90%  
✅ **Style:** Neutral, abstract, no category-specific imagery  
✅ **Colors:** Slate/gray to match Qwikker dark theme  
✅ **File size:** < 50KB (ideally ~20-30KB)  

---

## Verify:

After creating the image:

```bash
# Check file exists and size
ls -lh public/placeholders/default/00.webp

# Verify dimensions (requires ImageMagick)
identify public/placeholders/default/00.webp

# Expected output:
# public/placeholders/default/00.webp WEBP 1920x1080 ...
```

Then restart dev server and test:
```
http://localhost:3000/dev/placeholders
```

Look for `salon` category - should show the new neutral default.

---

## What NOT to do:

❌ Don't use food/drink imagery  
❌ Don't use hair/beauty imagery  
❌ Don't use bright colors  
❌ Don't use brand logos  
❌ Don't use text  
❌ Don't make it category-specific  

✅ Keep it neutral, abstract, and professional

