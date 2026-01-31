#!/bin/bash

# Convert PNG/JPG placeholder images to WebP format
# Usage: ./scripts/convert-placeholders-to-webp.sh

set -e

PLACEHOLDERS_DIR="public/placeholders"

echo "🔍 Scanning for PNG/JPG files in $PLACEHOLDERS_DIR..."

# Check if ImageMagick or cwebp is installed
if ! command -v convert &> /dev/null && ! command -v cwebp &> /dev/null; then
    echo "❌ Error: Neither ImageMagick nor cwebp is installed."
    echo ""
    echo "Install one of these:"
    echo "  macOS:   brew install imagemagick"
    echo "  macOS:   brew install webp"
    echo ""
    exit 1
fi

# Determine which tool to use
if command -v cwebp &> /dev/null; then
    TOOL="cwebp"
    echo "✅ Using cwebp (Google's WebP encoder)"
elif command -v convert &> /dev/null; then
    TOOL="imagemagick"
    echo "✅ Using ImageMagick"
fi

# Counter
converted=0
skipped=0

# Find all PNG and JPG files
find "$PLACEHOLDERS_DIR" -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) | while read -r file; do
    # Get directory and filename without extension
    dir=$(dirname "$file")
    filename=$(basename "$file")
    name="${filename%.*}"
    ext="${filename##*.}"
    
    # Output path
    output="$dir/$name.webp"
    
    # Skip if webp already exists
    if [ -f "$output" ]; then
        echo "⏭️  Skipping $filename (webp already exists)"
        ((skipped++))
        continue
    fi
    
    echo "🔄 Converting: $filename → $name.webp"
    
    # Convert based on tool
    if [ "$TOOL" = "cwebp" ]; then
        # cwebp: quality 85, resize to max 1600x900 if larger
        cwebp -q 85 -resize 1600 900 "$file" -o "$output" 2>/dev/null
    else
        # ImageMagick: quality 85%, resize to fit 1600x900
        convert "$file" -resize 1600x900\> -quality 85 "$output"
    fi
    
    # Get file sizes
    original_size=$(du -h "$file" | cut -f1)
    new_size=$(du -h "$output" | cut -f1)
    
    echo "   ✅ Done! Original: $original_size → WebP: $new_size"
    
    # Ask if user wants to delete original
    read -p "   🗑️  Delete original $filename? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm "$file"
        echo "   ✅ Deleted $filename"
    else
        echo "   ⏭️  Kept $filename"
    fi
    
    ((converted++))
done

echo ""
echo "✨ Conversion complete!"
echo "   📊 Converted: $converted files"
echo "   ⏭️  Skipped: $skipped files"
echo ""
echo "Next steps:"
echo "1. Check the converted images in $PLACEHOLDERS_DIR"
echo "2. Update components/admin/placeholder-selector.tsx if you added new variants"
echo "3. Test in Admin → Unclaimed Listings → Placeholder Selector"
