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
import { Search, X, Volume2, VolumeX, MapPin, Star, Phone, Globe, Navigation } from 'lucide-react'
import type { Business } from './AtlasMode'
import type { Coordinates } from '@/lib/location/useUserLocation'
import { calculateWalkingTime } from '@/lib/location/useUserLocation'

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
  onDirectionsClicked
}: AtlasOverlayProps) {
  const [query, setQuery] = useState('')
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }
  
  // Calculate walking time if user location is available
  const walkingMinutes = selectedBusiness && userLocation
    ? calculateWalkingTime(userLocation, {
        lat: selectedBusiness.latitude,
        lng: selectedBusiness.longitude
      })
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
      </div>
      
      {/* Business Info Bubble (Bottom) */}
      {selectedBusiness && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 pointer-events-none">
          <div className="pointer-events-auto bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              {/* Business Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-white mb-1">
                  {selectedBusiness.business_name}
                </h3>
                
                {selectedBusiness.business_tagline && (
                  <p className="text-sm text-white/60 mb-3">
                    {selectedBusiness.business_tagline}
                  </p>
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
                    <span className="px-2.5 py-1 bg-[#00d083]/20 text-[#00d083] rounded-lg font-medium">
                      {selectedBusiness.display_category}
                    </span>
                  )}
                  
                  {/* Walking Time */}
                  {walkingMinutes !== null && (
                    <div className="flex items-center gap-1.5 text-white/60">
                      <MapPin className="w-4 h-4" />
                      <span>~{walkingMinutes} min walk</span>
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
