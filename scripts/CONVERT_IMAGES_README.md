# How to Convert Images to WebP

You have **cwebp** already installed! ✅

## 3 Easy Ways to Convert

### 🚀 Method 1: Quick Drag & Drop (EASIEST)

```bash
# 1. Drag and drop your PNG/JPG files onto this command:
./scripts/quick-convert-webp.sh your-image.png

# 2. Or convert multiple at once:
./scripts/quick-convert-webp.sh image1.png image2.jpg image3.png
```

**Example:**
```bash
./scripts/quick-convert-webp.sh ~/Downloads/restaurant-01.png
# ✅ Creates: ~/Downloads/restaurant-01.webp
```

---

### 📁 Method 2: Convert Entire Folders

```bash
# Convert ALL PNG/JPG files in public/placeholders/
./scripts/convert-placeholders-to-webp.sh
```

This will:
- Find all .png and .jpg files
- Convert them to .webp
- Ask if you want to delete the originals
- Show you the file size savings

---

### ⚡ Method 3: Manual Conversion (Most Control)

```bash
# Basic conversion (quality 85%, auto-resize to max 1600x900)
cwebp -q 85 -resize 1600 900 input.png -o output.webp

# High quality (quality 90%)
cwebp -q 90 input.png -o output.webp

# Smaller file size (quality 75%)
cwebp -q 75 input.png -o output.webp
```

---

## Step-by-Step: Adding New Placeholder Images

### Example: Adding "pub" placeholders

1. **Get your images ready** (PNG or JPG is fine)
   ```
   ~/Downloads/
   ├── pub-default.png
   ├── pub-cozy.png
   └── pub-garden.png
   ```

2. **Convert them to WebP**
   ```bash
   cd /Users/qwikker/qwikkerdashboard
   ./scripts/quick-convert-webp.sh ~/Downloads/pub-*.png
   ```

3. **Create the folder**
   ```bash
   mkdir -p public/placeholders/pub
   ```

4. **Move and rename the files**
   ```bash
   mv ~/Downloads/pub-default.webp public/placeholders/pub/00.webp
   mv ~/Downloads/pub-cozy.webp public/placeholders/pub/01.webp
   mv ~/Downloads/pub-garden.webp public/placeholders/pub/02.webp
   ```

5. **Verify**
   ```bash
   ls -lh public/placeholders/pub/
   # Should show: 00.webp, 01.webp, 02.webp
   ```

6. **Update the selector component** (if adding more than 3 variants)
   Edit: `components/admin/placeholder-selector.tsx`

7. **Test**
   - Go to Admin → Unclaimed Listings
   - Open any business with `system_category = "pub"`
   - Check the Placeholder Selector dropdown

---

## Quick Reference

```bash
# Check if cwebp is installed
which cwebp

# Convert one file
cwebp -q 85 input.png -o output.webp

# Convert and resize
cwebp -q 85 -resize 1600 900 input.png -o output.webp

# Batch convert (current directory)
for file in *.png; do 
  cwebp -q 85 "$file" -o "${file%.png}.webp"
done
```

---

## File Size Tips

- **Quality 85** = Good balance (default)
- **Quality 90** = High quality, larger file
- **Quality 75** = Smaller file, slightly lower quality
- **Resize 1600x900** = Max dimensions (maintains aspect ratio)

**Target:** < 150KB per image (ideally < 100KB)

---

## Need Help?

Run the scripts without arguments to see usage:

```bash
./scripts/quick-convert-webp.sh
# Shows: Usage instructions

./scripts/convert-placeholders-to-webp.sh
# Scans and converts all images in placeholders folder
```
