'use client'

/**
 * AtlasMode Component — QWIKKER ATLAS
 * 
 * Premium AI-controlled neon map experience:
 * - Cinematic dark basemap with vignette overlay
 * - Neon glowing pins (cyan for businesses, green for active)
 * - Premium "YOU" marker (big bright green with pulse)
 * - Animated curved route from user to active business
 * - Smooth flyTo + arrival ping animations
 * - Manual location button for Safari compatibility
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Map as MapboxMap, LngLatLike, MapboxGeoJSONFeature } from 'mapbox-gl'
import Head from 'next/head'
import { AtlasOverlay } from './AtlasOverlay'
import { AtlasHudBubble } from './AtlasHudBubble'
import { ChatContextStrip } from './ChatContextStrip'
import { AtlasIntroOverlay } from './AtlasIntroOverlay'
import { usePerformanceMode } from '@/lib/atlas/usePerformanceMode'
import { useAtlasAnalytics } from '@/lib/atlas/useAtlasAnalytics'
import type { Coordinates } from '@/lib/location/useUserLocation'
import type { LocationStatus } from '@/lib/location/useUserLocation'
import type { AtlasResponse } from '@/lib/ai/prompts/atlas'
import {
  getUserLocationLayers,
  getBusinessPinLayers,
  // getArrivalPulseLayer, // 🚨 REMOVED: Mapbox doesn't support feature-state in filters
  getClusterLayers,
  getActiveBusinessLayers,
  getRouteLayers,
  buildArcRoute,
  QWIKKER_GREEN,
  QWIKKER_GREEN_BRIGHT,
  NEON_CYAN
} from '@/lib/atlas/atlas-styles'

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
  business_tier?: string // ✅ For determining pin color
  isPaid?: boolean // ✅ For cyan pins (paid/trial businesses)
  isUnclaimed?: boolean // ✅ For grey pins (unclaimed businesses)
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
  locationStatus?: LocationStatus
  onClose: () => void
  soundEnabled: boolean
  onToggleSound: () => void
  city: string
  userId?: string
  lastUserQuery?: string
  lastAIResponse?: string
  onRequestLocation?: () => void  // Manual location request trigger
  initialQuery?: string | null  // Query to run when Atlas opens (from chat CTA)
  onInitialQueryConsumed?: () => void  // Callback after initial query is consumed
  businesses?: Business[]  // ✅ NEW: Businesses from chat (avoids re-querying)
}

export function AtlasMode({
  config,
  center,
  userLocation,
  locationStatus,
  onClose,
  soundEnabled,
  onToggleSound,
  city,
  userId,
  lastUserQuery,
  lastAIResponse,
  onRequestLocation,
  initialQuery,
  onInitialQueryConsumed,
  businesses: incomingBusinesses
}: AtlasModeProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<MapboxMap | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [searching, setSearching] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [selectedBusinessIndex, setSelectedBusinessIndex] = useState<number>(0)
  
  // Tour mode state
  const [tourActive, setTourActive] = useState(false)
  const tourTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Track if event handlers are attached (prevent duplicates)
  const businessHandlersAttachedRef = useRef(false)
  const businessesRef = useRef<Business[]>([])
  const processedIncomingBusinessesRef = useRef<string | null>(null) // Track if we've processed this batch
  
  // HUD bubble state
  const [hudVisible, setHudVisible] = useState(false)
  const [hudSummary, setHudSummary] = useState('')
  const [hudPrimaryBusinessName, setHudPrimaryBusinessName] = useState<string | null>(null)
  const hudDismissTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [lastAtlasQuery, setLastAtlasQuery] = useState<string | null>(null)
  const [lastAtlasBusinessIds, setLastAtlasBusinessIds] = useState<string[]>([])
  const ranInitialQueryRef = useRef(false)
  
  // Performance mode detection
  const performanceMode = usePerformanceMode()
  
  // Analytics tracking (city derived server-side from hostname)
  const { trackEvent } = useAtlasAnalytics(userId)
  
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
    
    try {
      audioWakeRef.current = new Audio('/sfx/atlas-wake.mp3')
      audioMoveRef.current = new Audio('/sfx/atlas-move.mp3')
      audioArriveRef.current = new Audio('/sfx/atlas-arrive.mp3')
      
      // Preload (fails silently if files not found)
      audioWakeRef.current.load()
      audioMoveRef.current.load()
      audioArriveRef.current.load()
    } catch (error) {
      console.warn('Atlas audio files not loaded (optional):', error)
    }
  }, [])
  
  // Play sound helper
  const playSound = useCallback((audio: HTMLAudioElement | null) => {
    if (!soundEnabled || !audio) return
    
    audio.currentTime = 0
    audio.play().catch(() => {
      // Ignore autoplay restrictions or missing files
    })
  }, [soundEnabled])
  
  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainer.current || map.current || !config.mapboxPublicToken) {
      if (process.env.NODE_ENV === 'development') {
        if (!config.mapboxPublicToken) {
          console.error('[Atlas] No Mapbox token provided')
        }
      }
      return
    }
    
    const initMap = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const mapboxglModule = await import('mapbox-gl')
        const mapboxgl = mapboxglModule.default
        
        // Set access token (use default export for compatibility)
        mapboxgl.accessToken = config.mapboxPublicToken
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Atlas] Initializing map at:', center)
        }
        
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
          console.log('[Atlas] 🔄 Map load event fired, checking style...')
          
          // ✅ CRITICAL FIX: Wait for BOTH loaded() AND isStyleLoaded()
          // Fixes frozen map where jumpTo/flyTo commands are ignored
          const checkFullyLoaded = () => {
            if (mapInstance.isStyleLoaded() && mapInstance.loaded()) {
              console.log('[Atlas] ✅ Map AND style fully loaded! Ready to accept commands.')
              
              if (process.env.NODE_ENV === 'development') {
                // Debug: Store map instance globally for Fast Refresh debugging
                ;(window as any).__atlasMap = mapInstance
                console.log('[Atlas] window.__atlasMap set for debugging')
              }
              
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
            } else {
              console.log('[Atlas] ⏳ Not ready yet (isStyleLoaded:', mapInstance.isStyleLoaded(), ', loaded:', mapInstance.loaded(), '), retrying in 100ms...')
              setTimeout(checkFullyLoaded, 100)
            }
          }
          
          checkFullyLoaded()
        })
        
        // Add navigation controls
        mapInstance.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
        
        map.current = mapInstance
      } catch (error) {
        console.error('[Atlas] Failed to initialize map:', error)
        if (process.env.NODE_ENV === 'development') {
          console.error('[Atlas] Config:', { 
            hasToken: !!config.mapboxPublicToken,
            hasStyle: !!config.styleUrl,
            center 
          })
        }
      }
    }
    
    initMap()
    
    return () => {
      // ✅ CRITICAL: Don't destroy map on Fast Refresh (development only)
      // In production, this cleanup will run on unmount as expected
      if (process.env.NODE_ENV === 'production') {
        if (userMarkerRef.current) {
          userMarkerRef.current.remove()
        }
        if (map.current) {
          map.current.remove()
          map.current = null
        }
      } else {
        console.log('[Atlas] Skipping cleanup (Fast Refresh detected)')
      }
    }
  }, [
    config.mapboxPublicToken,
    config.styleUrl,
    config.defaultZoom,
    config.pitch,
    config.bearing,
    performanceMode.enabled,
    performanceMode.pitch,
    performanceMode.fog,
    playSound
    // ✅ CRITICAL FIX: Remove center.lat/center.lng dependencies
    // Map should ONLY initialize ONCE on mount, never recreate
    // Center changes should use flyTo, not recreate the map
  ])
  
  // Pending flyTo request (queue if map not loaded yet)
  const pendingFlyToRef = useRef<{ coords: Coordinates; zoom: number } | null>(null)
  
  // User location marker ref (HTML marker for 3D pin)
  const userMarkerRef = useRef<any>(null)
  
  // User location marker management (3D PIN STYLE) - always on top!
  const addUserLocationMarker = useCallback(async (coords: Coordinates) => {
    if (!map.current || !mapLoaded) {
      console.log('[Atlas] ⚠️ Cannot add marker: mapLoaded=', mapLoaded)
      return
    }
    
    try {
      const mapboxglModule = await import('mapbox-gl')
      const mapboxgl = mapboxglModule.default
      
      console.log('[Atlas] 📍 Creating 3D pin marker at:', coords)
      
      // Remove existing marker if it exists
      if (userMarkerRef.current) {
        console.log('[Atlas] Removing old marker')
        userMarkerRef.current.remove()
      }
      
      // Create 3D pin element
      const el = document.createElement('div')
      el.className = 'user-location-3d-pin'
      el.style.cssText = 'width: 40px; height: 60px; cursor: pointer; position: relative;'
      el.innerHTML = `
        <div class="pin-container" style="position: relative; width: 100%; height: 100%; animation: pinDrop 0.6s ease-out;">
          <div class="pin-head" style="
            position: absolute;
            top: 0;
            left: 50%;
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #00ff9d 0%, #00d083 50%, #00a066 100%);
            border-radius: 50% 50% 50% 0;
            transform: translateX(-50%) rotate(-45deg);
            box-shadow: 0 3px 6px rgba(0, 208, 131, 0.4), inset -2px -2px 4px rgba(0, 0, 0, 0.2), inset 2px 2px 4px rgba(255, 255, 255, 0.3);
            border: 2px solid rgba(255, 255, 255, 0.9);
          ">
            <div class="pin-dot" style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(45deg);
              width: 12px;
              height: 12px;
              background: radial-gradient(circle at 30% 30%, #ffffff, #00ff9d);
              border-radius: 50%;
            "></div>
          </div>
          <div class="pin-shadow" style="
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 24px;
            height: 8px;
            background: radial-gradient(ellipse at center, rgba(0, 208, 131, 0.4) 0%, transparent 70%);
            border-radius: 50%;
          "></div>
        </div>
      `
      
      // Create marker
      userMarkerRef.current = new mapboxgl.Marker({ 
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map.current)
      
      console.log('[Atlas] ✅ 3D pin marker created and added to map!')
      
    } catch (error) {
      console.error('[Atlas] ❌ Failed to add user location marker:', error)
    }
  }, [mapLoaded])
  
  // FlyTo helper with queue support
  const flyToLocation = useCallback((coords: Coordinates, zoom: number) => {
    console.log('[Atlas] 🔧 flyToLocation called:', { coords, zoom, hasMap: !!map.current, mapLoaded })
    
    if (!map.current) {
      console.error('[Atlas] ❌ No map instance!')
      return
    }
    
    if (!mapLoaded) {
      console.log('[Atlas] ⏳ Map not loaded, queuing flyTo')
      // Queue the request until map loads
      pendingFlyToRef.current = { coords, zoom }
      return
    }
    
    console.log('[Atlas] ✈️ Executing flyTo:', coords)
    console.log('[Atlas] 🗺️ Map loaded state:', map.current.loaded())
    
    try {
      map.current.flyTo({
        center: [coords.lng, coords.lat],
        zoom,
        duration: 1500,
        essential: true,
        curve: 1.2
      })
      // Force render loop to ensure animation starts
      map.current.triggerRepaint()
      console.log('[Atlas] ✅ flyTo command sent successfully with forced render')
    } catch (error) {
      console.error('[Atlas] ❌ flyTo FAILED:', error)
    }
  }, [mapLoaded])
  
  // Execute pending flyTo when map loads
  useEffect(() => {
    if (mapLoaded && pendingFlyToRef.current) {
      const pending = pendingFlyToRef.current
      pendingFlyToRef.current = null
      flyToLocation(pending.coords, pending.zoom)
    }
  }, [mapLoaded, flyToLocation])
  
  // Handle user location updates
  // Track incoming businesses count for dependency
  const incomingBusinessesCount = incomingBusinesses?.length || 0
  
  useEffect(() => {
    console.log('[Atlas] 🔍 User location effect:', {
      mapLoaded,
      hasUserLocation: !!userLocation,
      userLocation,
      locationStatus,
      incomingBusinessesCount
    })
    
    if (!mapLoaded || !userLocation) return
    
    // Add user marker
    addUserLocationMarker(userLocation)
    
    // ✅ CRITICAL: Don't fly to user location if businesses exist - let business flyTo take priority
    if (incomingBusinessesCount > 0) {
      console.log('[Atlas] ⏭️ Skipping user location flyTo (businesses are displayed)')
      return
    }
    
    // Always fly to user location when granted (shows permission was acknowledged)
    // Calculate distance to determine animation style
    const distanceFromCenter = Math.sqrt(
      Math.pow(userLocation.lat - center.lat, 2) + 
      Math.pow(userLocation.lng - center.lng, 2)
    )
    
    console.log('[Atlas] Distance from center:', distanceFromCenter)
    
    // If far from center (>0.01 degrees ~1km), do full flyTo
    if (distanceFromCenter > 0.01) {
      console.log('[Atlas] Flying to user location (far from center)')
      flyToLocation(userLocation, 14)
    } else {
      // If already near center, do subtle "acknowledge" animation
      if (map.current) {
        console.log('[Atlas] Easing to user location (near center)')
        map.current.easeTo({
          center: [userLocation.lng, userLocation.lat],
          zoom: Math.max(map.current.getZoom(), 14),
          duration: 900,
          essential: true
        })
        // Force render loop
        map.current.triggerRepaint()
      }
    }
  }, [mapLoaded, userLocation, center, addUserLocationMarker, flyToLocation, locationStatus, incomingBusinessesCount])
  
  // Clear markers helper
  const clearMarkers = useCallback(() => {
    if (!map.current) return
    
    // 🚨 REMOVED: Pulse animation cleanup (no longer used)
    // if (activePulseAnimation.current !== null) {
    //   cancelAnimationFrame(activePulseAnimation.current)
    //   activePulseAnimation.current = null
    // }
    
    // Clear business layers (including clusters)
    const businessLayerIds = [
      'business-pins-glow', 
      'business-pins',
      // 'business-pins-arrival-pulse', // 🚨 Removed - layer no longer added
      'business-clusters',
      'business-cluster-count'
    ]
    businessLayerIds.forEach(id => {
      if (map.current!.getLayer(id)) {
        map.current!.removeLayer(id)
      }
    })
    if (map.current.getSource('businesses')) {
      map.current.removeSource('businesses')
    }
    
    // Clear active business layers
    const activeLayerIds = ['active-business-pulse', 'active-business-pin']
    activeLayerIds.forEach(id => {
      if (map.current!.getLayer(id)) {
        map.current!.removeLayer(id)
      }
    })
    if (map.current.getSource('active-business')) {
      map.current.removeSource('active-business')
    }
    
    // Clear route layers
    const routeLayerIds = ['route-glow', 'route-line']
    routeLayerIds.forEach(id => {
      if (map.current!.getLayer(id)) {
        map.current!.removeLayer(id)
      }
    })
    if (map.current.getSource('route')) {
      map.current.removeSource('route')
    }
  }, [])
  
  // Add route line from user to active business
  const addRouteLineToActive = useCallback(async (activeBusiness: Business) => {
    if (!map.current || !mapLoaded || !userLocation) return
    
    try {
      // Remove existing route
      const routeLayerIds = ['route-glow', 'route-line']
      routeLayerIds.forEach(id => {
        if (map.current!.getLayer(id)) {
          map.current!.removeLayer(id)
        }
      })
      if (map.current.getSource('route')) {
        map.current.removeSource('route')
      }
      
      // ✨ Generate smooth curved arc route (cinematic, not straight)
      const curvedCoordinates = buildArcRoute(
        userLocation.lng,
        userLocation.lat,
        activeBusiness.longitude,
        activeBusiness.latitude,
        40 // 40 points for smooth curve
      )
      
      // Add route source with curved arc
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: curvedCoordinates
            }
          }]
        },
        // ✨ Enable line metrics for animated gradient
        lineMetrics: true
      })
      
      // Add route layers (glow + line) BELOW all markers
      const routeLayers = getRouteLayers()
      const beforeLayer = map.current.getLayer('business-pins-glow') ? 'business-pins-glow' : undefined
      
      routeLayers.forEach(layer => {
        map.current!.addLayer(layer, beforeLayer)
      })
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Atlas] Route line drawn to active business')
      }
    } catch (error) {
      console.error('[Atlas] Failed to add route line:', error)
    }
  }, [mapLoaded, userLocation])
  
  // Update active business marker
  const updateActiveBusinessMarker = useCallback(async (business: Business) => {
    if (!map.current || !mapLoaded) return
    
    try {
      // Remove existing active business layers
      const activeLayerIds = ['active-business-pulse', 'active-business-pin']
      activeLayerIds.forEach(id => {
        if (map.current!.getLayer(id)) {
          map.current!.removeLayer(id)
        }
      })
      if (map.current.getSource('active-business')) {
        map.current.removeSource('active-business')
      }
      
      // Add active business source
      map.current.addSource('active-business', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {
              id: business.id,
              name: business.business_name
            },
            geometry: {
              type: 'Point',
              coordinates: [business.longitude, business.latitude]
            }
          }]
        }
      })
      
      // Add active business layers (bigger, brighter) - but still below user location
      const activeLayers = getActiveBusinessLayers()
      const beforeLayer = map.current.getLayer('user-location-outer-glow') ? 'user-location-outer-glow' : undefined
      
      activeLayers.forEach(layer => {
        map.current!.addLayer(layer, beforeLayer)
      })
      
      // Draw route line if user location available
      if (userLocation) {
        await addRouteLineToActive(business)
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Atlas] Active business marker updated:', business.business_name)
      }
    } catch (error) {
      console.error('[Atlas] Failed to update active business:', error)
    }
  }, [mapLoaded, userLocation, addRouteLineToActive])
  
  // Arrival ping animation (pulse effect)
  const triggerArrivalPing = useCallback(async (business: Business) => {
    if (!map.current || !mapLoaded) return
    
    try {
      // Briefly intensify the active business pulse
      // For now just log (can add visual effect later)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Atlas] 🎯 Arrival ping at:', business.business_name)
      }
    } catch (error) {
      console.error('[Atlas] Failed to trigger arrival ping:', error)
    }
  }, [mapLoaded])
  
  // 🚨 REMOVED: Arrival pulse animation
  // Mapbox doesn't support feature-state in layer filters, causing errors
  // TODO: Re-implement with a separate GeoJSON source if needed
  
  // const activePulseAnimation = useRef<number | null>(null)
  // const triggerPinPulse = useCallback((businessId: string) => { ... }, [mapLoaded])
  
  // Fly to business with smooth animation + arrival ping
  const flyToBusiness = useCallback((business: Business) => {
    if (!map.current) return
    
    // Throttle move sound (max once per 8s)
    const now = Date.now()
    if (now - lastMoveTime.current > 8000) {
      playSound(audioMoveRef.current)
      lastMoveTime.current = now
    }
    
    // Update active business marker immediately
    updateActiveBusinessMarker(business)
    
    // 🚨 REMOVED: Pulse animation (Mapbox limitation)
    // const onMoveEnd = () => {
    //   triggerPinPulse(business.id)
    //   map.current?.off('moveend', onMoveEnd)
    // }
    // map.current.once('moveend', onMoveEnd)
    
    map.current.flyTo({
      center: [business.longitude, business.latitude],
      zoom: 16,
      pitch: 60,
      bearing: 0,
      duration: 2000,
      essential: true,
      curve: 1.42 // More curved trajectory
    })
    // Force render loop to ensure animation starts
    map.current.triggerRepaint()
    
    // Play arrive sound and trigger "arrival ping" animation at end
    setTimeout(() => {
      playSound(audioArriveRef.current)
      // Arrival ping animation (flash the pulse layer)
      triggerArrivalPing(business)
    }, 2000)
    
  }, [playSound, updateActiveBusinessMarker, triggerArrivalPing]) // 🚨 Removed triggerPinPulse
  
  // 🎬 TOUR MODE: Generate HUD message for a business
  const generateBusinessHudMessage = useCallback((business: Business): string => {
    const parts: string[] = []
    
    // Name and rating (NO MARKDOWN - plain text only)
    parts.push(`${business.business_name} — ${business.rating}★`)
    
    // Category
    if (business.display_category) {
      parts.push(business.display_category)
    }
    
    // ✅ LEGAL COMPLIANCE: Show only numeric rating, not review text
    if (business.rating) {
      parts.push(`${business.rating}★ on Google`)
    }
    
    return parts.join(' • ')
  }, [])
  
  // 🎬 TOUR MODE: Start automated tour through search results
  const startTour = useCallback((businessesToTour?: Business[]) => {
    // Use passed businesses or fallback to ref (never state, as it may not be updated yet)
    const tourBusinesses = businessesToTour || businessesRef.current
    
    if (tourBusinesses.length === 0) {
      console.log('🎬 Cannot start tour - no businesses')
      return
    }
    
    console.log(`🎬 Starting tour of ${tourBusinesses.length} businesses`)
    
    setTourActive(true)
    setSelectedBusinessIndex(0)
    setSelectedBusiness(tourBusinesses[0])
    
    // ✨ Tour intro message (brief, then show first stop)
    const tourIntro = `Starting your tour of ${tourBusinesses.length} ${tourBusinesses.length === 1 ? 'place' : 'places'}...`
    setHudSummary(tourIntro)
    setHudPrimaryBusinessName(null)
    setHudVisible(true)
    
    // Fly to first business
    flyToBusiness(tourBusinesses[0])
    updateActiveBusinessMarker(tourBusinesses[0])
    
    // After intro delay, show first business info
    setTimeout(() => {
      const firstBusiness = tourBusinesses[0]
      const reviewCount = firstBusiness.review_count || 0
      const firstStopMessage = `Stop 1 of ${tourBusinesses.length} • Rated ${firstBusiness.rating}★ by ${reviewCount} ${reviewCount === 1 ? 'person' : 'people'} on Google`
      setHudSummary(firstStopMessage)
    }, 1500) // Show intro for 1.5s, then first stop info
    
    // Start timer for second business
    if (tourBusinesses.length > 1) {
      tourTimerRef.current = setTimeout(() => {
        advanceTour(1) // Move to index 1 (second business)
      }, 4500) // 1.5s intro + 3s for first business = 4.5s total
    } else {
      // Single business tour - end after showing its info
      setTimeout(() => {
        setTourActive(false)
        setHudVisible(false)
      }, 4500)
    }
  }, [flyToBusiness, updateActiveBusinessMarker])
  
  // 🎬 TOUR MODE: Advance to specific index
  const advanceTour = useCallback((targetIndex: number) => {
    // ✅ Use ref instead of state to avoid stale closure issues
    const currentBusinesses = businessesRef.current
    
    if (targetIndex >= currentBusinesses.length) {
      // Tour complete
      console.log('🎬 Tour complete!')
      setTourActive(false)
      setHudVisible(false) // Hide HUD when tour ends
      return
    }
    
    console.log(`🎬 Tour advancing to business ${targetIndex + 1}/${currentBusinesses.length}`)
    
    const targetBusiness = currentBusinesses[targetIndex]
    
    // Move to target business
    setSelectedBusinessIndex(targetIndex)
    setSelectedBusiness(targetBusiness)
    flyToBusiness(targetBusiness)
    updateActiveBusinessMarker(targetBusiness)
    
    // ✨ Update HUD with stop info (no business name - it's in the bottom card)
    const stopNumber = targetIndex + 1
    const totalStops = currentBusinesses.length
    const reviewCount = targetBusiness.review_count || 0
    const hudMessage = `Stop ${stopNumber} of ${totalStops} • Rated ${targetBusiness.rating}★ by ${reviewCount} ${reviewCount === 1 ? 'person' : 'people'} on Google`
    
    setHudSummary(hudMessage)
    setHudPrimaryBusinessName(null)
    setHudVisible(true)
    
    // Schedule next advance if not at end
    if (targetIndex < currentBusinesses.length - 1) {
      tourTimerRef.current = setTimeout(() => {
        advanceTour(targetIndex + 1)
      }, 3000)
    } else {
      // End of tour
      setTourActive(false)
      // Keep HUD visible for a bit longer at the end
      setTimeout(() => {
        setHudVisible(false)
      }, 4000)
    }
  }, [flyToBusiness, updateActiveBusinessMarker, generateBusinessHudMessage])
  
  // 🎬 TOUR MODE: Stop tour
  const stopTour = useCallback(() => {
    if (tourTimerRef.current) {
      clearTimeout(tourTimerRef.current)
      tourTimerRef.current = null
    }
    setTourActive(false)
    console.log('🎬 Tour stopped')
  }, [])
  
  // ⬅️➡️ MANUAL NAVIGATION: Go to next/previous business
  const goToNextBusiness = useCallback(() => {
    if (businesses.length === 0) return
    
    // Stop tour if active
    if (tourActive) {
      stopTour()
    }
    
    const nextIndex = (selectedBusinessIndex + 1) % businesses.length
    const nextBusiness = businesses[nextIndex]
    
    setSelectedBusinessIndex(nextIndex)
    setSelectedBusiness(nextBusiness)
    flyToBusiness(nextBusiness)
    updateActiveBusinessMarker(nextBusiness)
    
    // ✅ UPDATE HUD with new business info
    setHudSummary(generateBusinessHudMessage(nextBusiness))
    setHudPrimaryBusinessName(null)
    setHudVisible(true)
    
    console.log(`⏭️ Next business: ${nextBusiness.business_name} (${nextIndex + 1}/${businesses.length})`)
  }, [businesses, selectedBusinessIndex, tourActive, stopTour, flyToBusiness, updateActiveBusinessMarker, generateBusinessHudMessage])
  
  const goToPreviousBusiness = useCallback(() => {
    if (businesses.length === 0) return
    
    // Stop tour if active
    if (tourActive) {
      stopTour()
    }
    
    const prevIndex = selectedBusinessIndex === 0 ? businesses.length - 1 : selectedBusinessIndex - 1
    const prevBusiness = businesses[prevIndex]
    
    setSelectedBusinessIndex(prevIndex)
    setSelectedBusiness(prevBusiness)
    flyToBusiness(prevBusiness)
    updateActiveBusinessMarker(prevBusiness)
    
    // ✅ UPDATE HUD with new business info
    setHudSummary(generateBusinessHudMessage(prevBusiness))
    setHudPrimaryBusinessName(null)
    setHudVisible(true)
    
    console.log(`⏮️ Previous business: ${prevBusiness.business_name} (${prevIndex + 1}/${businesses.length})`)
  }, [businesses, selectedBusinessIndex, tourActive, stopTour, flyToBusiness, updateActiveBusinessMarker, generateBusinessHudMessage])
  
  // Cleanup tour timer on unmount
  useEffect(() => {
    return () => {
      if (tourTimerRef.current) {
        clearTimeout(tourTimerRef.current)
      }
    }
  }, [])
  
  // Add markers for businesses (NEON CYAN PINS) - but keep user marker on top
  const addBusinessMarkers = useCallback(async (businesses: Business[]) => {
    console.log('[Atlas] 📍 addBusinessMarkers called with', businesses.length, 'businesses')
    
    if (!map.current) {
      console.error('[Atlas] ❌ No map instance!')
      return
    }
    
    if (!mapLoaded) {
      console.error('[Atlas] ❌ Map not loaded!')
      return
    }
    
    // ✅ CRITICAL: Map MUST be fully loaded before adding layers
    if (!map.current.loaded()) {
      console.warn('[Atlas] ⏳ Map not fully loaded, waiting for idle event...')
      map.current.once('idle', () => {
        console.log('[Atlas] ✅ Map idle, retrying addBusinessMarkers...')
        addBusinessMarkers(businesses)
      })
      return
    }
    
    try {
      const mapboxglModule = await import('mapbox-gl')
      const mapboxgl = mapboxglModule.default
      
      // ⚠️ DOUBLE CHECK: Style must be loaded before accessing getStyle()
      if (!map.current.getStyle()) {
        console.warn('[Atlas] ⏳ Style not ready yet, waiting...')
        setTimeout(() => addBusinessMarkers(businesses), 100)
        return
      }
      
      console.log('[Atlas] ✅ Mapbox GL loaded, adding', businesses.length, 'pins')
      console.log('[Atlas] 🗺️ Existing sources:', Object.keys(map.current.getStyle().sources))
      console.log('[Atlas] 🗺️ Existing layers:', map.current.getStyle().layers.map(l => l.id))
      
      // 🎨 CREATE PULSING DOT IMAGES (animated pins)
      // Cyan pulsing dot for paid businesses
      if (!map.current.hasImage('pulsing-dot-cyan')) {
        const size = 60
        const pulsingDotCyan = {
          width: size,
          height: size,
          data: new Uint8Array(size * size * 4),
          context: null as any,
          
          onAdd: function() {
            const canvas = document.createElement('canvas')
            canvas.width = this.width
            canvas.height = this.height
            this.context = canvas.getContext('2d')
          },
          
          render: function() {
            const duration = 2000 // 2 second pulse
            const t = (performance.now() % duration) / duration
            
            const radius = (size / 2) * 0.4
            const outerRadius = (size / 2) * 0.9 * t + radius
            const context = this.context
            
            // Draw outer pulsing circle
            context.clearRect(0, 0, this.width, this.height)
            context.beginPath()
            context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2)
            context.fillStyle = `rgba(0, 240, 255, ${0.4 * (1 - t)})` // 🎨 NEON_CYAN glow (#00f0ff)
            context.fill()
            
            // Draw inner circle
            context.beginPath()
            context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2)
            context.fillStyle = 'rgba(0, 240, 255, 1)' // 🎨 NEON_CYAN solid (#00f0ff)
            context.strokeStyle = 'white'
            context.lineWidth = 3 + 4 * (1 - t)
            context.fill()
            context.stroke()
            
            this.data = context.getImageData(0, 0, this.width, this.height).data
            map.current!.triggerRepaint()
            return true
          }
        }
        map.current.addImage('pulsing-dot-cyan', pulsingDotCyan, { pixelRatio: 2 })
        console.log('[Atlas] ✅ Added pulsing cyan dot image')
      }
      
      // Grey pulsing dot for unclaimed businesses (slower, subtler)
      if (!map.current.hasImage('pulsing-dot-grey')) {
        const size = 50
        const pulsingDotGrey = {
          width: size,
          height: size,
          data: new Uint8Array(size * size * 4),
          context: null as any,
          
          onAdd: function() {
            const canvas = document.createElement('canvas')
            canvas.width = this.width
            canvas.height = this.height
            this.context = canvas.getContext('2d')
          },
          
          render: function() {
            const duration = 3000 // 3 second pulse (slower)
            const t = (performance.now() % duration) / duration
            
            const radius = (size / 2) * 0.35
            const outerRadius = (size / 2) * 0.7 * t + radius
            const context = this.context
            
            // Draw outer pulsing circle
            context.clearRect(0, 0, this.width, this.height)
            context.beginPath()
            context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2)
            context.fillStyle = `rgba(156, 163, 175, ${0.2 * (1 - t)})` // Grey glow
            context.fill()
            
            // Draw inner circle
            context.beginPath()
            context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2)
            context.fillStyle = 'rgba(107, 114, 128, 1)' // Solid grey
            context.strokeStyle = 'rgba(255, 255, 255, 0.5)'
            context.lineWidth = 2 + 2 * (1 - t)
            context.fill()
            context.stroke()
            
            this.data = context.getImageData(0, 0, this.width, this.height).data
            map.current!.triggerRepaint()
            return true
          }
        }
        map.current.addImage('pulsing-dot-grey', pulsingDotGrey, { pixelRatio: 2 })
        console.log('[Atlas] ✅ Added pulsing grey dot image')
      }
      
      // Update ref for event handlers
      businessesRef.current = businesses
      
      // ✅ CRITICAL: Check if layers already exist with same data - if so, skip removal/re-add
      // This prevents Fast Refresh from destroying working layers
      const existingSource = map.current.getSource('businesses')
      if (existingSource && map.current.getLayer('business-pins')) {
        console.log('[Atlas] ✅ Layers already exist, skipping re-add')
        return
      }
      
      // Remove existing business layers only if they exist (preserve user location!)
      const layerIds = [
        'business-pins', 
        'business-pins-arrival-pulse',
        'business-clusters',
        'business-cluster-count'
      ]
      layerIds.forEach(id => {
        if (map.current!.getLayer(id)) {
          console.log('[Atlas] 🗑️ Removing old layer:', id)
          map.current!.removeLayer(id)
        }
      })
      // Also remove old glow layer if it exists from previous version
      if (map.current.getLayer('business-pins-glow')) {
        map.current.removeLayer('business-pins-glow')
      }
      if (map.current.getSource('businesses')) {
        console.log('[Atlas] 🗑️ Removing old source: businesses')
        map.current.removeSource('businesses')
      }
      
      // Create GeoJSON features
      const features = businesses.map(business => {
        // Determine pin styling based on simplified tier from chat
        // mapPins use: 'paid' | 'unclaimed' | 'claimed_free'
        const tier = business.business_tier || 'unclaimed'
        const isPaid = tier === 'paid'
        const isUnclaimed = tier === 'unclaimed'
        
        return {
          type: 'Feature' as const,
          id: business.id, // ✨ Top-level id required for feature-state
          properties: {
            id: business.id,
            name: business.business_name,
            rating: business.rating,
            category: business.display_category || 'Business',
            isPaid: business.isPaid !== undefined ? business.isPaid : isPaid,
            isUnclaimed: business.isUnclaimed !== undefined ? business.isUnclaimed : isUnclaimed
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [business.longitude, business.latitude]
          }
        }
      })
      
      // 📊 Count pins by tier for dev visibility
      const paidCount = features.filter(f => f.properties.isPaid).length
      const unclaimedCount = features.filter(f => f.properties.isUnclaimed).length
      const claimedFreeCount = features.length - paidCount - unclaimedCount
      
      // Add source
      console.log('[Atlas] 🔧 About to add source "businesses" with', features.length, 'features')
      console.log(`[Atlas] 📊 Pin tier breakdown: ${paidCount} paid (cyan), ${claimedFreeCount} claimed-free, ${unclaimedCount} unclaimed (grey)`)
      try {
        map.current.addSource('businesses', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features
          },
          // ✨ Enable clustering for density handling
          cluster: true,
          clusterRadius: 45, // Pixel radius for clustering
          clusterMaxZoom: 15 // Max zoom to cluster points (dissolve above this)
        })
        console.log('[Atlas] ✅ Source "businesses" added successfully with clustering enabled')
      } catch (sourceError) {
        console.error('[Atlas] ❌ FAILED to add source:', sourceError)
        throw sourceError
      }
      
      // Add neon business pin layers (these go BELOW user location layers)
      const pinLayers = getBusinessPinLayers()
      console.log('[Atlas] 🔧 About to add', pinLayers.length, 'layers')
      
      // ✅ CRITICAL FIX: Always add business pins ON TOP of all base layers
      // Find the LAST base map layer (usually something like 'road-label' or 'poi-label')
      // or just add without beforeLayer to force them to the top
      const allLayers = map.current.getStyle().layers
      const beforeLayer = allLayers.find(l => l.id === 'user-location-outer-glow')?.id // Only go below user location if it exists
      
      console.log('[Atlas] 🔧 beforeLayer:', beforeLayer || 'NONE (will add to top)')
      
      pinLayers.forEach((layer, index) => {
        try {
          console.log(`[Atlas] 🔧 Adding layer ${index + 1}/${pinLayers.length}:`, layer.id)
          // Don't pass beforeLayer if it's undefined - this forces layers to the TOP
          if (beforeLayer) {
            map.current!.addLayer(layer, beforeLayer)
          } else {
            map.current!.addLayer(layer) // Add to the very top of the stack
          }
          console.log(`[Atlas] ✅ Layer "${layer.id}" added at position:`, map.current!.getStyle().layers.findIndex(l => l.id === layer.id))
        } catch (layerError) {
          console.error(`[Atlas] ❌ FAILED to add layer "${layer.id}":`, layerError)
          throw layerError
        }
      })
      
      // 🚨 REMOVED: Arrival pulse layer (Mapbox doesn't support feature-state in filters)
      // try {
      //   const pulseLayer = getArrivalPulseLayer()
      //   map.current.addLayer(pulseLayer, beforeLayer)
      //   console.log('[Atlas] ✅ Arrival pulse layer added')
      // } catch (pulseError) {
      //   console.error('[Atlas] ❌ Failed to add pulse layer:', pulseError)
      // }
      
      // ✨ Add cluster layers (for dense areas)
      try {
        const clusterLayers = getClusterLayers()
        clusterLayers.forEach(layer => {
          if (beforeLayer) {
            map.current!.addLayer(layer, beforeLayer)
          } else {
            map.current!.addLayer(layer)
          }
        })
        console.log('[Atlas] ✅ Cluster layers added (circle + count)')
      } catch (clusterError) {
        console.error('[Atlas] ❌ Failed to add cluster layers:', clusterError)
      }
      
      // Attach event handlers ONCE only (or re-attach if layer was recreated)
      if (!businessHandlersAttachedRef.current && map.current.getLayer('business-pins')) {
        // Define handlers that read from refs
        const handleClick = (e: any) => {
          if (!e.features || e.features.length === 0) return
          
          const feature = e.features[0]
          const businessId = feature.properties?.id
          const business = businessesRef.current.find(b => b.id === businessId)
          
          if (business) {
            // Stop any active tour
            if (tourActive) {
              stopTour()
            }
            
            // Update selected business
            const businessIndex = businessesRef.current.findIndex(b => b.id === businessId)
            setSelectedBusiness(business)
            setSelectedBusinessIndex(businessIndex)
            updateActiveBusinessMarker(business)
            flyToBusiness(business)
            
            // Update HUD with business info
            setHudSummary(generateBusinessHudMessage(business))
            setHudPrimaryBusinessName(null)
            setHudVisible(true)
          }
        }
        
        const handleMouseEnter = () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer'
        }
        
        const handleMouseLeave = () => {
          if (map.current) map.current.getCanvas().style.cursor = ''
        }
        
        // Remove any existing handlers (safe for re-attachment)
        map.current.off('click', 'business-pins', handleClick)
        map.current.off('mouseenter', 'business-pins', handleMouseEnter)
        map.current.off('mouseleave', 'business-pins', handleMouseLeave)
        
        // Attach fresh handlers
        map.current.on('click', 'business-pins', handleClick)
        map.current.on('mouseenter', 'business-pins', handleMouseEnter)
        map.current.on('mouseleave', 'business-pins', handleMouseLeave)
        
        // ✨ Cluster handlers - zoom into cluster on click
        const handleClusterClick = (e: any) => {
          if (!e.features || e.features.length === 0 || !map.current) return
          
          const feature = e.features[0]
          const clusterId = feature.properties.cluster_id
          const source = map.current.getSource('businesses') as mapboxgl.GeoJSONSource
          
          if (source && source.getClusterExpansionZoom) {
            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err || !map.current || zoom === null || zoom === undefined) return
              
              map.current.easeTo({
                center: feature.geometry.coordinates,
                zoom: zoom + 0.5, // Slight extra zoom for better reveal
                duration: 800
              })
            })
          }
        }
        
        const handleClusterMouseEnter = () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer'
        }
        
        const handleClusterMouseLeave = () => {
          if (map.current) map.current.getCanvas().style.cursor = ''
        }
        
        // Remove any existing cluster handlers
        map.current.off('click', 'business-clusters', handleClusterClick)
        map.current.off('mouseenter', 'business-clusters', handleClusterMouseEnter)
        map.current.off('mouseleave', 'business-clusters', handleClusterMouseLeave)
        
        // Attach cluster handlers
        map.current.on('click', 'business-clusters', handleClusterClick)
        map.current.on('mouseenter', 'business-clusters', handleClusterMouseEnter)
        map.current.on('mouseleave', 'business-clusters', handleClusterMouseLeave)
        
        businessHandlersAttachedRef.current = true
      }
      
      console.log('[Atlas] ✅ Neon business pins added with clustering:', businesses.length, '(user marker stays on top)')
      console.log('[Atlas] 📊 Pin details:', businesses.map(b => ({ 
        name: b.business_name, 
        lat: b.latitude, 
        lng: b.longitude,
        isPaid: b.isPaid,
        isUnclaimed: b.isUnclaimed
      })))
      
      // ✅ FORCE a repaint after adding layers
      map.current.triggerRepaint()
      console.log('[Atlas] ✅ Forced map repaint')
      
    } catch (error) {
      console.error('[Atlas] ❌ Failed to add markers:', error)
    }
  }, [mapLoaded, updateActiveBusinessMarker, flyToBusiness, tourActive, stopTour, generateBusinessHudMessage, playSound])
  
  // ✅ RULE #3: Handle incoming businesses from chat (separate effect, waits for mapReady)
  useEffect(() => {
    console.log('[Atlas] 🔍 Business effect triggered:', { 
      mapLoaded, 
      hasIncoming: !!incomingBusinesses, 
      incomingCount: incomingBusinesses?.length || 0 
    })
    
    if (!mapLoaded) {
      console.log('[Atlas] ⏳ Map not loaded yet, waiting...')
      return
    }
    
    if (!incomingBusinesses || incomingBusinesses.length === 0) {
      console.log('[Atlas] ⚠️ No incoming businesses')
      return
    }
    
    // ✅ PREVENT LOOP: Check if we've already processed this exact set of businesses
    const businessKey = incomingBusinesses.map(b => b.id).sort().join(',')
    if (processedIncomingBusinessesRef.current === businessKey) {
      console.log('[Atlas] ⏭️ Already processed these businesses, skipping')
      return
    }
    processedIncomingBusinessesRef.current = businessKey
    
    console.log('[Atlas] 🎯 Received businesses from chat:', incomingBusinesses.length, incomingBusinesses)
    
    // ✅ CRITICAL: Update ref FIRST before any effects run
    businessesRef.current = incomingBusinesses
    
    // Update local state
    setBusinesses(incomingBusinesses)
    
    // Add pins to map
    console.log('[Atlas] 📍 Calling addBusinessMarkers...')
    addBusinessMarkers(incomingBusinesses)
    
    // Fly to first business
    if (incomingBusinesses.length > 0 && map.current) {
      const first = incomingBusinesses[0]
      console.log('[Atlas] 🚀 Flying to first business:', first.business_name, { lat: first.latitude, lng: first.longitude })
      console.log('[Atlas] 🗺️ Map loaded state:', map.current.loaded())
      console.log('[Atlas] 🗺️ Current center:', map.current.getCenter())
      console.log('[Atlas] 🗺️ Current zoom:', map.current.getZoom())
      
      // Helper function to start tour after flying to business
      const startTourIfMultiple = () => {
        // Select first business as active
        setSelectedBusiness(first)
        setSelectedBusinessIndex(0)
        updateActiveBusinessMarker(first)
        
        // 🎬 AUTO-START TOUR: If multiple businesses from chat, start tour after a delay
        // ✅ PREVENT LOOP: Don't schedule if tour already active or timeout already set
        if (incomingBusinesses.length > 1 && !tourActive && !tourTimerRef.current) {
          console.log(`[Atlas] 🎬 Will auto-start tour in 2s (${incomingBusinesses.length} businesses from chat)`)
          const tourTimeout = setTimeout(() => {
            console.log('[Atlas] 🎬 Tour timeout fired! Calling startTour...')
            startTour(incomingBusinesses) // Pass businesses explicitly
          }, 2000) // Start tour 2s after arriving from chat
          
          // Store timeout for cleanup
          tourTimerRef.current = tourTimeout
        } else if (tourActive || tourTimerRef.current) {
          console.log('[Atlas] ⏭️ Skipping tour schedule - already active or scheduled')
        }
      }
      
      // ✅ CRITICAL: Wait for map to be truly loaded before moving
      if (!map.current.loaded()) {
        console.warn('[Atlas] ⏳ Map not fully loaded yet, waiting for idle...')
        map.current.once('idle', () => {
          console.log('[Atlas] ✅ Map idle, retrying jumpTo...')
          if (map.current && map.current.loaded()) {
            map.current.jumpTo({
              center: [first.longitude, first.latitude],
              zoom: 14
            })
            // Force render loop
            map.current.resize()
            map.current.triggerRepaint()
            map.current.fire('move')
            map.current.fire('moveend')
            console.log('[Atlas] ✅ jumpTo executed after idle with forced render')
            
            // ✅ START TOUR (idle branch)
            startTourIfMultiple()
          }
        })
        return
      }
      
      try {
        // ✅ NUCLEAR OPTION: Use jumpTo (instant) instead of flyTo (animated)
        // This bypasses any animation issues
        map.current.jumpTo({
          center: [first.longitude, first.latitude],
          zoom: 14
        })
        console.log('[Atlas] ✅ jumpTo command sent (instant teleport)')
        
        // ✅ CRITICAL FIX: Force render loop to update visual
        // jumpTo updates internal state but doesn't always trigger repaint
        map.current.resize()
        map.current.triggerRepaint()
        // Fire move events to wake up render loop
        map.current.fire('move')
        map.current.fire('moveend')
        console.log('[Atlas] ✅ Forced render loop and events')
      } catch (error) {
        console.error('[Atlas] ❌ jumpTo FAILED:', error)
      }
      
      // ✅ START TOUR (main branch)
      startTourIfMultiple()
    }
  }, [mapLoaded, incomingBusinesses, addBusinessMarkers, updateActiveBusinessMarker, startTour])
  
  // Recenter to user location (BULLETPROOF - stop + resize + flyTo)
  const handleRecenterToUser = useCallback(() => {
    console.log('[Atlas] 🔘 RECENTER BUTTON CLICKED')
    console.log('[Atlas] userLocation:', userLocation)
    console.log('[Atlas] map.current:', !!map.current)
    console.log('[Atlas] locationStatus:', locationStatus)
    
    if (!userLocation || !map.current) {
      console.warn('[Atlas] ❌ Cannot recenter: no location or map')
      alert(`Cannot recenter:\n- Has location: ${!!userLocation}\n- Has map: ${!!map.current}\n- Status: ${locationStatus}`)
      return
    }
    
    const target = [userLocation.lng, userLocation.lat] as [number, number]
    
    if (process.env.NODE_ENV === 'development') {
      const currentCenter = map.current.getCenter()
      const canvas = map.current.getCanvas()
      const isStyleLoaded = map.current.isStyleLoaded()
      
      console.log('[Atlas] 🎯 RECENTER DEBUG:')
      console.log('  Current:', currentCenter.lng.toFixed(6), currentCenter.lat.toFixed(6))
      console.log('  Target:', target[0].toFixed(6), target[1].toFixed(6))
      console.log('  Canvas size:', canvas?.width, 'x', canvas?.height)
      console.log('  Style loaded:', isStyleLoaded)
      console.log('  mapLoaded:', mapLoaded)
      console.log('  Container match:', map.current.getContainer() === mapContainer.current)
    }
    
    // Guard: ensure map is fully ready
    if (!mapLoaded || !map.current.isStyleLoaded()) {
      console.warn('[Atlas] Cannot recenter: map not fully loaded')
      return
    }
    
    // CRITICAL: Stop any ongoing animation
    map.current.stop()
    
    // CRITICAL: Resize map (fixes Safari/iOS layout shift issues)
    map.current.resize()
    
    // Smooth fly to user location
    map.current.flyTo({
      center: target,
      zoom: 16.5,
      pitch: 0,
      bearing: 0,
      duration: 900,
      essential: true
    })
    // Force render loop
    map.current.triggerRepaint()
    
    playSound(audioMoveRef.current)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Atlas] ✅ Recenter flyTo executed with forced render')
    }
  }, [userLocation, playSound, mapLoaded])
  
  // Search handler (calls Atlas query endpoint for HUD bubble response)
  const handleSearch = useCallback(async (query: string) => {
    console.log('[Atlas Search] 🔍 Starting search for:', query)
    setSearching(true)
    setSelectedBusiness(null)
    setHudVisible(false) // Hide previous bubble
    
    // Clear any existing dismiss timer
    if (hudDismissTimerRef.current) {
      clearTimeout(hudDismissTimerRef.current)
      hudDismissTimerRef.current = null
    }
    
    try {
      // Call Atlas query endpoint (ephemeral HUD bubble response)
      console.log('[Atlas Search] 📡 Calling /api/atlas/query...')
      const response = await fetch('/api/atlas/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null
        })
      })
      
      const atlasResponse: AtlasResponse = await response.json()
      console.log('[Atlas Search] 📦 /api/atlas/query response:', atlasResponse)
      
      // Store query and business IDs for state handoff
      setLastAtlasQuery(query)
      setLastAtlasBusinessIds(atlasResponse.businessIds)
      
      if (atlasResponse.businessIds.length > 0) {
        console.log('[Atlas Search] ✅ Found', atlasResponse.businessIds.length, 'business IDs')
        
        // Fetch full business data for map markers
        const limit = performanceMode.enabled ? performanceMode.maxMarkers : config.maxResults
        console.log('[Atlas Search] 📡 Calling /api/atlas/search with limit:', limit)
        const detailsResponse = await fetch(`/api/atlas/search?q=${encodeURIComponent(query)}&limit=${limit}`)
        const detailsData = await detailsResponse.json()
        console.log('[Atlas Search] 📦 /api/atlas/search response:', detailsData)
        
        if (detailsData.ok && detailsData.results) {
          console.log('[Atlas Search] 📊 Total results from search:', detailsData.results.length)
          
          const filteredResults = detailsData.results.filter((b: Business) => 
            atlasResponse.businessIds.includes(b.id)
          )
          console.log('[Atlas Search] 📊 Filtered results (matching query IDs):', filteredResults.length)
          console.log('[Atlas Search] 📊 Filtered business names:', filteredResults.map((b: Business) => b.business_name))
          
          setBusinesses(filteredResults)
          await addBusinessMarkers(filteredResults)
          
          // Select first result as active
          if (filteredResults.length > 0) {
            setSelectedBusinessIndex(0)
            const firstBusiness = filteredResults[0]
            setSelectedBusiness(firstBusiness)
            await updateActiveBusinessMarker(firstBusiness)
            flyToBusiness(firstBusiness)
            
            // 🎬 AUTO-START TOUR: If multiple results, start tour after HUD dismisses
            if (filteredResults.length > 1) {
              console.log('[Atlas Search] 🎬 Will start tour in', atlasResponse.ui.autoDismissMs + 500, 'ms')
              setTimeout(() => {
                startTour(filteredResults) // Pass businesses explicitly
              }, atlasResponse.ui.autoDismissMs + 500) // Start tour 500ms after HUD dismisses
            }
          }
          
          // Find primary business name (if specified)
          let primaryBusinessName: string | null = null
          if (atlasResponse.primaryBusinessId) {
            const primaryBusiness = filteredResults.find((b: Business) => 
              b.id === atlasResponse.primaryBusinessId
            )
            primaryBusinessName = primaryBusiness?.business_name || null
          }
          
          // Show HUD bubble with AI response
          setHudSummary(atlasResponse.summary)
          setHudPrimaryBusinessName(primaryBusinessName)
          
          // Delay bubble appearance (120ms after map begins moving)
          setTimeout(() => {
            setHudVisible(true)
            
            // Set auto-dismiss timer
            hudDismissTimerRef.current = setTimeout(() => {
              setHudVisible(false)
            }, atlasResponse.ui.autoDismissMs)
          }, 120)
          
          // Track search performed
          trackEvent({
            eventType: 'atlas_search_performed',
            query,
            resultsCount: filteredResults.length,
            performanceMode: performanceMode.enabled
          })
        } else {
          console.error('[Atlas Search] ❌ Search API returned no results or error:', detailsData)
        }
      } else {
        console.log('[Atlas Search] ⚠️ No business IDs returned from query')
        // No results - show HUD bubble with message
        setHudSummary(atlasResponse.summary)
        setHudPrimaryBusinessName(null)
        
        setTimeout(() => {
          setHudVisible(true)
          
          hudDismissTimerRef.current = setTimeout(() => {
            setHudVisible(false)
          }, atlasResponse.ui.autoDismissMs)
        }, 120)
      }
      
    } catch (error) {
      console.error('[Atlas] Search failed:', error)
      setHudSummary('Something went wrong. Please try again.')
      setHudPrimaryBusinessName(null)
      
      setTimeout(() => {
        setHudVisible(true)
        
        hudDismissTimerRef.current = setTimeout(() => {
          setHudVisible(false)
        }, 3000)
      }, 120)
    } finally {
      setSearching(false)
    }
  }, [userLocation, addBusinessMarkers, flyToBusiness, config.maxResults, performanceMode, trackEvent])
  
  // Auto-run initial query when Atlas opens with chat context (run once only)
  // ✅ CRITICAL: SKIP this if businesses were passed from chat - we already have the data!
  useEffect(() => {
    if (!mapLoaded || !initialQuery || ranInitialQueryRef.current) return
    
    // If businesses were passed from chat, don't run a new search
    if (incomingBusinessesCount > 0) {
      console.log('[Atlas] ⏭️ Skipping initial query (businesses already provided from chat)')
      ranInitialQueryRef.current = true
      onInitialQueryConsumed?.()
      return
    }
    
    ranInitialQueryRef.current = true
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Atlas] Running initial query from chat:', initialQuery)
    }
    
    handleSearch(initialQuery)
    onInitialQueryConsumed?.()
  }, [mapLoaded, initialQuery, handleSearch, onInitialQueryConsumed, incomingBusinessesCount])
  
  // Force resize on mount to handle container sizing edge cases
  useEffect(() => {
    if (!mapLoaded || !map.current) return
    
    // Defer resize to ensure container is fully laid out
    requestAnimationFrame(() => {
      if (map.current) {
        map.current.resize()
        if (process.env.NODE_ENV === 'development') {
          const canvas = map.current.getCanvas()
          console.log('[Atlas] Map resized on mount. Canvas size:', canvas?.width, 'x', canvas?.height)
        }
      }
    })
  }, [mapLoaded])
  
  // Handle close with analytics
  const handleClose = useCallback(() => {
    // Clean up HUD dismiss timer
    if (hudDismissTimerRef.current) {
      clearTimeout(hudDismissTimerRef.current)
      hudDismissTimerRef.current = null
    }
    
    trackEvent({
      eventType: 'atlas_returned_to_chat',
      performanceMode: performanceMode.enabled
    })
    onClose()
  }, [trackEvent, performanceMode.enabled, onClose])
  
  // HUD bubble handlers
  const handleHudDismiss = useCallback(() => {
    if (hudDismissTimerRef.current) {
      clearTimeout(hudDismissTimerRef.current)
      hudDismissTimerRef.current = null
    }
    setHudVisible(false)
  }, [])
  
  const handleHudMoreDetails = useCallback(() => {
    // Pass state back to chat mode
    handleHudDismiss()
    handleClose()
    // State handoff is handled via lastAtlasQuery and lastAtlasBusinessIds
  }, [handleHudDismiss, handleClose])
  
  return (
    <>
      {/* Mapbox CSS - Must be in head */}
      <Head>
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.18.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </Head>
      
      <div className="fixed inset-0 z-50 bg-black">
        {/* Map Container - Explicit height and width for Mapbox */}
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ minHeight: '100vh' }} />
        
        {/* VIGNETTE OVERLAY - Cinematic lighting effect */}
        <div 
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.8) 100%)',
            mixBlendMode: 'multiply'
          }}
        />
        
        {/* First-Visit Intro Overlay */}
        <AtlasIntroOverlay />
      
      {/* HUD Bubble (ephemeral AI response) */}
      <AtlasHudBubble
        visible={hudVisible}
        summary={hudSummary}
        primaryBusinessName={hudPrimaryBusinessName || undefined}
        onDismiss={handleHudDismiss}
        onMoreDetails={handleHudMoreDetails}
      />
      
      {/* Overlay UI */}
      <AtlasOverlay
        onClose={handleClose}
        onSearch={handleSearch}
        searching={searching}
        selectedBusiness={selectedBusiness}
        userLocation={userLocation}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        tourActive={tourActive}
        totalBusinesses={businesses.length}
        currentBusinessIndex={selectedBusinessIndex}
        onNextBusiness={goToNextBusiness}
        onPreviousBusiness={goToPreviousBusiness}
        onStopTour={stopTour}
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
      
      {/* Chat Context Strip - Moved below search bar to avoid overlap */}
      {mapLoaded && (lastUserQuery || lastAIResponse) && (
        <ChatContextStrip
          userQuery={lastUserQuery}
          aiResponse={lastAIResponse}
        />
      )}
      
      {/* Loading State */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#00d083]/30 border-t-[#00d083] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Loading Atlas...</p>
          </div>
        </div>
      )}
      
      {/* ATLAS STATUS PILL - Bottom left */}
      {mapLoaded && (
        <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
          <div className="px-4 py-2.5 rounded-full bg-black/60 backdrop-blur-md border border-[#00d083]/30 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-[#00d083] animate-pulse" />
              <p className="text-sm font-medium text-white/90">Atlas Active</p>
              <span className="text-xs text-white/50">·</span>
              <p className="text-xs text-white/60">{city}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* MANUAL LOCATION BUTTON - Show when location is idle/denied (Safari fix) */}
      {mapLoaded && locationStatus && (locationStatus === 'idle' || locationStatus === 'denied' || locationStatus === 'unavailable') && onRequestLocation && (
        <div className="absolute bottom-24 right-6 z-10">
          <button
            onClick={onRequestLocation}
            className="px-4 py-3 rounded-full bg-[#00d083] hover:bg-[#00ff9d] transition-colors shadow-lg border border-white/20 flex items-center gap-2"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-semibold text-white">Use my location</span>
          </button>
        </div>
      )}
      
      {/* RECENTER TO USER BUTTON - Show when user location is available */}
      {mapLoaded && userLocation && (
        <div className="absolute bottom-32 right-6 z-[9999]">
          <button
            onClick={handleRecenterToUser}
            className="w-12 h-12 rounded-full bg-[#00d083] hover:bg-[#00ff9d] transition-colors shadow-lg border-2 border-white flex items-center justify-center group pointer-events-auto"
            title="Recenter to my location"
            style={{ cursor: 'pointer' }}
          >
            <svg 
              className="w-6 h-6 text-white" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
      
      {/* DEBUG: Show if userLocation exists */}
      {mapLoaded && (
        <div className="absolute top-20 left-6 z-10 bg-black/80 text-white px-3 py-2 rounded text-xs">
          Location: {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'NONE'}
        </div>
      )}
      
      {/* Location Fallback Pill - Show when viewing city center */}
      {mapLoaded && locationStatus && (locationStatus === 'denied' || locationStatus === 'unavailable') && !userLocation && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="px-4 py-2.5 rounded-full bg-slate-800/90 backdrop-blur-md border border-slate-700/50 shadow-lg">
            <p className="text-xs text-slate-300 whitespace-nowrap flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Showing {city} city center
            </p>
          </div>
        </div>
      )}
      
    </div>
  </>
  )
}
