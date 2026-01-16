#!/bin/bash
# Generate neutral default placeholder image for categories without dedicated images
# Creates a simple abstract gradient (16:9, WebP format)

OUTPUT_FILE="public/placeholders/default/00.webp"

echo "🎨 Generating neutral default placeholder..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Install it first:"
    echo "   macOS: brew install imagemagick"
    echo "   Linux: apt-get install imagemagick"
    exit 1
fi

# Create a 1920x1080 (16:9) abstract gradient
# Using neutral slate/gray colors to match Qwikker's dark theme
convert -size 1920x1080 \
    gradient:'#1e293b-#334155' \
    -blur 0x8 \
    -quality 85 \
    "$OUTPUT_FILE"

if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
    echo "✅ Created: $OUTPUT_FILE ($FILE_SIZE)"
    echo "   Resolution: 1920x1080 (16:9)"
    echo "   Format: WebP"
    echo "   Colors: Neutral slate gradient"
else
    echo "❌ Failed to create placeholder"
    exit 1
fi
