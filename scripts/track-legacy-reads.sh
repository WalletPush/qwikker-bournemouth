#!/bin/bash

# ==========================================
# TRACK LEGACY business_category READ PATHS
# ==========================================
# This script tracks remaining files that reference business_category
# Run this regularly to monitor migration progress
#
# Exit condition: When counts are near zero (or only fallback chains), remove trigger

echo "==========================================";
echo "📊 LEGACY business_category TRACKER";
echo "==========================================";
echo "";

# Check if ripgrep (rg) is available, fallback to grep
if command -v rg &> /dev/null; then
  SEARCH_CMD="rg"
else
  SEARCH_CMD="grep -r"
  echo "⚠️  ripgrep (rg) not found, using grep (slower)";
  echo "";
fi

# Directories to search
DIRS="app lib components"

# ==========================================
# BUCKET 1: Property Access (.business_category)
# ==========================================
echo "📌 BUCKET 1: Property Access (\.business_category)";
if [ "$SEARCH_CMD" = "rg" ]; then
  PROPERTY_COUNT=$(rg "\.business_category\b" $DIRS 2>/dev/null | wc -l | tr -d ' ')
  echo "  Count: $PROPERTY_COUNT";
  if [ "$PROPERTY_COUNT" -gt 0 ]; then
    echo "  Files:";
    rg "\.business_category\b" $DIRS 2>/dev/null | cut -d':' -f1 | sort | uniq -c | sort -rn | head -5 | while read count file; do
      echo "    $file: $count reads";
    done
  fi
else
  PROPERTY_COUNT=$(grep -r "\.business_category" $DIRS 2>/dev/null | wc -l | tr -d ' ')
  echo "  Count: $PROPERTY_COUNT";
fi
echo "";

# ==========================================
# BUCKET 2: Token References (excluding migrations/docs)
# ==========================================
echo "📌 BUCKET 2: Token References (any business_category mention)";
if [ "$SEARCH_CMD" = "rg" ]; then
  TOKEN_COUNT=$(rg "\bbusiness_category\b" $DIRS -g'!migrations/**' -g'!**/*.md' 2>/dev/null | wc -l | tr -d ' ')
  echo "  Count: $TOKEN_COUNT (excludes migrations/*.md)";
  if [ "$TOKEN_COUNT" -gt 0 ]; then
    echo "  Top 10 files:";
    rg "\bbusiness_category\b" $DIRS -g'!migrations/**' -g'!**/*.md' 2>/dev/null | cut -d':' -f1 | sort | uniq -c | sort -rn | head -10 | while read count file; do
      echo "    $file: $count references";
    done
  fi
else
  TOKEN_COUNT=$(grep -r "\bbusiness_category\b" $DIRS --exclude-dir=migrations --exclude="*.md" 2>/dev/null | wc -l | tr -d ' ')
  echo "  Count: $TOKEN_COUNT (excludes migrations/*.md)";
fi
echo "";

# ==========================================
# BUCKET 3: Supabase SELECT Strings
# ==========================================
echo "📌 BUCKET 3: Supabase SELECT Strings (select(...business_category...))";
if [ "$SEARCH_CMD" = "rg" ]; then
  SELECT_COUNT=$(rg "select\([^)]*business_category" $DIRS 2>/dev/null | wc -l | tr -d ' ')
  echo "  Count: $SELECT_COUNT";
  if [ "$SELECT_COUNT" -gt 0 ]; then
    echo "  Files:";
    rg "select\([^)]*business_category" $DIRS 2>/dev/null | cut -d':' -f1 | sort | uniq -c | sort -rn | head -5 | while read count file; do
      echo "    $file: $count SELECT queries";
    done
  fi
else
  SELECT_COUNT=$(grep -r "select([^)]*business_category" $DIRS 2>/dev/null | wc -l | tr -d ' ')
  echo "  Count: $SELECT_COUNT";
fi
echo "";

