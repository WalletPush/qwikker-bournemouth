'use client'

import { useMemo, useState } from 'react'

export interface ReviewImage {
  file: string // e.g. "restaurant/03.webp"
  url: string // e.g. "/placeholders/restaurant/03.webp"
}

export interface ReviewCategory {
  category: string
  label: string
  images: ReviewImage[]
}

type SizeKey = 'card' | 'hero' | 'full'

const SIZE_WIDTH: Record<SizeKey, string> = {
  card: '220px',
  hero: '360px',
  full: '560px',
}

const SIZE_LABEL: Record<SizeKey, string> = {
  card: 'Card size',
  hero: 'Hero size',
  full: 'Full / large',
}

export function PlaceholderReviewGrid({ categories }: { categories: ReviewCategory[] }) {
  const [size, setSize] = useState<SizeKey>('hero')
  const [flagged, setFlagged] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')

  const totalImages = useMemo(
    () => categories.reduce((n, c) => n + c.images.length, 0),
    [categories]
  )

  const flaggedList = useMemo(
    () => Object.keys(flagged).filter((k) => flagged[k]).sort(),
    [flagged]
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      (c) => c.category.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)
    )
  }, [categories, query])

  function toggleFlag(file: string) {
    setFlagged((prev) => ({ ...prev, [file]: !prev[file] }))
  }

  async function copyFlagged() {
    const text = flaggedList.join(', ')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore — user can still read the list below
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Sticky control bar */}
      <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="mr-2">
              <h1 className="text-base font-bold">Placeholder review</h1>
              <p className="text-xs text-slate-400">
                {categories.length} categories · {totalImages} images · local only, changes nothing live
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
              {(['card', 'hero', 'full'] as SizeKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSize(k)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    size === k ? 'bg-[#00d083] text-black' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {SIZE_LABEL[k]}
                </button>
              ))}
            </div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter categories…"
              className="w-44 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00d083]"
            />

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {flaggedList.length} flagged to replace
              </span>
              <button
                onClick={copyFlagged}
                disabled={flaggedList.length === 0}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40"
              >
                Copy list
              </button>
            </div>
          </div>

          {/* category jump nav */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {visible.map((c) => (
              <a
                key={c.category}
                href={`#cat-${c.category}`}
                className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:border-[#00d083]/50 hover:text-white"
              >
                {c.label} <span className="text-slate-500">({c.images.length})</span>
              </a>
            ))}
          </div>

          {flaggedList.length > 0 && (
            <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              <span className="font-semibold">Replace:</span> {flaggedList.join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Grids */}
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        {visible.length === 0 && (
          <p className="py-20 text-center text-slate-500">
            No images yet — generation may still be running. Refresh in a minute.
          </p>
        )}

        {visible.map((c) => (
          <section key={c.category} id={`cat-${c.category}`} className="mb-10 scroll-mt-28">
            <div className="mb-3 flex items-baseline gap-2 border-b border-slate-800 pb-2">
              <h2 className="text-lg font-bold">{c.label}</h2>
              <span className="text-xs text-slate-500">
                {c.category} · {c.images.length} images
              </span>
            </div>

            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${SIZE_WIDTH[size]}, 1fr))`,
              }}
            >
              {c.images.map((img) => {
                const isFlagged = !!flagged[img.file]
                return (
                  <div
                    key={img.file}
                    className={`group relative overflow-hidden rounded-xl border ${
                      isFlagged ? 'border-amber-500' : 'border-slate-800'
                    } bg-slate-900`}
                  >
                    <a href={img.url} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.file}
                        className="aspect-[3/2] w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                      <code className="truncate text-[11px] text-slate-400">{img.file}</code>
                      <button
                        onClick={() => toggleFlag(img.file)}
                        className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                          isFlagged
                            ? 'bg-amber-500 text-black'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {isFlagged ? '✓ replace' : 'replace?'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
