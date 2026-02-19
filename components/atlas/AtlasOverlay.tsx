'use client'

/**
 * AtlasOverlay Component
 * 
 * Floating UI overlay for Atlas mode:
 * - Search input (top floating)
 * - Business info bubble (bottom)
 * - Back to chat button (top-left)
 * - Sound toggle (top-right)
 */

import { useState } from 'react'
import Link from 'next/link'
import { Search, X, Volume2, VolumeX, MapPin, Star, Phone, Globe, Navigation, ChevronLeft, ChevronRight, Pause, Play, XCircle } from 'lucide-react'
import type { Business } from './AtlasMode'
import type { Coordinates } from '@/lib/location/useUserLocation'
import { formatDistance, calculateDistanceKm } from '@/lib/utils/distance-formatter'
import type { FactChip } from '@/lib/atlas/buildBusinessFacts'

interface AtlasOverlayProps {
  onClose: () => void
  onSearch: (query: string) => void
  searching: boolean
  selectedBusiness: Business | null
  userLocation: Coordinates | null
  soundEnabled: boolean
  onToggleSound: () => void
  onBusinessSelected?: (businessId: string) => void
  onDirectionsClicked?: (businessId: string) => void
  // Tour mode props
  tourActive?: boolean
  totalBusinesses?: number
  currentBusinessIndex?: number
  onNextBusiness?: () => void
  onPreviousBusiness?: () => void
  onStopTour?: () => void
  factChips?: FactChip[]
  onIntentChipTap?: (label: string) => void
  isSaved?: boolean
  onToggleSave?: () => void
  onTellMeMore?: () => void
}

