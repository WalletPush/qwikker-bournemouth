# SOCIAL WIZARD — BACKGROUND IMAGES SETUP

The current implementation uses placeholder paths for background images. Here's how to add real images:

## Option 1: Use Simple Solid/Gradient Backgrounds (Fastest)

Create simple dark background images using any image editor or online tool:

### Recommended Backgrounds:
1. **bg-dark-1.jpg** — Solid dark gray (#1a1a1a) or subtle gradient
2. **bg-dark-2.jpg** — Dark blue gradient (#1a1a2e to #0f3460)
3. **bg-dark-3.jpg** — Dark orange gradient (#2d1b00 to #1a1a1a)

### Specs:
- Size: 600x600px (minimum) or 1200x1200px (better quality)
- Format: JPG or PNG
- Color: Dark tones (to ensure white text is readable)
- File size: Keep under 200KB for performance

## Option 2: Use Stock Images (Premium Look)

### Recommended Sources:
- **Unsplash** (free, high quality): unsplash.com
- **Pexels** (free): pexels.com
- **Pixabay** (free): pixabay.com

### Search Terms:
- "dark abstract background"
- "dark texture"
- "food photography dark background"
- "restaurant ambiance dark"
- "premium dark surface"

### Image Requirements:
- Dark-toned (to support white text)
- Abstract or subtle patterns (not busy)
- Orientation: Square (1:1) or crop to square
- Resolution: 1200x1200px
- File format: JPG (optimized for web)

## Option 3: Use Existing Qwikker Images

If you have existing placeholder images in your codebase, you can reference them:

1. Search for existing placeholders:
```bash
find public/images -name "*placeholder*" -o -name "*bg*"
```

2. Update paths in `VisualCanvas.tsx`:
```typescript
const PLACEHOLDER_BACKGROUNDS = [
  '/images/placeholders/your-existing-bg-1.jpg',
  '/images/placeholders/your-existing-bg-2.jpg',
  '/images/placeholders/your-existing-bg-3.jpg'
]
```

## Quick Setup Steps

### 1. Download or Create 3 Background Images

Use any of the methods above to get 3 dark-toned images.

### 2. Optimize Images (Recommended)

Before adding to your project, optimize file size:

**Using online tools:**
- TinyPNG: https://tinypng.com/
- Squoosh: https://squoosh.app/

**Using command line (ImageMagick):**
```bash
# Install ImageMagick (if not installed)
brew install imagemagick

# Resize and optimize
convert input.jpg -resize 1200x1200^ -gravity center -extent 1200x1200 -quality 85 output.jpg
```

### 3. Add Images to Project

Place the 3 optimized images in:
```
public/images/social-wizard/
├── bg-dark-1.jpg
├── bg-dark-2.jpg
└── bg-dark-3.jpg
```

### 4. Test

1. Start dev server: `pnpm dev`
2. Navigate to Social Wizard
3. Generate a post
4. Click through the 3 background options
5. Verify images load and text is readable

## Fallback (If No Images Available)

The canvas is already set to use a solid dark background (#1a1a1a) if images fail to load. The feature will work without images, just less visually appealing.

## Future Enhancement: Upload Custom Background

The UI has a placeholder "Upload Custom Background" button. To implement:

1. Add file upload handler to `VisualCanvas.tsx`
2. Upload to Cloudinary using existing `uploadToCloudinary` utility
3. Add uploaded URL to canvas background options
4. Optionally save to business profile for reuse

---

**Quick Start (No Images):**

If you want to launch without custom backgrounds, the feature will work with the solid dark gray default. You can add premium backgrounds later without code changes—just drop JPG files in `public/images/social-wizard/`.
