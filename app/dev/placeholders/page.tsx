'use client'

import { SimplePlaceholderImage } from '@/components/ui/simple-placeholder-image'
import { getPlaceholderUrl, getPlaceholderVariation, getImageCountForCategory } from '@/lib/placeholders/getPlaceholderImage'

/**
 * Debug page to preview placeholder images across all categories.
 * Shows how deterministic selection + CSS variation works with different IDs.
 *
 * Access: http://localhost:3000/dev/placeholders
 */

const CATEGORIES = [
  'restaurant',
  'bar',
  'tattoo',
  'bakery',
  'dessert',
  'cafe',
  'barber',
  'wellness',
  'pub',
  'salon',
  'fitness', // no images -- should fallback to default
]

const FAKE_IDS = [
  'business-001-aaa-111',
  'business-002-bbb-222',
  'business-003-ccc-333',
  'business-004-ddd-444',
  'business-005-eee-555',
  'business-006-fff-666',
  'business-007-ggg-777',
  'business-008-hhh-888',
]

export default function PlaceholdersDebugPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Placeholder Images Debug
        </h1>
        <p className="text-slate-400 mb-8">
          Deterministic image + crop + color + tint variation.
          Same business ID always renders identically.
        </p>

        {CATEGORIES.map((category) => {
          const count = getImageCountForCategory(category)
          return (
            <div key={category} className="mb-12">
              <h2 className="text-xl font-semibold text-slate-200 mb-1 capitalize">
                {category.replace('_', ' ')}
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                {count} base image{count !== 1 ? 's' : ''} &times; crop &times; color &times; tint
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {FAKE_IDS.map((fakeId) => {
                  const { url, imgClass, overlayClass } = getPlaceholderVariation(category, fakeId)
                  const imageVariant = url.match(/\/(\d+)\.webp/)?.[1] || '??'
                  const resolvedCategory = url.match(/placeholders\/([^/]+)\//)?.[1] || 'unknown'

                  return (
                    <div key={fakeId} className="space-y-2">
                      <div className="aspect-video rounded-lg overflow-hidden bg-slate-800 relative">
                        <SimplePlaceholderImage
                          businessId={fakeId}
                          systemCategory={category}
                          businessName={`Test ${category}`}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 space-y-0.5">
                        <div>Cat: <span className={resolvedCategory === 'default' ? 'text-amber-400' : 'text-emerald-400'}>{resolvedCategory}</span></div>
                        <div>Img: {imageVariant}</div>
                        <div className="truncate text-slate-600">{imgClass}</div>
                        {overlayClass && <div className="truncate text-slate-600">{overlayClass}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
