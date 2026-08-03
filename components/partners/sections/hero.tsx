'use client'

import { useState } from 'react'
import { ArrowRight, Search } from 'lucide-react'
import { commercialCopy } from '@/lib/partners/commercial-copy'
import type { FoundingMeta, PublicCity } from '@/components/partners/partners-opportunity-page'
import { PARTNERS_IMG } from '@/components/partners/sections/visual-assets'
import { slugifyCityName } from '@/lib/partners/availability'

export function PartnersHero({
  founding,
  cities = [],
  onReserve,
  onSelectCity,
}: {
  founding: FoundingMeta
  cities?: PublicCity[]
  onReserve: () => void
  onSelectCity?: (city: PublicCity) => void
}) {
  const [query, setQuery] = useState('')

  const handleCheck = () => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      onReserve()
      return
    }
    const slug = slugifyCityName(trimmed)
    const match = cities.find(
      (c) =>
        c.city_slug === slug ||
        c.city_name.toLowerCase() === trimmed.toLowerCase() ||
        c.city_name.toLowerCase().includes(trimmed.toLowerCase())
    )
    if (match) onSelectCity?.(match)
    onReserve()
  }

  return (
    <section
      id="opportunity"
      className="relative min-h-[100svh] flex items-end sm:items-center overflow-hidden"
    >
      {/* Full-bleed cinematic hero */}
      <div className="absolute inset-0">
        <img
          src={PARTNERS_IMG.hero}
          alt="Qwikker partner overlooking a city with a global AI network"
          className="h-full w-full object-cover object-[42%_center] sm:object-center"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/78 to-[#050505]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_35%,rgba(0,196,106,0.16),transparent_45%)]" />
      </div>

      <div className="relative z-10 w-full px-5 sm:px-6 pt-28 pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl lg:max-w-2xl">
            <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-[var(--p-accent)] mb-5">
              Digital territory · AI era
            </p>

            <h1
              className="text-4xl sm:text-5xl lg:text-[4rem] font-semibold tracking-tight leading-[1.02] mb-5 drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)]"
              style={{ fontFamily: 'var(--font-partners-display), var(--font-geist-sans), sans-serif' }}
            >
              Own your city&apos;s
              <br />
              <span className="text-[var(--p-accent)]">AI future.</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/90 leading-relaxed mb-3">
              {commercialCopy.heroLead}
            </p>
            <p className="text-base text-white/65 leading-relaxed max-w-lg mb-6">
              {commercialCopy.heroBody}{' '}
              <span className="text-white font-medium">{commercialCopy.heroClose}</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <button
                type="button"
                onClick={onReserve}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-7 py-3.5 text-sm font-semibold text-[#050505] hover:brightness-110 active:scale-[0.98] transition-[filter,transform] shadow-[0_0_40px_-12px_rgba(0,196,106,0.55)]"
              >
                Reserve Your City
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <a
                href="#shift"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-black/30 backdrop-blur-sm px-6 py-3.5 text-sm font-medium text-white hover:bg-black/45 transition-colors"
              >
                See why now
              </a>
            </div>

            <p className="mb-6 text-sm font-medium text-white/55">
              {commercialCopy.positioning}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-6">
              <p className="font-medium text-white" aria-live="polite">
                {commercialCopy.foundingCounterLabel(founding.secured, founding.total)}
              </p>
              <span className="hidden sm:inline text-white/20">|</span>
              <p className="text-white/50">
                {founding.open ? 'Founding partner terms open' : 'Standard partner enquiry'}
              </p>
            </div>

            <div className="max-w-md">
              <div className="flex gap-2 rounded-2xl border border-white/15 bg-[#050505]/65 backdrop-blur-xl p-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
                <label htmlFor="hero-city-search" className="sr-only">
                  Search for your city
                </label>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    id="hero-city-search"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCheck()
                    }}
                    placeholder="Search for your city…"
                    autoComplete="off"
                    className="w-full rounded-xl bg-transparent pl-10 pr-3 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCheck}
                  className="shrink-0 rounded-xl bg-[var(--p-accent)] px-4 py-3 text-sm font-semibold text-[#050505] hover:brightness-110 transition-[filter]"
                >
                  Check
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
