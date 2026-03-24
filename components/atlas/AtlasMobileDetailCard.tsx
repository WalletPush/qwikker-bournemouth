'use client'

import { getPlaceholderVariationWithOverride } from '@/lib/placeholders/getPlaceholderImage'
import type { FactChip } from '@/lib/atlas/buildBusinessFacts'
import type { Business } from './AtlasMode'

interface AtlasMobileDetailCardProps {
  business: Business
  factChips: FactChip[]
  businessesCount: number
  selectedBusinessIndex: number
  tourActive: boolean
  isSaved: boolean
  onPreviousBusiness: () => void
  onNextBusiness: () => void
  onStopTour: () => void
  onTellMeMore: () => void
  onToggleSave: () => void
  onOpenDirections: () => void
}

export function AtlasMobileDetailCard({
  business,
  factChips,
  businessesCount,
  selectedBusinessIndex,
  tourActive,
  isSaved,
  onPreviousBusiness,
  onNextBusiness,
  onStopTour,
  onTellMeMore,
  onToggleSave,
  onOpenDirections,
}: AtlasMobileDetailCardProps) {
  const imageUrl =
    business.business_images?.[0] ||
    getPlaceholderVariationWithOverride(
      business.system_category || 'default',
      business.id,
      business.placeholder_variant
    ).url

  return (
    <div className="space-y-4">
      {imageUrl ? (
        <div className="-mx-6 -mt-6 mb-3 relative h-20 overflow-hidden rounded-t-2xl">
          <img
            src={imageUrl}
            alt={business.business_name}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black/80" />
          <div className="relative z-10 flex h-full items-end justify-between gap-3 p-4">
            {businessesCount > 1 ? (
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 backdrop-blur-sm ${tourActive ? 'border border-[#00d083]/40 bg-[#00d083]/20' : 'border border-white/10 bg-black/30'}`}>
                <span className={`text-sm font-medium ${tourActive ? 'text-[#00d083]' : 'text-white/80'}`}>
                  {tourActive ? 'Stop' : 'Place'} {selectedBusinessIndex + 1} of {businessesCount}
                </span>
              </div>
            ) : (
              <div />
            )}

            {businessesCount > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onPreviousBusiness}
                  className="rounded-lg border border-white/10 bg-black/35 p-2 text-white transition-colors hover:bg-black/55"
                  title="Previous place"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {tourActive && (
                  <button
                    onClick={onStopTour}
                    className="rounded-lg border border-red-500/20 bg-red-500/15 p-2 text-red-300 transition-colors hover:bg-red-500/25"
                    title="Stop tour"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={onNextBusiness}
                  className="rounded-lg border border-white/10 bg-black/35 p-2 text-white transition-colors hover:bg-black/55"
                  title="Next place"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        businessesCount > 1 && (
          <div className="flex items-center justify-between gap-3">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${tourActive ? 'border border-[#00d083]/40 bg-[#00d083]/20' : 'border border-white/10 bg-white/5'}`}>
              <span className={`text-sm font-medium ${tourActive ? 'text-[#00d083]' : 'text-white/50'}`}>
                {tourActive ? 'Stop' : 'Place'} {selectedBusinessIndex + 1} of {businessesCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onPreviousBusiness}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-white transition-colors hover:bg-white/10"
                title="Previous place"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {tourActive && (
                <button
                  onClick={onStopTour}
                  className="rounded-lg border border-red-500/20 bg-red-500/15 p-2 text-red-300 transition-colors hover:bg-red-500/25"
                  title="Stop tour"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                onClick={onNextBusiness}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-white transition-colors hover:bg-white/10"
                title="Next place"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )
      )}

      <div>
        <h2 className="text-xl font-bold text-white">{business.business_name}</h2>
        <p className="mt-1 text-sm text-white/50">
          {business.display_category || business.system_category || 'Business'}
        </p>
      </div>

      {factChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {factChips.map((chip, index) => (
            <span
              key={`${chip.label}-${index}`}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70"
            >
              <span>{chip.label}</span>
            </span>
          ))}
        </div>
      )}

      {business.isUnclaimed && (
        <p className="text-xs text-white/30">Imported from Google</p>
      )}

      {business.business_address && (
        <p className="text-sm text-white/60">{business.business_address}</p>
      )}

      {business.reason && (
        <div className="inline-flex items-center gap-2 rounded-full border border-[#00d083]/40 bg-[#00d083]/20 px-3 py-1.5">
          <span className="text-sm font-medium text-[#00d083]">{business.reason.label}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-4">
        <button
          onClick={onTellMeMore}
          className="min-w-[140px] flex-1 rounded-xl bg-[#00d083] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#00ff9d]"
        >
          Tell me more
        </button>
        <button
          onClick={onToggleSave}
          className={`rounded-xl p-3 transition-colors ${
            isSaved
              ? 'border border-yellow-500/30 bg-yellow-500/20 text-yellow-400'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          ★
        </button>
        <button
          onClick={onOpenDirections}
          className="min-w-[140px] flex-1 rounded-xl bg-white/10 px-4 py-3 font-semibold text-white transition-colors hover:bg-white/20"
        >
          Directions
        </button>
        {business.phone && (
          <a
            href={`tel:${business.phone}`}
            className="rounded-xl bg-white/10 px-4 py-3 font-semibold text-white transition-colors hover:bg-white/20"
          >
            Call
          </a>
        )}
        {business.website_url && (
          <a
            href={business.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-white/10 px-4 py-3 font-semibold text-white transition-colors hover:bg-white/20"
          >
            Website
          </a>
        )}
      </div>
    </div>
  )
}
