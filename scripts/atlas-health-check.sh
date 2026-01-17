#!/bin/bash
# Atlas System Health Check
# Quick validation that Atlas is configured correctly

set -e

echo "🔍 ATLAS SYSTEM HEALTH CHECK"
echo "=============================="
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if we're in project root
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Run this script from project root"
    exit 1
fi

echo "1️⃣  Checking migrations..."
if [ -f "supabase/migrations/20260117000001_add_atlas_to_franchise_configs.sql" ]; then
    echo "   ✓ Atlas franchise config migration exists"
else
    echo "   ❌ Missing: 20260117000001_add_atlas_to_franchise_configs.sql"
fi

if [ -f "supabase/migrations/20260117000002_add_atlas_analytics.sql" ]; then
    echo "   ✓ Atlas analytics migration exists"
else
    echo "   ❌ Missing: 20260117000002_add_atlas_analytics.sql"
fi

echo ""
echo "2️⃣  Checking API routes..."
api_routes=(
    "app/api/tenant/config/route.ts"
    "app/api/atlas/search/route.ts"
    "app/api/atlas/analytics/route.ts"
    "app/api/hqadmin/atlas/metrics/route.ts"
    "app/api/admin/atlas/metrics/route.ts"
    "app/api/dashboard/atlas/metrics/route.ts"
)

for route in "${api_routes[@]}"; do
    if [ -f "$route" ]; then
        echo "   ✓ $route"
    else
        echo "   ❌ Missing: $route"
    fi
done

echo ""
echo "3️⃣  Checking components..."
components=(
    "components/atlas/AtlasMode.tsx"
    "components/atlas/AtlasOverlay.tsx"
    "components/atlas/ChatContextStrip.tsx"
    "components/dashboard/MapDiscoveryWidget.tsx"
    "components/hqadmin/AtlasConfigSection.tsx"
)

for comp in "${components[@]}"; do
    if [ -f "$comp" ]; then
        echo "   ✓ $comp"
    else
        echo "   ❌ Missing: $comp"
    fi
done

echo ""
echo "4️⃣  Checking lib utilities..."
lib_files=(
    "lib/atlas/useTenantAtlasConfig.ts"
    "lib/atlas/useAtlasAnalytics.ts"
    "lib/atlas/usePerformanceMode.ts"
    "lib/location/useUserLocation.ts"
)

for lib in "${lib_files[@]}"; do
    if [ -f "$lib" ]; then
        echo "   ✓ $lib"
    else
        echo "   ❌ Missing: $lib"
    fi
done

echo ""
echo "5️⃣  Checking sound assets..."
sounds=(
    "public/sfx/atlas-wake.mp3"
    "public/sfx/atlas-move.mp3"
    "public/sfx/atlas-arrive.mp3"
)

for sound in "${sounds[@]}"; do
    if [ -f "$sound" ]; then
        echo "   ✓ $sound"
    else
        echo "   ⚠  Optional: $sound (can add later)"
    fi
done

echo ""
echo "6️⃣  Checking documentation..."
if [ -f "docs/ATLAS_V1.md" ]; then
    echo "   ✓ Atlas v1 documentation"
else
    echo "   ⚠  Missing: docs/ATLAS_V1.md"
fi

if [ -f "docs/ATLAS_ROLLOUT_IMPLEMENTATION.md" ]; then
    echo "   ✓ Rollout implementation docs"
else
    echo "   ⚠  Missing: docs/ATLAS_ROLLOUT_IMPLEMENTATION.md"
fi

if [ -f "docs/ATLAS_COMPLETE_SUMMARY.md" ]; then
    echo "   ✓ Complete summary"
else
    echo "   ⚠  Missing: docs/ATLAS_COMPLETE_SUMMARY.md"
fi

echo ""
echo "=============================="
echo "✅ HEALTH CHECK COMPLETE"
echo ""
echo "Next steps:"
echo "  1. Run: pnpm dev"
echo "  2. Access HQ Admin: http://localhost:3000/hqadmin"
echo "  3. Configure Atlas for your city franchise"
echo "  4. Test Atlas in AI Companion"
echo ""
