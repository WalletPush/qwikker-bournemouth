#!/bin/bash

# Quick WebP Converter - Drag and drop files onto this script!
# Or run: ./scripts/quick-convert-webp.sh path/to/image.png

set -e

echo "🖼️  Quick WebP Converter"
echo ""

# Check if ImageMagick or cwebp is installed
if ! command -v convert &> /dev/null && ! command -v cwebp &> /dev/null; then
    echo "❌ Error: You need ImageMagick or WebP tools installed."
    echo ""
    echo "📦 Install with:"
    echo "   brew install imagemagick"
    echo "   OR"
    echo "   brew install webp"
    echo ""
    exit 1
fi

# Determine which tool to use
if command -v cwebp &> /dev/null; then
    TOOL="cwebp"
    echo "✅ Using: cwebp (Google's WebP encoder)"
elif command -v convert &> /dev/null; then
    TOOL="imagemagick"
    echo "✅ Using: ImageMagick"
fi
echo ""

# If no arguments, show usage
if [ $# -eq 0 ]; then
    echo "Usage:"
    echo "  1. Drag and drop image files onto this script"
    echo "  2. Or run: ./scripts/quick-convert-webp.sh image.png"
    echo "  3. Or convert entire folder: ./scripts/convert-placeholders-to-webp.sh"
    echo ""
    exit 0
fi

# Process each file
for file in "$@"; do
    if [ ! -f "$file" ]; then
        echo "⚠️  Skipping: $file (not found)"
        continue
    fi
    
    # Check if it's an image
    ext="${file##*.}"
    ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
    
    if [[ ! "$ext_lower" =~ ^(png|jpg|jpeg)$ ]]; then
        echo "⏭️  Skipping: $file (not a PNG/JPG)"
        continue
    fi
    
    # Get output path
    dir=$(dirname "$file")
    filename=$(basename "$file")
    name="${filename%.*}"
    output="$dir/$name.webp"
    
    # Skip if exists
    if [ -f "$output" ]; then
        echo "⚠️  $filename → Already converted!"
        continue
    fi
    
    echo "🔄 Converting: $filename"
    
    # Convert
    if [ "$TOOL" = "cwebp" ]; then
        cwebp -q 85 -resize 1600 900 "$file" -o "$output" 2>/dev/null
    else
        convert "$file" -resize 1600x900\> -quality 85 "$output"
    fi
    
    # Show file sizes
    original_size=$(du -h "$file" | cut -f1)
    new_size=$(du -h "$output" | cut -f1)
    
    echo "   ✅ Created: $name.webp ($original_size → $new_size)"
    echo "   📁 Location: $output"
    echo ""
done

echo "✨ Done!"
