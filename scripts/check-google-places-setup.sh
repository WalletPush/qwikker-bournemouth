#!/bin/bash

# QWIKKER Google Places Setup Checker
# Run this to diagnose Google Places API issues

echo "🔍 QWIKKER Google Places Setup Checker"
echo "========================================"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file NOT FOUND"
    echo "   → Create it: touch .env.local"
    echo ""
    exit 1
else
    echo "✅ .env.local file exists"
fi

# Check for NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
if grep -q "NEXT_PUBLIC_GOOGLE_PLACES_API_KEY" .env.local; then
    KEY_VALUE=$(grep "NEXT_PUBLIC_GOOGLE_PLACES_API_KEY" .env.local | cut -d'=' -f2)
    if [ -z "$KEY_VALUE" ]; then
        echo "⚠️  NEXT_PUBLIC_GOOGLE_PLACES_API_KEY found but EMPTY"
        echo "   → Add your API key after the = sign"
    else
        KEY_LENGTH=${#KEY_VALUE}
        echo "✅ NEXT_PUBLIC_GOOGLE_PLACES_API_KEY found (length: $KEY_LENGTH chars)"
        
        # Basic validation (Google API keys typically start with "AIza")
        if [[ $KEY_VALUE == AIza* ]]; then
            echo "   ✓ Key format looks correct (starts with 'AIza')"
        else
            echo "   ⚠️  Key doesn't start with 'AIza' - might be invalid"
        fi
    fi
else
    echo "❌ NEXT_PUBLIC_GOOGLE_PLACES_API_KEY NOT FOUND in .env.local"
    echo "   → Add this line:"
    echo "   NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-api-key-here"
fi

echo ""

# Check for GOOGLE_PLACES_SERVER_KEY
if grep -q "GOOGLE_PLACES_SERVER_KEY" .env.local; then
    KEY_VALUE=$(grep "GOOGLE_PLACES_SERVER_KEY" .env.local | cut -d'=' -f2)
    if [ -z "$KEY_VALUE" ]; then
        echo "⚠️  GOOGLE_PLACES_SERVER_KEY found but EMPTY"
        echo "   → Add your API key after the = sign"
    else
        KEY_LENGTH=${#KEY_VALUE}
        echo "✅ GOOGLE_PLACES_SERVER_KEY found (length: $KEY_LENGTH chars)"
        
        if [[ $KEY_VALUE == AIza* ]]; then
            echo "   ✓ Key format looks correct (starts with 'AIza')"
        else
            echo "   ⚠️  Key doesn't start with 'AIza' - might be invalid"
        fi
    fi
else
    echo "❌ GOOGLE_PLACES_SERVER_KEY NOT FOUND in .env.local"
    echo "   → Add this line:"
    echo "   GOOGLE_PLACES_SERVER_KEY=your-api-key-here"
fi

echo ""
echo "========================================"
echo ""

# Check if dev server is running
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Dev server running on port 3000"
    echo "   → If you just added API keys, RESTART the server:"
    echo "   → Ctrl+C then run: pnpm dev"
else
    echo "⚠️  Dev server NOT running on port 3000"
    echo "   → Start it: pnpm dev"
fi

echo ""
echo "📚 For detailed setup instructions, see:"
echo "   GOOGLE_PLACES_SETUP.md"
echo ""
