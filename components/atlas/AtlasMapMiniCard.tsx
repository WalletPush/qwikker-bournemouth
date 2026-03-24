'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, Globe, Navigation, Phone, Star, X, XCircle } from 'lucide-react'
import type { Business } from './AtlasMode'
import type { Coordinates } from '@/lib/location/useUserLocation'
import type { FactChip } from '@/lib/atlas/buildBusinessFacts'
import { formatDistance, calculateDistanceKm } from '@/lib/utils/distance-formatter'
import { getPlaceholderVariationWithOverride } from '@/lib/placeholders/getPlaceholderImage'

interface AtlasMapMiniCardProps {
  selectedBusiness: Business
  userLocation: Coordinates | null
  factChips?: FactChip[]
  currentBusinessIndex?: number
  totalBusinesses?: number
  tourActive?: boolean
  onNextBusiness?: () => void
  onPreviousBusiness?: () => void
  onStopTour?: () => void
  onClearSelection?: () => void
  isSaved?: boolean
  onToggleSave?: () => void
  onTellMeMore?: () => void
  onDirectionsClicked?: (businessId: string) => void
}

export function AtlasMapMiniCard({
  selectedBusiness,
  userLocation,
  factChips = [],
  currentBusinessIndex = 0,
  totalBusinesses = 0,
  tourActive = false,
  onNextBusiness,
  onPreviousBusiness,
  onStopTour,
  onClearSelection,
  isSaved = false,
  onToggleSave,
  onTellMeMore,
  onDirectionsClicked,
}: AtlasMapMiniCardProps) {
  const cardImageUrl =
    selectedBusiness.business_images?.[0] ||
    getPlaceholderVariationWithOverride(
      selectedBusiness.system_category || 'default',
      selectedBusiness.id,
      selectedBusiness.placeholder_variant
    ).url

  const distanceInfo = userLocation
    ? formatDistance(
        calculateDistanceKm(
          { lat: userLocation.lat, lng: userLocation.lng },
          { lat: selectedBusiness.latitude, lng: selectedBusiness.longitude }
        )
      )
    : null

  const quickFacts = factChips.slice(0, 3).map((chip) => chip.label)

  const openInMaps = () => {
    if (onDirectionsClicked) onDirectionsClicked(selectedBusiness.id)

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)
    const lat = selectedBusiness.latitude
    const lng = selectedBusiness.longitude
    const name = encodeURIComponent(selectedBusiness.business_name)

    const url = isIOS
      ? `maps://maps.apple.com/?q=${name}&ll=${lat},${lng}`
      : isAndroid
        ? `geo:${lat},${lng}?q=${lat},${lng}(${name})`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

    window.open(url, '_blank')
  }

  const href =
    `/user/business/${
      selectedBusiness.slug ||
      selectedBusiness.business_name
        .toLowerCase()
        .replace(/['']/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') ||
      selectedBusiness.id
    }`

  return (
    <div className="pointer-events-none absolute bottom-10 left-6 z-30 hidden w-[22rem] lg:block">
      <div className="pointer-events-auto relative overflow-visible">
        <div className="overflow-hidden rounded-[28px] border border-[#00d083]/35 bg-[#050505]/96 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-[#00d083]/10" />
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#00d083]/45 to-transparent" />
        <div className="relative h-28 overflow-hidden border-b border-white/10">
          <img
            src={cardImageUrl}
            alt={selectedBusiness.business_name}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/35 to-black/85" />
          <div className="relative flex h-full items-start justify-between p-4">
            <div className="rounded-full border border-[#00d083]/20 bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
              {totalBusinesses > 1 ? `${currentBusinessIndex + 1} of ${totalBusinesses}` : 'Selected'}
            </div>
            <div className="flex items-center gap-2">
              {totalBusinesses > 1 && (
                <>
                  <button
                    onClick={onPreviousBusiness}
                    className="rounded-lg border border-white/10 bg-black/40 p-2 text-white transition-colors hover:border-[#00d083]/25 hover:bg-black/60"
                    title="Previous place"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onNextBusiness}
                    className="rounded-lg border border-white/10 bg-black/40 p-2 text-white transition-colors hover:border-[#00d083]/25 hover:bg-black/60"
                    title="Next place"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
              {tourActive && onStopTour && (
                <button
                  onClick={onStopTour}
                  className="rounded-lg border border-red-500/20 bg-red-500/15 p-2 text-red-300 transition-colors hover:bg-red-500/25"
                  title="Stop tour"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
              {onClearSelection && (
                <button
                  onClick={onClearSelection}
                  className="rounded-lg border border-white/10 bg-black/40 p-2 text-white transition-colors hover:border-[#00d083]/25 hover:bg-black/60"
                  title="Close card"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <Link href={href} className="block text-lg font-semibold text-white transition-colors hover:text-[#00d083]">
                {selectedBusiness.business_name}
              </Link>
              <p className="mt-1 text-sm text-white/55">
                {selectedBusiness.display_category || selectedBusiness.system_category || 'Business'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {quickFacts.map((fact) => (
                  <span
                    key={fact}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70"
                  >
                    {fact}
                  </span>
                ))}
                {distanceInfo && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
                    {distanceInfo.text}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={openInMaps}
              className="flex shrink-0 items-center gap-2 rounded-2xl bg-[#00d083] px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-[#00ff9d]"
            >
              <Navigation className="h-4 w-4" />
              Directions
            </button>
          </div>

          {selectedBusiness.business_address && (
            <p className="mt-3 text-sm text-white/45">{selectedBusiness.business_address}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {onTellMeMore && (
              <button
                onClick={onTellMeMore}
                className="rounded-xl border border-[#00d083]/30 bg-[#00d083]/10 px-3 py-2 text-sm text-[#00d083] transition-colors hover:bg-[#00d083]/20"
              >
                Tell me more
              </button>
            )}
            {onToggleSave && (
              <button
                onClick={onToggleSave}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                  isSaved
                    ? 'border border-yellow-500/30 bg-yellow-500/15 text-yellow-400'
                    : 'border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Star className={`h-4 w-4 ${isSaved ? 'fill-yellow-400' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </button>
            )}
            {selectedBusiness.phone && (
              <a
                href={`tel:${selectedBusiness.phone}`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
            )}
            {selectedBusiness.website_url && (
              <a
                href={selectedBusiness.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Globe className="h-4 w-4" />
                Website
              </a>
            )}
          </div>
        </div>
        </div>
        <div className="pointer-events-none absolute bottom-[-16px] left-10 h-8 w-8 rotate-45 rounded-[8px] border-b border-r border-[#00d083]/35 bg-[#050505]/96 shadow-[12px_12px_28px_rgba(0,0,0,0.35)]" />
        <div className="pointer-events-none absolute bottom-[-7px] left-[2.95rem] h-3 w-3 rounded-full bg-[#00d083]/40 blur-[6px]" />
      </div>
    </div>
  )
}