export function AtlasOverlay({
  onClose,
  onSearch,
  searching,
  selectedBusiness,
  userLocation,
  soundEnabled,
  onToggleSound,
  onBusinessSelected,
  onDirectionsClicked,
  tourActive = false,
  totalBusinesses = 0,
  currentBusinessIndex = 0,
  onNextBusiness,
  onPreviousBusiness,
  onStopTour,
  factChips = [],
  onIntentChipTap,
  isSaved = false,
  onToggleSave,
  onTellMeMore
}: AtlasOverlayProps) {
  const [query, setQuery] = useState('')
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }
  
  // Calculate smart distance if user location is available
  const distanceInfo = selectedBusiness && userLocation
    ? formatDistance(
        calculateDistanceKm(
          { lat: userLocation.lat, lng: userLocation.lng },
          { lat: selectedBusiness.latitude, lng: selectedBusiness.longitude }
        )
      )
    : null
  
  // Open in maps app
  const openInMaps = () => {
    if (!selectedBusiness) return
    
    // Track directions click
    if (onDirectionsClicked) {
      onDirectionsClicked(selectedBusiness.id)
    }
    
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)
    
    const lat = selectedBusiness.latitude
    const lng = selectedBusiness.longitude
    const name = encodeURIComponent(selectedBusiness.business_name)
    
    let url: string
    
    if (isIOS) {
      // Apple Maps
      url = `maps://maps.apple.com/?q=${name}&ll=${lat},${lng}`
    } else if (isAndroid) {
      // Google Maps
      url = `geo:${lat},${lng}?q=${lat},${lng}(${name})`
    } else {
      // Desktop - Google Maps web
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    }
    
    window.open(url, '_blank')
  }
  
  return (
    <>
      {/* Top Controls */}
      <div className="absolute top-6 left-6 right-6 flex items-start justify-between gap-4 pointer-events-none">
        {/* Back Button */}
        <button
          onClick={onClose}
          className="pointer-events-auto flex items-center gap-2 px-4 py-3 bg-black/60 hover:bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl text-white transition-all shadow-xl"
        >
          <X className="w-4 h-4" />
          <span className="font-medium">Back to Chat</span>
        </button>
        
        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className="pointer-events-auto p-3 bg-black/60 hover:bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl text-white transition-all shadow-xl"
          title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>
      
      {/* Search Input */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 pointer-events-none">
        <form onSubmit={handleSubmit} className="pointer-events-auto">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for restaurants, cafes, bars..."
              className="w-full px-6 py-4 pr-14 bg-black/60 backdrop-blur-lg border border-white/10 rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#00d083]/50 focus:ring-2 focus:ring-[#00d083]/20 transition-all shadow-2xl"
              disabled={searching}
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-[#00d083] hover:bg-[#00b86f] disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              {searching ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-black" />
              )}
            </button>
          </div>
        </form>
        
        {/* Search Intent Chips */}
        <div className="pointer-events-auto flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
          {['Open now', 'Closest', 'Top rated', 'Qwikker Picks', 'Coffee', 'Cocktails', 'Family'].map((chip) => (
            <button
              key={chip}
              onClick={() => {
                if (onIntentChipTap) onIntentChipTap(chip)
                else onSearch(chip)
              }}
              className="flex-shrink-0 px-3.5 py-2 bg-white/5 hover:bg-[#00d083]/15 border border-white/10 hover:border-[#00d083]/30 rounded-full text-xs text-white/70 hover:text-[#00d083] transition-all whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
      
      {/* Business Info Bubble (Bottom) */}
      {selectedBusiness && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 pointer-events-none">
          <div className="pointer-events-auto bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl">
            {/* Tour Controls (Top of card) */}
            {totalBusinesses > 1 && (
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  {/* Progress indicator */}
                  <span className="text-sm text-white/60">
                    {currentBusinessIndex + 1} of {totalBusinesses}
                  </span>
                  
                  {/* Tour status */}
                  {tourActive && (
                    <span className="px-2 py-0.5 bg-[#00d083]/20 text-[#00d083] text-xs rounded-lg">
                      Tour Active
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Previous button */}
                  <button
                    onClick={onPreviousBusiness}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={totalBusinesses <= 1}
                    title="Previous business"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {/* Stop tour */}
                  {tourActive && onStopTour && (
                    <button
                      onClick={onStopTour}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
                      title="Stop tour"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Next button */}
                  <button
                    onClick={onNextBusiness}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={totalBusinesses <= 1}
                    title="Next business"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-4">
              {/* Business Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold mb-1">
                  <Link 
                    href={`/user/business/${selectedBusiness.slug || selectedBusiness.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || selectedBusiness.id}`}
                    className="text-white hover:text-[#00d083] transition-colors duration-200"
                  >
                    {selectedBusiness.business_name}
                  </Link>
                </h3>
                
                {selectedBusiness.business_tagline && (
                  <p className="text-sm text-white/60 mb-3">
                    {selectedBusiness.business_tagline}
                  </p>
                )}
                
                {/* Primary Reason Tag */}
                {selectedBusiness.reason && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-3 rounded-full bg-[#00d083]/10 border border-[#00d083]/30">
                    {selectedBusiness.reason.emoji && <span>{selectedBusiness.reason.emoji}</span>}
                    <span className="text-sm text-[#00d083] font-medium">{selectedBusiness.reason.label}</span>
                  </div>
                )}
                
                {/* Fact Chips */}
                {factChips.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {factChips.map((chip, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70"
                      >
                        <span>{chip.icon}</span>
                        <span>{chip.label}</span>
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Trust cue for unclaimed businesses */}
                {selectedBusiness.isUnclaimed && (
                  <p className="text-xs text-white/30 mb-2">Imported from Google</p>
                )}
                
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {/* Rating */}
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-white font-medium">{selectedBusiness.rating}</span>
                    <span className="text-white/40">({selectedBusiness.review_count})</span>
                  </div>
                  
                  {/* Category */}
                  {selectedBusiness.display_category && (
                    <span className="px-2.5 py-1 bg-white/10 text-white/80 rounded-lg font-medium">
                      {selectedBusiness.display_category}
                    </span>
                  )}
                  
                  {/* Smart Distance */}
                  {distanceInfo && (
                    <div className="flex items-center gap-1.5 text-white/60">
                      <MapPin className="w-4 h-4" />
                      <span>{distanceInfo.text.replace('📍 ', '')}</span>
                    </div>
                  )}
                </div>
                
                {/* Address */}
                {selectedBusiness.business_address && (
                  <p className="text-sm text-white/40 mt-3">
                    {selectedBusiness.business_address}
                  </p>
                )}
              </div>
              
              {/* Directions Button */}
              <button
                onClick={openInMaps}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 px-5 py-3 bg-[#00d083] hover:bg-[#00b86f] rounded-2xl transition-colors group"
              >
                <Navigation className="w-6 h-6 text-black" />
                <span className="text-xs font-medium text-black">Directions</span>
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
              {onTellMeMore && (
                <button
                  onClick={onTellMeMore}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00d083]/10 hover:bg-[#00d083]/20 border border-[#00d083]/30 rounded-xl text-[#00d083] hover:text-[#00ff9d] transition-all text-sm"
                >
                  <span>Tell me more</span>
                </button>
              )}
              
              {onToggleSave && (
                <button
                  onClick={onToggleSave}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm ${
                    isSaved
                      ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
                      : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white'
                  }`}
                >
                  <Star className={`w-4 h-4 ${isSaved ? 'fill-yellow-400' : ''}`} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>
              )}
              
              {selectedBusiness.phone && (
                <a
                  href={`tel:${selectedBusiness.phone}`}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-all text-sm"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call</span>
                </a>
              )}
              
              {selectedBusiness.website_url && (
                <a
                  href={selectedBusiness.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-all text-sm"
                >
                  <Globe className="w-4 h-4" />
                  <span>Website</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
