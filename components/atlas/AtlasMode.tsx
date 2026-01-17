'use client'

/**
 * AtlasMode Component
 * 
 * Full-screen map discovery mode for QWIKKER
 * - Dark atmospheric theme with fog
 * - Animated business markers
 * - Smooth flyTo transitions
 * - Curved route visualization
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Map as MapboxMap, LngLatLike, MapboxGeoJSONFeature } from 'mapbox-gl'
import { AtlasOverlay } from './AtlasOverlay'
import { ChatContextStrip } from './ChatContextStrip'
import { usePerformanceMode } from '@/lib/atlas/usePerformanceMode'
import { useAtlasAnalytics } from '@/lib/atlas/useAtlasAnalytics'
import type { Coordinates } from '@/lib/location/useUserLocation'

export interface Business {
  id: string
  business_name: string
  latitude: number
  longitude: number
  rating: number
  review_count: number
  business_tagline?: string
  display_category?: string
  business_address?: string
  google_place_id?: string
  website_url?: string
  phone?: string
}

export interface AtlasConfig {
  enabled: boolean
  mapboxPublicToken: string | null
  styleUrl: string | null
  defaultZoom: number
  pitch: number
  bearing: number
  maxResults: number
}

interface AtlasModeProps {
  config: AtlasConfig
  center: Coordinates
  userLocation: Coordinates | null
  onClose: () => void
  soundEnabled: boolean
  onToggleSound: () => void
  city: string
  userId?: string
  lastUserQuery?: string
  lastAIResponse?: string
}

export function AtlasMode({
  config,
  center,
  userLocation,
  onClose,
  soundEnabled,
  onToggleSound,
  city,
  userId,
  lastUserQuery,
  lastAIResponse
}: AtlasModeProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<MapboxMap | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [searching, setSearching] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  
  // Performance mode detection
  const performanceMode = usePerformanceMode()
  
  // Analytics tracking
  const { trackEvent } = useAtlasAnalytics(city, userId)
  
  // Track Atlas opened on mount
  useEffect(() => {
    trackEvent({
      eventType: 'atlas_opened',
      performanceMode: performanceMode.enabled
    })
  }, [trackEvent, performanceMode.enabled])
  
  // Audio refs
  const audioWakeRef = useRef<HTMLAudioElement | null>(null)
  const audioMoveRef = useRef<HTMLAudioElement | null>(null)
  const audioArriveRef = useRef<HTMLAudioElement | null>(null)
  const lastMoveTime = useRef<number>(0)
  
  // Initialize audio (only once)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    audioWakeRef.current = new Audio('/sfx/atlas-wake.mp3')
    audioMoveRef.current = new Audio('/sfx/atlas-move.mp3')
    audioArriveRef.current = new Audio('/sfx/atlas-arrive.mp3')
    
    // Preload
    audioWakeRef.current.load()
    audioMoveRef.current.load()
    audioArriveRef.current.load()
  }, [])
  
  // Play sound helper
  const playSound = useCallback((audio: HTMLAudioElement | null) => {
    if (!soundEnabled || !audio) return
    
    audio.currentTime = 0
    audio.play().catch(() => {
      // Ignore autoplay restrictions
    })
  }, [soundEnabled])
  
  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainer.current || map.current || !config.mapboxPublicToken) return
    
    const initMap = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const mapboxgl = await import('mapbox-gl')
        
        // @ts-ignore
        mapboxgl.accessToken = config.mapboxPublicToken
        
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current!,
          style: config.styleUrl || 'mapbox://styles/mapbox/dark-v11',
          center: [center.lng, center.lat],
          zoom: config.defaultZoom,
          pitch: performanceMode.enabled ? performanceMode.pitch : config.pitch,
          bearing: config.bearing,
          antialias: !performanceMode.enabled,
          fadeDuration: performanceMode.enabled ? 150 : 300
        })
        
        // Add fog for atmosphere (only if performance mode OFF)
        mapInstance.on('load', () => {
          if (!performanceMode.enabled && performanceMode.fog) {
            mapInstance.setFog({
              color: 'rgb(5, 5, 15)',
              'high-color': 'rgb(10, 15, 30)',
              'horizon-blend': 0.3,
              'space-color': 'rgb(0, 0, 5)',
              'star-intensity': 0.5
            })
          }
          
          setMapLoaded(true)
          
          // Play wake sound
          playSound(audioWakeRef.current)
        })
        
        // Add navigation controls
        mapInstance.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
        
        map.current = mapInstance
      } catch (error) {
        console.error('[Atlas] Failed to initialize map:', error)
      }
    }
    
    initMap()
    
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [config, center, playSound])
  
  // Clear markers helper
  const clearMarkers = useCallback(() => {
    if (!map.current || !map.current.getSource('businesses')) return
    
    map.current.getSource('businesses').setData({
      type: 'FeatureCollection',
      features: []
    })
  }, [])
  
  // Add markers for businesses
  const addBusinessMarkers = useCallback(async (businesses: Business[]) => {
    if (!map.current || !mapLoaded) return
    
    try {
      const mapboxgl = await import('mapbox-gl')
      
      // Remove existing source and layer
      if (map.current.getLayer('business-markers')) {
        map.current.removeLayer('business-markers')
      }
      if (map.current.getSource('businesses')) {
        map.current.removeSource('businesses')
      }
      
      // Create GeoJSON features
      const features = businesses.map(business => ({
        type: 'Feature' as const,
        properties: {
          id: business.id,
          name: business.business_name,
          rating: business.rating,
          category: business.display_category || 'Business'
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [business.longitude, business.latitude]
        }
      }))
      
      // Add source
      map.current.addSource('businesses', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features
        }
      })
      
      // Add circle layer with glow
      map.current.addLayer({
        id: 'business-markers',
        type: 'circle',
        source: 'businesses',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 8,
            16, 20
          ],
          'circle-color': '#00d083',
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#00ff9d',
          'circle-stroke-opacity': 0.6
        }
      })
      
      // Add glow layer
      map.current.addLayer({
        id: 'business-markers-glow',
        type: 'circle',
        source: 'businesses',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 16,
            16, 40
          ],
          'circle-color': '#00d083',
          'circle-opacity': 0.2,
          'circle-blur': 1
        }
      })
      
      // Click handler
      map.current.on('click', 'business-markers', (e) => {
        if (!e.features || e.features.length === 0) return
        
        const feature = e.features[0]
        const businessId = feature.properties?.id
        const business = businesses.find(b => b.id === businessId)
        
        if (business) {
          setSelectedBusiness(business)
          flyToBusiness(business)
        }
      })
      
      // Cursor style
      map.current.on('mouseenter', 'business-markers', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer'
      })
      
      map.current.on('mouseleave', 'business-markers', () => {
        if (map.current) map.current.getCanvas().style.cursor = ''
      })
      
    } catch (error) {
      console.error('[Atlas] Failed to add markers:', error)
    }
  }, [mapLoaded])
  
  // Fly to business with smooth animation
  const flyToBusiness = useCallback((business: Business) => {
    if (!map.current) return
    
    // Throttle move sound (max once per 8s)
    const now = Date.now()
    if (now - lastMoveTime.current > 8000) {
      playSound(audioMoveRef.current)
      lastMoveTime.current = now
    }
    
    map.current.flyTo({
      center: [business.longitude, business.latitude],
      zoom: 16,
      pitch: 60,
      bearing: 0,
      duration: 2000,
      essential: true,
      curve: 1.42 // More curved trajectory
    })
    
    // Play arrive sound at end
    setTimeout(() => {
      playSound(audioArriveRef.current)
    }, 2000)
    
  }, [playSound])
  
  // Search handler
  const handleSearch = useCallback(async (query: string) => {
    setSearching(true)
    setSelectedBusiness(null)
    
    try {
      // Apply performance mode result limit
      const limit = performanceMode.enabled ? performanceMode.maxMarkers : config.maxResults
      
      const response = await fetch(`/api/atlas/search?q=${encodeURIComponent(query)}&limit=${limit}`)
      const data = await response.json()
      
      if (data.ok && data.results) {
        setBusinesses(data.results)
        await addBusinessMarkers(data.results)
        
        // Track search performed
        trackEvent({
          eventType: 'atlas_search_performed',
          query,
          resultsCount: data.results.length,
          performanceMode: performanceMode.enabled
        })
        
        // Fly to first result
        if (data.results.length > 0) {
          const firstBusiness = data.results[0]
          setSelectedBusiness(firstBusiness)
          flyToBusiness(firstBusiness)
        }
      }
    } catch (error) {
      console.error('[Atlas] Search failed:', error)
    } finally {
      setSearching(false)
    }
  }, [addBusinessMarkers, flyToBusiness, config.maxResults, performanceMode, trackEvent])
  
  // Handle close with analytics
  const handleClose = useCallback(() => {
    trackEvent({
      eventType: 'atlas_returned_to_chat',
      performanceMode: performanceMode.enabled
    })
    onClose()
  }, [trackEvent, performanceMode.enabled, onClose])
  
  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Chat Context Strip */}
      {mapLoaded && (lastUserQuery || lastAIResponse) && (
        <ChatContextStrip
          userQuery={lastUserQuery}
          aiResponse={lastAIResponse}
        />
      )}
      
      {/* Overlay UI */}
      <AtlasOverlay
        onClose={handleClose}
        onSearch={handleSearch}
        searching={searching}
        selectedBusiness={selectedBusiness}
        userLocation={userLocation}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        onBusinessSelected={(businessId) => {
          trackEvent({
            eventType: 'atlas_business_selected',
            businessId,
            performanceMode: performanceMode.enabled
          })
        }}
        onDirectionsClicked={(businessId) => {
          trackEvent({
            eventType: 'atlas_directions_clicked',
            businessId,
            performanceMode: performanceMode.enabled
          })
        }}
      />
      
      {/* Loading State */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#00d083]/30 border-t-[#00d083] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Loading Atlas...</p>
          </div>
        </div>
      )}
      
      {/* Mapbox CSS */}
      <link
        href="https://api.mapbox.com/mapbox-gl-js/v3.18.0/mapbox-gl.css"
        rel="stylesheet"
      />
    </div>
  )
}