# ==========================================
# BUCKET 4: Type/Interface Definitions
# ==========================================
echo "📌 BUCKET 4: Type/Interface Definitions (business_category: string)";
if [ "$SEARCH_CMD" = "rg" ]; then
  TYPE_COUNT=$(rg "business_category\??\s*:" $DIRS 2>/dev/null | wc -l | tr -d ' ')
  echo "  Count: $TYPE_COUNT";
  if [ "$TYPE_COUNT" -gt 0 ]; then
    echo "  Files:";
    rg "business_category\??\s*:" $DIRS 2>/dev/null | cut -d':' -f1 | sort | uniq -c | sort -rn | head -5 | while read count file; do
      echo "    $file: $count type definitions";
    done
  fi
else
  TYPE_COUNT=$(grep -r "business_category.*:" $DIRS 2>/dev/null | wc -l | tr -d ' ')
  echo "  Count: $TYPE_COUNT";
fi
echo "";

# ==========================================
# SUMMARY
# ==========================================
echo "==========================================";
echo "📊 SUMMARY:";
echo "==========================================";
echo "  Property reads (.business_category):     $PROPERTY_COUNT";
echo "  Token references (total):                $TOKEN_COUNT";
echo "  Supabase SELECT queries:                 $SELECT_COUNT";
echo "  Type definitions:                        $TYPE_COUNT";
echo "";

# ==========================================
# CRITICAL FILES CHECK
# ==========================================
echo "==========================================";
echo "🚨 CRITICAL FILES (must be using new fields):";
echo "==========================================";
CRITICAL_FILES=(
  "lib/ai/embeddings.ts"
  "lib/ai/hybrid-chat.ts"
  "lib/ai/chat.ts"
  "app/api/analytics/comprehensive/route.ts"
  "lib/actions/file-actions.ts"
  "lib/actions/knowledge-base-actions.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    if [ "$SEARCH_CMD" = "rg" ]; then
      COUNT=$(rg "\bbusiness_category\b" "$file" 2>/dev/null | wc -l | tr -d ' ')
    else
      COUNT=$(grep "\bbusiness_category\b" "$file" 2>/dev/null | wc -l | tr -d ' ')
    fi
    if [ "$COUNT" -gt 0 ]; then
      echo "  ⚠️  $file: $COUNT references (FIX SOON!)";
    else
      echo "  ✅ $file: Fixed!";
    fi
  else
    echo "  ⚠️  $file: File not found";
  fi
done
echo "";

# ==========================================
# EXIT CONDITION
# ==========================================
echo "==========================================";
echo "📌 EXIT CONDITION:";
echo "==========================================";

# Calculate "critical" count (property reads + critical files)
CRITICAL_COUNT=$((PROPERTY_COUNT))

if [ "$CRITICAL_COUNT" -eq 0 ] && [ "$TOKEN_COUNT" -lt 20 ]; then
  echo "✅ SAFE TO REMOVE TRIGGER!";
  echo "";
  echo "Run these commands:";
  echo "  DROP TRIGGER IF EXISTS trg_tmp_sync_business_category ON business_profiles;";
  echo "  DROP FUNCTION IF EXISTS tmp_sync_business_category_from_display();";
elif [ "$TOKEN_COUNT" -lt 50 ]; then
  echo "🟡 Getting close ($TOKEN_COUNT total refs). Focus on critical files.";
  echo "   Property reads: $PROPERTY_COUNT (should be 0)";
  echo "   Fix AI/embeddings and analytics next.";
else
  echo "🔴 Still $TOKEN_COUNT total references.";
  echo "   Property reads: $PROPERTY_COUNT";
  echo "   Focus on:";
  echo "   1. Fix AI/embeddings (lib/ai/*.ts)";
  echo "   2. Fix analytics (app/api/analytics/*.ts)";
  echo "   3. Update API routes to SELECT system_category, display_category";
fi
echo "";

# ==========================================
# SAMPLE READS (for context)
# ==========================================
echo "==========================================";
echo "📝 SAMPLE TOKEN REFERENCES (first 10):";
echo "==========================================";
if [ "$SEARCH_CMD" = "rg" ]; then
  rg "\bbusiness_category\b" $DIRS -g'!migrations/**' -g'!**/*.md' -n 2>/dev/null | head -10;
else
  grep -rn "\bbusiness_category\b" $DIRS --exclude-dir=migrations --exclude="*.md" 2>/dev/null | head -10;
fi
echo "";
echo "Run full search: rg \"\\bbusiness_category\\b\" app lib components";
