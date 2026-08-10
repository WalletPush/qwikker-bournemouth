'use client'

import Link from 'next/link'
import { SYSTEM_CATEGORY_LABEL, SystemCategory } from '@/lib/constants/system-categories'
import { getPlaceholderUrl } from '@/lib/placeholders/getPlaceholderImage'
import { buildQwikkerImageUrl, cssFramingStyle } from '@/lib/media/build-qwikker-image-url'
import type { CssFramingStyle } from '@/lib/media/build-qwikker-image-url'
import type { CategoryTileImageConfig } from '@/lib/constants/landing-templates'

type Variant = 'signature' | 'vibrant' | 'editorial'

interface CategoryTilesSectionProps {
  displayName: string
  heading?: string | null
  categories: string[]
  cardClass: string
  headingClass: string
  variant?: Variant
  // Vibrant only: 0–100 accent colour wash strength (mirrors the hero wash slider).
  wash?: number
  /** Per-category curated images from landing config */
  tileImages?: Record<string, CategoryTileImageConfig> | null
}

// Short, punchy tile label (e.g. "Cafe / Coffee Shop" -> "Cafe").
function shortLabel(cat: string): string {
  const full = SYSTEM_CATEGORY_LABEL[cat as SystemCategory] || cat
  return full.split('/')[0].trim()
}

// Non-pass-holders are routed through install by middleware; the category hint
// is preserved for a future discover filter.
function tileHref(cat: string): string {
  return `/user/discover?category=${encodeURIComponent(cat)}`
}

/** City category image → Qwikker default pool → never blank */
function resolveTileImage(
  cat: string,
  tileImages?: Record<string, CategoryTileImageConfig> | null
): { src: string; style: CssFramingStyle } {
  const custom = tileImages?.[cat]
  if (custom?.source_url) {
    const presentation = {
      source_url: custom.source_url,
      focal_x: custom.focal_x,
      focal_y: custom.focal_y,
      zoom: custom.zoom,
      fit: (custom.fit || 'cover') as 'cover' | 'contain',
      gravity_mode: (custom.gravity_mode || 'auto') as 'auto' | 'centre' | 'manual',
    }
    return {
      src: buildQwikkerImageUrl(presentation, 'category') || custom.source_url,
      style: cssFramingStyle(presentation),
    }
  }
  return {
    src: getPlaceholderUrl(cat, `tile-${cat}`),
    style: { objectFit: 'cover', objectPosition: 'center' },
  }
}

export function CategoryTilesSection({
  displayName,
  heading,
  categories,
  cardClass,
  headingClass,
  variant = 'signature',
  wash = 60,
  tileImages,
}: CategoryTilesSectionProps) {
  const cats = categories.filter(Boolean)
  if (cats.length === 0) return null
  const title = heading || `Explore ${displayName}`
  const washMid = Math.round(wash * 0.4)

  if (variant === 'editorial') {
    return (
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-[var(--border-soft)]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-faint)] mb-3">Browse by</p>
          <h2 className={`text-3xl sm:text-5xl ${headingClass} text-[var(--text)] mb-12`}>{title}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-10">
            {cats.map((cat, i) => {
              const { src, style } = resolveTileImage(cat, tileImages)
              return (
                <Link key={cat} href={tileHref(cat)} className="group">
                  <div className="relative aspect-[4/3] w-full overflow-hidden mb-3">
                    <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                      <img
                        src={src}
                        alt={shortLabel(cat)}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full"
                        style={style}
                      />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3 border-t border-[var(--border)] pt-2.5">
                    <span className="text-xs tabular-nums" style={{ color: 'var(--accent)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-lg sm:text-xl ${headingClass} text-[var(--text)]`}>
                      {shortLabel(cat)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'vibrant') {
    return (
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className={`text-3xl sm:text-4xl ${headingClass} text-[var(--text)] mb-8`}>{title}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {cats.map((cat) => {
              const { src, style } = resolveTileImage(cat, tileImages)
              return (
                <Link
                  key={cat}
                  href={tileHref(cat)}
                  className={`group relative ${cardClass} overflow-hidden h-36 sm:h-44 shadow-sm transition-transform duration-300 hover:-translate-y-1`}
                >
                  <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-110">
                    <img
                      src={src}
                      alt={shortLabel(cat)}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full"
                      style={style}
                    />
                  </div>
                  {washMid > 0 && (
                    <div
                      className="absolute inset-0"
                      style={{ background: 'var(--accent)', opacity: (washMid / 100) * 1.1 }}
                    />
                  )}
                  <div
                    className="absolute inset-x-0 bottom-0 flex items-end p-4"
                    style={{
                      height: '38%',
                      background:
                        'linear-gradient(to top, color-mix(in srgb, var(--accent) 86%, #000) 0%, var(--accent) 100%)',
                    }}
                  >
                    <span
                      className="font-extrabold text-lg sm:text-2xl leading-tight"
                      style={{
                        color: 'var(--accent-contrast)',
                        textShadow: '0 1px 10px rgba(0,0,0,0.25)',
                      }}
                    >
                      {shortLabel(cat)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className={`text-2xl sm:text-3xl ${headingClass} text-[var(--text)] mb-8`}>{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {cats.map((cat) => {
            const { src, style } = resolveTileImage(cat, tileImages)
            return (
              <Link
                key={cat}
                href={tileHref(cat)}
                className={`group relative ${cardClass} overflow-hidden h-28 sm:h-36 border border-[var(--border)]`}
              >
                <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
                  <img
                    src={src}
                    alt={shortLabel(cat)}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full"
                    style={style}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex items-end p-3 sm:p-4">
                  <span
                    className="text-white font-bold text-base sm:text-lg leading-tight"
                    style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
                  >
                    {shortLabel(cat)}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
