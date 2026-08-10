'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  CategoryTileImageConfig,
  LandingPageConfig,
} from '@/lib/constants/landing-templates'
import { SYSTEM_CATEGORIES, SYSTEM_CATEGORY_LABEL, SystemCategory } from '@/lib/constants/system-categories'
import { getPlaceholderUrl } from '@/lib/placeholders/getPlaceholderImage'
import { uploadToCloudinary } from '@/lib/integrations'
import { buildQwikkerImageUrl, cssFramingStyle } from '@/lib/media/build-qwikker-image-url'

interface EditorProps {
  config: LandingPageConfig
  onChange: (updater: (prev: LandingPageConfig) => LandingPageConfig) => void
}

const RECOMMENDED_TILES: SystemCategory[] = ['restaurant', 'cafe', 'bar', 'tours_activities', 'hotel', 'retail']

export function OffersSectionEditor({ config, onChange }: EditorProps) {
  const offers = config.offers_section || {}
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#00d083]/10">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-white">Live Offers</CardTitle>
            <p className="text-sm text-slate-400 mt-1">Shows current approved offers from local businesses, right under the hero. Toggle it in &quot;Sections&quot; above.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-slate-300">Section Heading</Label>
          <p className="text-xs text-slate-500">Leave blank for the default: &quot;Live offers in [city]&quot;</p>
          <Input
            value={offers.heading || ''}
            onChange={(e) => onChange((prev) => ({ ...prev, offers_section: { ...(prev.offers_section || {}), heading: e.target.value || null } }))}
            placeholder="Live offers in your city"
            maxLength={100}
            className="bg-slate-900 border-slate-600 text-white focus:border-[#00d083]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Maximum offers to show</Label>
          <Input
            type="number"
            min={1}
            max={24}
            value={offers.max ?? 6}
            onChange={(e) => onChange((prev) => ({ ...prev, offers_section: { ...(prev.offers_section || {}), max: Math.min(24, Math.max(1, parseInt(e.target.value) || 6)) } }))}
            className="bg-slate-900 border-slate-600 text-white focus:border-[#00d083] max-w-[120px]"
          />
          <p className="text-xs text-slate-500">Offers are ordered by soonest to expire. If there are no active offers, the section is hidden automatically.</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function CategoryTilesEditor({ config, onChange }: EditorProps) {
  const tiles = config.category_tiles || {}
  const selected = tiles.categories || []
  const images = tiles.images || {}
  const [uploadingCat, setUploadingCat] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function toggle(cat: string) {
    onChange((prev) => {
      const cur = prev.category_tiles?.categories || []
      const next = cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat]
      return { ...prev, category_tiles: { ...(prev.category_tiles || {}), categories: next } }
    })
  }

  function applyRecommended() {
    onChange((prev) => ({
      ...prev,
      category_tiles: { ...(prev.category_tiles || {}), categories: [...RECOMMENDED_TILES] },
    }))
  }

  function setTileImage(cat: string, image: CategoryTileImageConfig | null) {
    onChange((prev) => {
      const prevImages = { ...(prev.category_tiles?.images || {}) }
      if (!image) delete prevImages[cat]
      else prevImages[cat] = image
      return {
        ...prev,
        category_tiles: {
          ...(prev.category_tiles || {}),
          images: Object.keys(prevImages).length ? prevImages : null,
        },
      }
    })
  }

  async function handleUpload(cat: string, file: File) {
    setUploadingCat(cat)
    try {
      const url = await uploadToCloudinary(file, `qwikker/category_tiles/${cat}`)
      // Persist as category_image in media_assets (city from admin session on API)
      let mediaId: string | null = null
      try {
        const res = await fetch('/api/admin/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload',
            sourceUrl: url,
            assetType: 'category_image',
            categoryKey: cat,
            reviewStatus: 'approved',
          }),
        })
        const body = await res.json().catch(() => ({}))
        if (res.ok && body.asset?.id) mediaId = body.asset.id
      } catch {
        // Config still stores URL even if media_assets row fails (pre-migration)
      }
      setTileImage(cat, {
        source_url: url,
        media_id: mediaId,
        fit: 'cover',
        gravity_mode: 'auto',
        zoom: 1,
      })
    } finally {
      setUploadingCat(null)
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#00d083]/10">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-white">Category Tiles</CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              Bold tiles that send visitors into discovery. Upload per-category art or restore the Qwikker default.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-slate-300">Section Heading</Label>
          <p className="text-xs text-slate-500">Leave blank for the default: &quot;Explore [city]&quot;</p>
          <Input
            value={tiles.heading || ''}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                category_tiles: { ...(prev.category_tiles || {}), heading: e.target.value || null },
              }))
            }
            placeholder="Explore your city"
            maxLength={100}
            className="bg-slate-900 border-slate-600 text-white focus:border-[#00d083]"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Categories ({selected.length})</Label>
            <button
              type="button"
              onClick={applyRecommended}
              className="text-xs text-[#00d083] hover:text-[#00d083]/80 font-medium"
            >
              Use recommended
            </button>
          </div>
          <p className="text-xs text-slate-500">Pick the categories that suit your city. Each tile links into discovery.</p>
          <div className="flex flex-wrap gap-2">
            {SYSTEM_CATEGORIES.filter((c) => c !== 'other').map((cat) => {
              const isOn = selected.includes(cat)
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggle(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isOn
                      ? 'border-[#00d083] bg-[#00d083]/15 text-[#00d083]'
                      : 'border-slate-600 bg-slate-900/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {SYSTEM_CATEGORY_LABEL[cat].split('/')[0].trim()}
                </button>
              )
            })}
          </div>
        </div>

        {selected.length > 0 && (
          <div className="space-y-3">
            <Label className="text-slate-300">Tile images</Label>
            <p className="text-xs text-slate-500">
              Custom image → city override. Restore default falls back to the Qwikker placeholder pool. Preview shows the label overlay.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selected.map((cat) => {
                const custom = images[cat]
                const presentation = custom?.source_url
                  ? {
                      source_url: custom.source_url,
                      focal_x: custom.focal_x,
                      focal_y: custom.focal_y,
                      zoom: custom.zoom,
                      fit: (custom.fit || 'cover') as 'cover' | 'contain',
                      gravity_mode: (custom.gravity_mode || 'auto') as
                        | 'auto'
                        | 'centre'
                        | 'manual',
                    }
                  : null
                const preview =
                  (presentation &&
                    (buildQwikkerImageUrl(presentation, 'category') || custom?.source_url)) ||
                  getPlaceholderUrl(cat, `tile-${cat}`)
                const previewStyle = presentation
                  ? cssFramingStyle(presentation)
                  : { objectFit: 'cover' as const, objectPosition: 'center' }
                const label = SYSTEM_CATEGORY_LABEL[cat as SystemCategory]?.split('/')[0].trim() || cat

                return (
                  <div
                    key={cat}
                    className="rounded-lg border border-slate-700 bg-slate-950/50 overflow-hidden"
                  >
                    <div className="relative h-28 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt=""
                        className="absolute inset-0 h-full w-full"
                        style={previewStyle}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-2">
                        <span className="text-white text-sm font-bold">{label}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 p-2">
                      <input
                        ref={(el) => {
                          fileRefs.current[cat] = el
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) void handleUpload(cat, file)
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={uploadingCat === cat}
                        className="text-[11px] h-7"
                        onClick={() => fileRefs.current[cat]?.click()}
                      >
                        {uploadingCat === cat ? 'Uploading…' : custom ? 'Replace' : 'Upload'}
                      </Button>
                      {custom && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-[11px] h-7 text-slate-400"
                          onClick={() => setTileImage(cat, null)}
                        >
                          Restore default
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
