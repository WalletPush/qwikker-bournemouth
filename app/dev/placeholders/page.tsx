'use client'

import { SimplePlaceholderImage } from '@/components/ui/simple-placeholder-image'
import { getPlaceholderUrl, getPlaceholderStyle } from '@/lib/placeholders/getPlaceholderImage'

/**
 * Debug page to preview placeholder images across all categories
 * Shows how deterministic selection works with different business IDs
 * 
 * Access: http://localhost:3000/dev/placeholders
 */

// Only test categories with actual placeholder images + one unknown
const CATEGORIES = [
  'restaurant', // Has images
  'cafe',       // Has images
  'bar',        // Has images
  'barber',     // Has images
  'bakery',     // Has images
  'dessert',    // Has images
  'salon',      // Unknown - should fallback to default
]

// Generate fake business IDs that will deterministically select different images
const FAKE_IDS = [
  'business-001-aaa-111', // Will hash to image 0
  'business-002-bbb-222', // Will hash to image 1
  'business-003-ccc-333', // Will hash to image 2
  'business-004-ddd-444', // Will cycle back through
  'business-005-eee-555',
  'business-006-fff-666'
]

export default function PlaceholdersDebugPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Placeholder Images Debug
        </h1>
        <p className="text-slate-400 mb-4">
          Testing deterministic placeholder selection for supported categories.
          Each business ID produces consistent image + style combination.
        </p>
        <div className="mb-8 p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="text-sm text-slate-300 space-y-1">
            <div><span className="text-emerald-400">✓</span> <strong>Supported categories:</strong> restaurant, cafe, bar, barber, bakery, dessert (3 images each)</div>
            <div><span className="text-amber-400">⚠</span> <strong>Unknown categories:</strong> fallback to <code className="text-amber-300">/placeholders/default/00.webp</code></div>
          </div>
        </div>

        {CATEGORIES.map((category) => (
          <div key={category} className="mb-12">
            <h2 className="text-xl font-semibold text-slate-200 mb-4 capitalize">
              {category.replace('_', ' ')}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {FAKE_IDS.map((fakeId) => {
                const imageUrl = getPlaceholderUrl(category, fakeId)
                const styleIndex = getPlaceholderStyle(fakeId)
                const imageVariant = imageUrl.match(/\/(\d+)\.webp/)?.[1] || '??'
                const resolvedCategory = imageUrl.match(/placeholders\/([^/]+)\//)?.[1] || 'unknown'

                return (
                  <div key={fakeId} className="space-y-2">
                    <div className="aspect-video rounded-lg overflow-hidden bg-slate-800">
                      <SimplePlaceholderImage
                        businessId={fakeId}
                        systemCategory={category}
                        businessName={`Test ${category}`}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <div>Category: <span className={resolvedCategory === 'default' ? 'text-amber-400' : 'text-emerald-400'}>{resolvedCategory}</span></div>
                      <div>Image: {imageVariant}</div>
                      <div>Style: {styleIndex}</div>
                      <div className="text-[10px] text-slate-600 truncate">{imageUrl}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div className="mt-12 p-6 bg-slate-900 rounded-lg border border-slate-800">
          <h3 className="text-lg font-semibold text-slate-200 mb-3">
            How It Works
          </h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>• <strong>3 images per category:</strong> 00.webp, 01.webp, 02.webp</li>
            <li>• <strong>6 style variants:</strong> Clean, tiny zoom, contrast, saturation, subtle vignette, zoom+translate</li>
            <li>• <strong>Deterministic:</strong> Same business ID always gets same image + style</li>
            <li>• <strong>Fallback:</strong> /placeholders/default/00.webp if category folder missing</li>
            <li>• <strong>Total combinations:</strong> 3 images × 6 styles = 18 unique looks per category</li>
          </ul>
        </div>

        <div className="mt-6 p-6 bg-amber-950/30 border border-amber-800/50 rounded-lg">
          <h3 className="text-lg font-semibold text-amber-200 mb-2">
            ⚠️ Missing Images?
          </h3>
          <p className="text-sm text-amber-300/80">
            If images show as broken, create placeholder files:
          </p>
          <pre className="mt-2 text-xs text-amber-200 bg-slate-900/50 p-3 rounded">
{`/public/placeholders/
├── restaurant/
│   ├── 00.webp
│   ├── 01.webp
│   └── 02.webp
├── cafe/
│   ├── 00.webp
│   ├── 01.webp
│   └── 02.webp
└── default/
    └── 00.webp`}
          </pre>
        </div>
      </div>
    </div>
  )
}

