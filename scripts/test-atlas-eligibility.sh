#!/bin/bash
# AI + Atlas API Test Script
# Verifies tier filtering and eligibility enforcement

BASE_URL="${BASE_URL:-http://localhost:3000}"
AI_URL="$BASE_URL/api/ai/chat"
ATLAS_QUERY_URL="$BASE_URL/api/atlas/query"
ATLAS_SEARCH_URL="$BASE_URL/api/atlas/search"

echo "🔒 QWIKKER ATLAS ELIGIBILITY TEST SUITE"
echo "========================================"
echo "Base URL: $BASE_URL"
echo ""

# ============================================================================
# AI CHAT TESTS (Tier Filtering + Carousel Behavior)
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 AI CHAT API TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Broad query (conversational, no carousel unless requested)
echo "🔍 TEST 1: Broad Query - 'restaurants'"
echo "Expected: hasBusinessResults=true, carouselCount=0 (conversational)"
echo "----------------------------------------"
curl -s -X POST "$AI_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "restaurants",
    "walletPassId": null,
    "conversationHistory": []
  }' | jq '{
    hasBusinessResults,
    uiMode,
    carouselCount: (.businessCarousel | length),
    modelUsed: .metadata.modelUsed,
    tiers: [.businessCarousel[]? | .business_tier]
  }' > /tmp/test1_ai_broad.json

cat /tmp/test1_ai_broad.json
echo ""

# Test 2: Explicit map request
echo "🔍 TEST 2: Map Request - 'show me restaurants on a map'"
echo "Expected: hasBusinessResults=true, carouselCount>0, uiMode=map or suggestions"
echo "NO free_tier, tiers ordered"
echo "----------------------------------------"
curl -s -X POST "$AI_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "show me restaurants on a map",
    "walletPassId": null,
    "conversationHistory": []
  }' | jq '{
    hasBusinessResults,
    uiMode,
    carouselCount: (.businessCarousel | length),
    modelUsed: .metadata.modelUsed,
    tiers: [.businessCarousel[]? | .business_tier],
    tierCheck: {
      hasFreeT ier: ([.businessCarousel[]? | .business_tier] | any(. == "free_tier")),
      hasNull: ([.businessCarousel[]? | .business_tier] | any(. == null))
    }
  }' > /tmp/test2_ai_map.json

cat /tmp/test2_ai_map.json
echo ""

# Test 3: Non-business query
echo "🔍 TEST 3: Meta Query - 'what is Qwikker?'"
echo "Expected: hasBusinessResults=false, no carousel"
echo "----------------------------------------"
curl -s -X POST "$AI_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "what is Qwikker?",
    "walletPassId": null,
    "conversationHistory": []
  }' | jq '{
    hasBusinessResults,
    uiMode,
    carouselCount: (.businessCarousel | length),
    modelUsed: .metadata.modelUsed
  }' > /tmp/test3_ai_meta.json

cat /tmp/test3_ai_meta.json
echo ""

# ============================================================================
# ATLAS QUERY API TESTS (Spatial Responses)
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗺️  ATLAS QUERY API TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 4: Atlas query (ephemeral HUD bubble)
echo "🔍 TEST 4: Atlas Query - 'vegan sushi'"
echo "Expected: businessIds array, short summary, no free_tier"
echo "----------------------------------------"
curl -s -X POST "$ATLAS_QUERY_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "vegan sushi",
    "userLocation": null
  }' | jq '{
    summary,
    businessCount: (.businessIds | length),
    primaryBusinessId,
    ui,
    businessIds
  }' > /tmp/test4_atlas_query.json

cat /tmp/test4_atlas_query.json
echo ""

