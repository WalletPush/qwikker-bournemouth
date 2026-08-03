'use client'

import type { PublicCity } from '@/components/partners/partners-opportunity-page'
import { PARTNERS_CITY_NIGHT_IMG } from '@/components/partners/sections/visual-assets'

export function PartnersRecentlyReserved({
  cities,
  onSelect,
}: {
  cities: PublicCity[]
  onSelect?: (city: PublicCity) => void
}) {
  if (!cities.length) return null

  return (
    <div className="mt-8">
      <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[var(--p-faint)] mb-4">
        Recently reserved
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {cities.map((c) => (
          <button
            key={c.city_slug}
            type="button"
            onClick={() => onSelect?.(c)}
            className="shrink-0 w-[180px] rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] overflow-hidden text-left hover:border-white/20 transition-colors"
          >
            <div className="relative h-24 bg-[#111]">
              <img
                src={c.thumbnail_url || PARTNERS_CITY_NIGHT_IMG}
                alt=""
                className="h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] to-transparent" />
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-[var(--p-reserved)] border border-[var(--p-reserved)]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--p-reserved)]" />
                Reserved
              </span>
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-white truncate">{c.city_name}</p>
              {c.country && (
                <p className="text-xs text-[var(--p-faint)] truncate">{c.country}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
