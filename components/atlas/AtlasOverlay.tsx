'use client'

import { useState } from 'react'
import { Search, X, ChevronLeft, ChevronRight, XCircle, Sparkles, Radar } from 'lucide-react'
import type { Business } from './AtlasMode'
import type { FactChip } from '@/lib/atlas/buildBusinessFacts'

interface AtlasOverlayProps {
  onClose: () => void
  onSearch: (query: string) => void
  searching: boolean
  selectedBusiness: Business | null
  city: string
  lastUserQuery?: string
  lastAIResponse?: string
  hudSummary?: string
  visibleBusinessCount: number
  showSearchThisArea?: boolean
  onSearchThisArea?: () => void
  showTourPrompt?: boolean
  onStartTour?: () => void
  // Tour mode props
  tourActive?: boolean
  totalBusinesses?: number
  currentBusinessIndex?: number
  onNextBusiness?: () => void
  onPreviousBusiness?: () => void
  onStopTour?: () => void
  factChips?: FactChip[]
  onIntentChipTap?: (label: string) => void
  onTellMeMore?: () => void
}

export function AtlasOverlay({
  onClose,
  onSearch,
  searching,
  selectedBusiness,
  city,
  lastUserQuery,
  lastAIResponse,
  hudSummary,
  visibleBusinessCount,
  showSearchThisArea = false,
  onSearchThisArea,
  showTourPrompt = false,
  onStartTour,
  tourActive = false,
  totalBusinesses = 0,
  currentBusinessIndex = 0,
  onNextBusiness,
  onPreviousBusiness,
  onStopTour,
  factChips = [],
  onIntentChipTap,
  onTellMeMore
}: AtlasOverlayProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  const contextSummary = hudSummary || lastAIResponse
  const primaryFacts = factChips.slice(0, 4)

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-[#050505]">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#00d083]/70">Atlas</p>
              <h2 className="mt-1 text-lg font-semibold text-white">{city}</h2>
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
              Back
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Atlas"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 pr-12 text-white placeholder:text-white/35 focus:outline-none focus:border-[#00d083]/50 focus:ring-2 focus:ring-[#00d083]/20"
                disabled={searching}
              />
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-[#00d083] p-2.5 transition-colors hover:bg-[#00ff9d] disabled:cursor-not-allowed disabled:bg-white/10"
              >
                {searching ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                ) : (
                  <Search className="h-4 w-4 text-black" />
                )}
              </button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {['Open now', 'Closest', 'Top rated', 'Qwikker Picks', 'Coffee', 'Cocktails', 'Family'].map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  if (onIntentChipTap) onIntentChipTap(chip)
                  else onSearch(chip)
                }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-all hover:border-[#00d083]/30 hover:bg-[#00d083]/10 hover:text-[#00d083]"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
                <Radar className="h-3.5 w-3.5" />
                Session
              </div>
              <p className="text-sm text-white/90">{lastUserQuery || 'Browse the map and refine the area.'}</p>
              {contextSummary && (
                <p className="mt-2 text-sm leading-relaxed text-white/55">{contextSummary}</p>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Results</p>
                  <p className="mt-1 text-lg font-semibold text-white">{visibleBusinessCount} places</p>
                </div>
                {showSearchThisArea && onSearchThisArea && (
                  <button
                    onClick={onSearchThisArea}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Search this area
                  </button>
                )}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/45">
                Green pins are the current focus. Grey pins stay available for free roam.
              </p>
            </section>

            {(totalBusinesses > 1 || showTourPrompt || tourActive) && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Tour</p>
                    <p className="mt-1 text-sm text-white/80">
                      {tourActive
                        ? `Stop ${currentBusinessIndex + 1} of ${totalBusinesses}`
                        : `${totalBusinesses} places ready`}
                    </p>
                  </div>
                  {tourActive && (
                    <span className="rounded-full border border-[#00d083]/30 bg-[#00d083]/10 px-2.5 py-1 text-xs text-[#00d083]">
                      Active
                    </span>
                  )}
                </div>

                {tourActive ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onPreviousBusiness}
                      className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-white transition-colors hover:bg-white/10"
                      title="Previous business"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={onNextBusiness}
                      className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-white transition-colors hover:bg-white/10"
                      title="Next business"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {onStopTour && (
                      <button
                        onClick={onStopTour}
                        className="ml-auto rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/20"
                      >
                        Stop tour
                      </button>
                    )}
                  </div>
                ) : (
                  showTourPrompt && onStartTour && (
                    <button
                      onClick={onStartTour}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#00d083] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#00ff9d]"
                    >
                      <Sparkles className="h-4 w-4" />
                      Take a tour
                    </button>
                  )
                )}
              </section>
            )}

            <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
              {selectedBusiness ? (
                <>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">Focused now</p>
                  <p className="mt-2 text-white/85">{selectedBusiness.business_name}</p>
                  {selectedBusiness.reason && (
                    <p className="mt-2 text-xs text-[#00d083]">{selectedBusiness.reason.label}</p>
                  )}
                  {primaryFacts[0] && (
                    <p className="mt-2 text-xs text-white/45">{primaryFacts[0].label}</p>
                  )}
                  {onTellMeMore && (
                    <button
                      onClick={onTellMeMore}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#00d083]/30 bg-[#00d083]/10 px-4 py-2.5 text-sm text-[#00d083] transition-colors hover:bg-[#00d083]/20"
                    >
                      Tell me more
                    </button>
                  )}
                </>
              ) : (
                <p>Select a pin to preview the place on the map.</p>
              )}
            </section>
          </div>
        </div>
    </div>
  )
}
