#!/bin/bash

# Fix incorrect import path for createServiceRoleClient
# Changes: @/lib/supabase/service-role-client → @/lib/supabase/server

echo "🔧 Fixing createServiceRoleClient imports..."
echo ""

# Find all TypeScript files with the incorrect import
FILES=$(grep -r -l "from '@/lib/supabase/service-role-client'" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v "scripts/")

if [ -z "$FILES" ]; then
    echo "✅ No files found with incorrect imports!"
    exit 0
fi

# Count files
COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo "Found $COUNT files with incorrect imports"
echo ""

# Show files that will be updated
echo "Files to be updated:"
echo "$FILES" | while read file; do
    echo "  - $file"
done

echo ""
read -p "Continue with fix? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Perform the replacement
FIXED=0
echo "$FILES" | while read file; do
    if [ -f "$file" ]; then
        # Use sed to replace the import path
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|from '@/lib/supabase/service-role-client'|from '@/lib/supabase/server'|g" "$file"
        else
            # Linux
            sed -i "s|from '@/lib/supabase/service-role-client'|from '@/lib/supabase/server'|g" "$file"
        fi
        echo "✅ Fixed: $file"
        ((FIXED++))
    fi
done

echo ""
echo "✅ Fixed $COUNT files"
echo ""
echo "Run 'pnpm build' to verify the fix worked"
