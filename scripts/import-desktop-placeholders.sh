#!/bin/bash

# Import placeholder images from Desktop
# This will move/convert images from ~/Desktop/[category]/ to public/placeholders/[category]/

set -e

DESKTOP_FOLDERS=(
    "restaurant"
    "cafe"
    "bakery"
    "bar"
    "dessert"
    "barber"
    "salon/spa"  # Will be renamed to "salon"
    "wellness"
    "entertainment"
    "pub"
    "tattoo"
)

TARGET_DIR="public/placeholders"
DESKTOP_DIR="$HOME/Desktop"

echo "🚀 Placeholder Image Importer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for cwebp
if ! command -v cwebp &> /dev/null; then
    echo "❌ Error: cwebp not found"
    echo "   Install: brew install webp"
    exit 1
fi

echo "✅ cwebp found"
echo ""

# Process each folder
for folder in "${DESKTOP_FOLDERS[@]}"; do
    # Handle special case: "salon/spa" → "salon"
    if [ "$folder" = "salon/spa" ]; then
        desktop_folder="$DESKTOP_DIR/salon"
        if [ ! -d "$desktop_folder" ]; then
            desktop_folder="$DESKTOP_DIR/spa"
        fi
        target_category="salon"
    else
        desktop_folder="$DESKTOP_DIR/$folder"
        target_category="$folder"
    fi
    
    # Check if desktop folder exists
    if [ ! -d "$desktop_folder" ]; then
        echo "⏭️  Skipping $folder (folder not found at $desktop_folder)"
        continue
    fi
    
    echo "📁 Processing: $folder"
    echo "   Source: $desktop_folder"
    echo "   Target: $TARGET_DIR/$target_category"
    
    # Create target directory
    mkdir -p "$TARGET_DIR/$target_category"
    
    # Track files
    moved_webp=0
    converted_png=0
    
    # Copy existing .webp files
    if ls "$desktop_folder"/*.webp 1> /dev/null 2>&1; then
        echo "   📦 Copying existing .webp files..."
        for webp_file in "$desktop_folder"/*.webp; do
            filename=$(basename "$webp_file")
            cp "$webp_file" "$TARGET_DIR/$target_category/$filename"
            echo "      ✅ Copied: $filename"
            ((moved_webp++))
        done
    fi
    
    # Convert .png files
    if ls "$desktop_folder"/*.png 1> /dev/null 2>&1; then
        echo "   🔄 Converting .png files to .webp..."
        for png_file in "$desktop_folder"/*.png; do
            filename=$(basename "$png_file")
            name="${filename%.*}"
            output="$TARGET_DIR/$target_category/$name.webp"
            
            # Skip if webp already exists
            if [ -f "$output" ]; then
                echo "      ⏭️  $filename (webp already exists)"
                continue
            fi
            
            # Convert
            cwebp -q 85 -resize 1600 900 "$png_file" -o "$output" 2>/dev/null
            
            original_size=$(du -h "$png_file" | cut -f1)
            new_size=$(du -h "$output" | cut -f1)
            echo "      ✅ $filename → $name.webp ($original_size → $new_size)"
            ((converted_png++))
        done
    fi
    
    # Convert .jpg files
    if ls "$desktop_folder"/*.jpg 1> /dev/null 2>&1 || ls "$desktop_folder"/*.jpeg 1> /dev/null 2>&1; then
        echo "   🔄 Converting .jpg files to .webp..."
        for jpg_file in "$desktop_folder"/*.jpg "$desktop_folder"/*.jpeg; do
            [ -f "$jpg_file" ] || continue
            filename=$(basename "$jpg_file")
            name="${filename%.*}"
            output="$TARGET_DIR/$target_category/$name.webp"
            
            # Skip if webp already exists
            if [ -f "$output" ]; then
                echo "      ⏭️  $filename (webp already exists)"
                continue
            fi
            
            # Convert
            cwebp -q 85 -resize 1600 900 "$jpg_file" -o "$output" 2>/dev/null
            
            original_size=$(du -h "$jpg_file" | cut -f1)
            new_size=$(du -h "$output" | cut -f1)
            echo "      ✅ $filename → $name.webp ($original_size → $new_size)"
            ((converted_png++))
        done
    fi
    
    # Show final count
    total_files=$(ls "$TARGET_DIR/$target_category"/*.webp 2>/dev/null | wc -l | xargs)
    echo "   ✨ $target_category: $total_files variants (copied: $moved_webp, converted: $converted_png)"
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Import complete!"
echo ""
echo "📊 Summary by category:"
for folder in "${DESKTOP_FOLDERS[@]}"; do
    # Handle special case: "salon/spa" → "salon"
    if [ "$folder" = "salon/spa" ]; then
        target_category="salon"
    else
        target_category="$folder"
    fi
    
    if [ -d "$TARGET_DIR/$target_category" ]; then
        count=$(ls "$TARGET_DIR/$target_category"/*.webp 2>/dev/null | wc -l | xargs)
        if [ "$count" -gt 0 ]; then
            echo "   $target_category: $count variants"
        fi
    fi
done
echo ""
echo "🎯 Next steps:"
echo "1. Run: ls -la public/placeholders/* to verify"
echo "2. Update components/admin/placeholder-selector.tsx if you have > 3 variants"
echo "3. Test in Admin → Unclaimed Listings → Placeholder Selector"
echo "4. Delete Desktop folders once confirmed: rm -rf ~/Desktop/{restaurant,cafe,bar,...}"
