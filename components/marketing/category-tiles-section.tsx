'use client'

import Link from 'next/link'
import { SYSTEM_CATEGORY_LABEL, SystemCategory } from '@/lib/constants/system-categories'
import { getPlaceholderUrl } from '@/lib/placeholders/getPlaceholderImage'

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

export function CategoryTilesSection({ displayName, heading, categories, cardClass, headingClass, variant = 'signature', wash = 60 }: CategoryTilesSectionProps) {
  const cats = categories.filter(Boolean)
  if (cats.length === 0) return null
  const title = heading || `Explore ${displayName}`
  // Vibrant overlay tint above the solid label footer scales with the hero wash slider.
  const washMid = Math.round(wash * 0.4)

  // ── EDITORIAL: captions-below magazine grid (no overlay, serif labels) ───
  if (variant === 'editorial') {
    return (
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-[var(--border-soft)]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-faint)] mb-3">Browse by</p>
          <h2 className={`text-3xl sm:text-5xl ${headingClass} text-[var(--text)] mb-12`}>{title}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-10">
            {cats.map((cat, i) => {
              const img = getPlaceholderUrl(cat, `tile-${cat}`)
              return (
                <Link key={cat} href={tileHref(cat)} className="group">
                  <div className="relative aspect-[4/3] w-full overflow-hidden mb-3">
                    <img src={img} alt={shortLabel(cat)} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="flex items-baseline gap-3 border-t border-[var(--border)] pt-2.5">
                    <span className="text-xs tabular-nums" style={{ color: 'var(--accent)' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={`text-lg sm:text-xl ${headingClass} text-[var(--text)]`}>{shortLabel(cat)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  // ── VIBRANT: bold rounded tiles, accent wash, big labels ────────────────
  if (variant === 'vibrant') {
    return (
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className={`text-3xl sm:text-4xl ${headingClass} text-[var(--text)] mb-8`}>{title}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {cats.map((cat) => {
              const img = getPlaceholderUrl(cat, `tile-${cat}`)
              return (
                <Link
                  key={cat}
                  href={tileHref(cat)}
                  className={`group relative ${cardClass} overflow-hidden h-36 sm:h-44 shadow-sm transition-transform duration-300 hover:-translate-y-1`}
                >
                  <img src={img} alt={shortLabel(cat)} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  {/* Wash slider tints the photo area (lower = clearer photo). Flat
                      uniform layer so it's the same strength everywhere. */}
                  {washMid > 0 && <div className="absolute inset-0" style={{ background: 'var(--accent)', opacity: (washMid / 100) * 1.1 }} />}
                  {/* Opaque accent label footer — fixed height, no photo bleeds through,
                      so the coloured band is IDENTICAL on every tile regardless of the image. */}
                  <div
                    className="absolute inset-x-0 bottom-0 flex items-end p-4"
                    style={{ height: '38%', background: 'linear-gradient(to top, color-mix(in srgb, var(--accent) 86%, #000) 0%, var(--accent) 100%)' }}
                  >
                    <span className="font-extrabold text-lg sm:text-2xl leading-tight" style={{ color: 'var(--accent-contrast)', textShadow: '0 1px 10px rgba(0,0,0,0.25)' }}>
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

  // ── SIGNATURE: restrained overlay image tiles ───────────────────────────
  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className={`text-2xl sm:text-3xl ${headingClass} text-[var(--text)] mb-8`}>{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {cats.map((cat) => {
            const img = getPlaceholderUrl(cat, `tile-${cat}`)
            return (
              <Link key={cat} href={tileHref(cat)} className={`group relative ${cardClass} overflow-hidden h-28 sm:h-36 border border-[var(--border)]`}>
                <img src={img} alt={shortLabel(cat)} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex items-end p-3 sm:p-4">
                  <span className="text-white font-bold text-base sm:text-lg leading-tight" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
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