# Test 5: Atlas search (map marker data)
echo "🔍 TEST 5: Atlas Search - 'seafood'"
echo "Expected: Only AI-eligible tiers, all have coords, no free_tier"
echo "----------------------------------------"
curl -s "$ATLAS_SEARCH_URL?q=seafood&limit=10" | jq '{
  ok,
  count: (.results | length),
  tiers: [.results[]? | .business_tier] | unique,
  tierCheck: {
    hasFreeTier: ([.results[]? | .business_tier] | any(. == "free_tier")),
    hasNull: ([.results[]? | .business_tier] | any(. == null))
  },
  coordsCheck: {
    missingCoords: [.results[]? | select(.latitude == null or .longitude == null) | .business_name]
  },
  sampleBusiness: .results[0]
}' > /tmp/test5_atlas_search.json

cat /tmp/test5_atlas_search.json
echo ""

# ============================================================================
# SUMMARY & VALIDATION
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TEST VALIDATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for tier leakage
echo "🔒 TIER LEAKAGE CHECKS:"
echo "------------------------"

FREE_TIER_IN_AI=$(jq -r '.tierCheck.hasFreeTier' /tmp/test2_ai_map.json 2>/dev/null)
NULL_TIER_IN_AI=$(jq -r '.tierCheck.hasNull' /tmp/test2_ai_map.json 2>/dev/null)
FREE_TIER_IN_ATLAS=$(jq -r '.tierCheck.hasFreeTier' /tmp/test5_atlas_search.json 2>/dev/null)
NULL_TIER_IN_ATLAS=$(jq -r '.tierCheck.hasNull' /tmp/test5_atlas_search.json 2>/dev/null)

if [ "$FREE_TIER_IN_AI" = "false" ] && [ "$NULL_TIER_IN_AI" = "false" ]; then
  echo "✅ AI Chat: No free_tier or null tier leakage"
else
  echo "❌ AI Chat: TIER LEAKAGE DETECTED!"
  echo "   free_tier: $FREE_TIER_IN_AI, null: $NULL_TIER_IN_AI"
fi

if [ "$FREE_TIER_IN_ATLAS" = "false" ] && [ "$NULL_TIER_IN_ATLAS" = "false" ]; then
  echo "✅ Atlas Search: No free_tier or null tier leakage"
else
  echo "❌ Atlas Search: TIER LEAKAGE DETECTED!"
  echo "   free_tier: $FREE_TIER_IN_ATLAS, null: $NULL_TIER_IN_ATLAS"
fi

echo ""

# Check for missing coords
echo "📍 COORDINATE CHECKS:"
echo "---------------------"

MISSING_COORDS=$(jq -r '.coordsCheck.missingCoords | length' /tmp/test5_atlas_search.json 2>/dev/null)

if [ "$MISSING_COORDS" = "0" ]; then
  echo "✅ Atlas Search: All businesses have coordinates"
else
  echo "❌ Atlas Search: $MISSING_COORDS businesses missing coordinates!"
  jq -r '.coordsCheck.missingCoords[]' /tmp/test5_atlas_search.json
fi

echo ""

# Check carousel behavior
echo "🎯 CAROUSEL BEHAVIOR CHECKS:"
echo "----------------------------"

BROAD_CAROUSEL=$(jq -r '.carouselCount' /tmp/test1_ai_broad.json 2>/dev/null)
MAP_CAROUSEL=$(jq -r '.carouselCount' /tmp/test2_ai_map.json 2>/dev/null)

if [ "$BROAD_CAROUSEL" = "0" ]; then
  echo "✅ Broad query: Conversational (no carousel)"
else
  echo "⚠️  Broad query: Showing carousel ($BROAD_CAROUSEL items) - may be OK if UI mode is suggestions"
fi

if [ "$MAP_CAROUSEL" -gt "0" ]; then
  echo "✅ Map request: Showing carousel ($MAP_CAROUSEL items)"
else
  echo "❌ Map request: No carousel shown!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Test results saved to /tmp/test*.json"
echo ""
echo "To view full responses:"
echo "  cat /tmp/test1_ai_broad.json | jq '.'"
echo "  cat /tmp/test2_ai_map.json | jq '.'"
echo "  cat /tmp/test5_atlas_search.json | jq '.'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
