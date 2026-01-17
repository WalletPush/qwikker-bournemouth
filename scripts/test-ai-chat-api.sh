#!/bin/bash
# AI Chat API Test Script
# Captures real responses for audit

API_URL="http://localhost:3000/api/ai/chat"

echo "📊 AI CHAT API AUDIT - RESPONSE SAMPLES"
echo "========================================"
echo ""

# Test 1: Broad Query
echo "🔍 TEST 1: Broad Query - 'restaurants'"
echo "----------------------------------------"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "restaurants",
    "walletPassId": null,
    "conversationHistory": []
  }' | jq '.' > /tmp/test1_broad.json

echo "Response saved to: /tmp/test1_broad.json"
echo "Business Carousel Count: $(jq '.businessCarousel | length' /tmp/test1_broad.json)"
echo "Sources Count: $(jq '.sources | length' /tmp/test1_broad.json)"
echo "Model Used: $(jq -r '.metadata.modelUsed' /tmp/test1_broad.json)"
echo ""

# Test 2: Narrow Query
echo "🔍 TEST 2: Narrow Query - 'seafood restaurants'"
echo "------------------------------------------------"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "seafood restaurants",
    "walletPassId": null,
    "conversationHistory": []
  }' | jq '.' > /tmp/test2_narrow.json

echo "Response saved to: /tmp/test2_narrow.json"
echo "Business Carousel Count: $(jq '.businessCarousel | length' /tmp/test2_narrow.json)"
echo "Sources Count: $(jq '.sources | length' /tmp/test2_narrow.json)"
echo "Model Used: $(jq -r '.metadata.modelUsed' /tmp/test2_narrow.json)"
echo ""

# Test 3: Non-Business Query
echo "🔍 TEST 3: Non-Business Query - 'what is Qwikker?'"
echo "---------------------------------------------------"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "what is Qwikker?",
    "walletPassId": null,
    "conversationHistory": []
  }' | jq '.' > /tmp/test3_meta.json

echo "Response saved to: /tmp/test3_meta.json"
echo "Business Carousel Count: $(jq '.businessCarousel | length' /tmp/test3_meta.json)"
echo "Sources Count: $(jq '.sources | length' /tmp/test3_meta.json)"
echo "Model Used: $(jq -r '.metadata.modelUsed' /tmp/test3_meta.json)"
echo ""

echo "✅ All tests complete!"
echo ""
echo "To view full responses:"
echo "  cat /tmp/test1_broad.json | jq '.'"
echo "  cat /tmp/test2_narrow.json | jq '.'"
echo "  cat /tmp/test3_meta.json | jq '.'"
