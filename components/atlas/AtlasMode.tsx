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

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import type { Map as MapboxMap, LngLatLike, MapboxGeoJSONFeature } from 'mapbox-gl'
import Head from 'next/head'
import { AtlasOverlay } from './AtlasOverlay'
import { AtlasHudBubble } from './AtlasHudBubble'
import { ChatContextStrip } from './ChatContextStrip'
import { AtlasIntroOverlay } from './AtlasIntroOverlay'
import { AtlasVibeSetup } from './AtlasVibeSetup'
import { BottomSheet } from './BottomSheet'
import { usePerformanceMode } from '@/lib/atlas/usePerformanceMode'
import { useAtlasAnalytics } from '@/lib/atlas/useAtlasAnalytics'
import { useMobile } from '@/lib/hooks/use-mobile'
import type { Coordinates } from '@/lib/location/useUserLocation'
import type { LocationStatus } from '@/lib/location/useUserLocation'
import type { AtlasResponse } from '@/lib/ai/prompts/atlas'
import { buildBusinessFacts } from '@/lib/atlas/buildBusinessFacts'
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
  reason?: {
    type: string
    label: string
    emoji: string
  }
  reasonMeta?: {
    isOpenNow: boolean
    distanceMeters: number | null
    ratingBadge: string | null
  }
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
  city: string
  userId?: string
  lastUserQuery?: string
  lastAIResponse?: string
  onRequestLocation?: () => void  // Manual location request trigger
  onRequestDetails?: (businessId: string) => void  // ID-based detail request
  initialQuery?: string | null  // Query to run when Atlas opens (from chat CTA)
  onInitialQueryConsumed?: () => void  // Callback after initial query is consumed
  businesses?: Business[]  // ✅ NEW: Businesses from chat (avoids re-querying)
  isActive?: boolean  // Whether Atlas is the foreground view (for pausing when hidden)
  onTellMeMore?: (text: string, businessId: string) => void  // Return to chat with pre-loaded message
}

export function AtlasMode({
  config,
  center,
  userLocation,
  locationStatus,
  onClose,
  city,
  userId,
  lastUserQuery,
  lastAIResponse,
  onRequestLocation,
  onRequestDetails,
  initialQuery,
  onInitialQueryConsumed,
  businesses: incomingBusinesses,
  isActive = true,
  onTellMeMore
}: AtlasModeProps) {
  // #region agent log - server-visible debug helper
  const dlog = useCallback((tag: string, data: Record<string, unknown>) => {
    console.log(`[Atlas] ${tag}`, data)
    fetch('/api/debug/atlas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag, data }) }).catch(() => {})
  }, [])
  // #endregion
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<MapboxMap | null>(null)
  const mapReadyRef = useRef(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [searching, setSearching] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [baseBusinesses, setBaseBusinesses] = useState<Business[]>([]) // Original unfiltered list
  const [activeFilters, setActiveFilters] = useState<{
    openNow: boolean
    maxDistance: number | null
  }>({ openNow: false, maxDistance: null })
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [selectedBusinessIndex, setSelectedBusinessIndex] = useState<number>(0)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [showVibeSetup, setShowVibeSetup] = useState(false)
  const [showSearchThisArea, setShowSearchThisArea] = useState(false)
  const resultBoundsRef = useRef<{ lat: number; lng: number } | null>(null)
  const routeAnimationRef = useRef<number | null>(null)
  const [showLegend, setShowLegend] = useState(false)
  const [savedBusinessIds, setSavedBusinessIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem('qwikker_atlas_saved')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  
  // ✨ Mobile detection and bottom sheet
  const isMobile = useMobile()
  const [showMobileSheet, setShowMobileSheet] = useState(false)
  
  // ✨ Tour-end decision helper
  const [showTourEndHelper, setShowTourEndHelper] = useState(false)
  
  // Tour mode state
  const [tourActive, setTourActive] = useState(false)
  const tourTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Track if event handlers are attached (prevent duplicates)
  const businessHandlersAttachedRef = useRef(false)
  const businessesRef = useRef<Business[]>([])
  const processedIncomingBusinessesRef = useRef<string | null>(null) // Track if we've processed this batch
  
  // ✅ MVP-CRITICAL: Stable event handler refs (prevent handler stacking)
  const onPinClickRef = useRef<((e: any) => void) | undefined>(undefined)
  const onPinEnterRef = useRef<(() => void) | undefined>(undefined)
  const onPinLeaveRef = useRef<(() => void) | undefined>(undefined)
  const onClusterClickRef = useRef<((e: any) => void) | undefined>(undefined)
  const onClusterEnterRef = useRef<(() => void) | undefined>(undefined)
  const onClusterLeaveRef = useRef<(() => void) | undefined>(undefined)
  
  // HUD bubble state
  const [hudVisible, setHudVisible] = useState(false)
  const [hudSummary, setHudSummary] = useState('')
  const [hudPrimaryBusinessName, setHudPrimaryBusinessName] = useState<string | null>(null)
  const hudDismissTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [lastAtlasQuery, setLastAtlasQuery] = useState<string | null>(null)
  const [lastAtlasBusinessIds, setLastAtlasBusinessIds] = useState<string[]>([])
  const ranInitialQueryRef = useRef(false)
  const [emptyStateDismissed, setEmptyStateDismissed] = useState(false)
  
  // Performance mode detection
  const performanceMode = usePerformanceMode()
  
  // Analytics tracking (city derived server-side from hostname)
  const { trackEvent } = useAtlasAnalytics(userId)
  
  // Hydrated business data (enriched fields fetched in background)
  const hydratedDataRef = useRef<Map<string, any>>(new Map())
  const hydrationRequestedRef = useRef<Set<string>>(new Set())
  
  // Helper: Apply filters to business list (must be defined BEFORE visibleBusinesses)
  const applyFilters = useCallback((
    businessList: Business[],
    filters: typeof activeFilters,
    userLoc: Coordinates | null
  ): Business[] => {
    let filtered = [...businessList]
    
    // Filter by open now
    if (filters.openNow) {
      filtered = filtered.filter(b => 
        b.reasonMeta?.isOpenNow === true
      )
    }
    
    // Filter by distance
    if (filters.maxDistance !== null && userLoc) {
      filtered = filtered
        .map(b => {
          if (!b.latitude || !b.longitude) return { ...b, distance: Infinity }
          
          const R = 6371e3 // Earth radius in meters
          const φ1 = userLoc.lat * Math.PI / 180
          const φ2 = b.latitude * Math.PI / 180
          const Δφ = (b.latitude - userLoc.lat) * Math.PI / 180
          const Δλ = (b.longitude - userLoc.lng) * Math.PI / 180
          
          const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          const distance = R * c
          
          return { ...b, distance }
        })
        .filter(b => b.distance! <= filters.maxDistance!)
        .sort((a, b) => a.distance! - b.distance!)
    }
    
    return filtered
  }, [])
  
  // Computed visible businesses (apply filters to baseBusinesses)
  const visibleBusinesses = useMemo(() => {
    return applyFilters(baseBusinesses, activeFilters, userLocation)
  }, [baseBusinesses, activeFilters, userLocation, applyFilters])
  
  // Hydrate businesses (fetch enriched fields like opening_hours, offers)
  const hydrateBusinesses = useCallback(async (businessList: Business[]) => {
    const idsToHydrate = businessList
      .map(b => b.id)
      .filter(id => !hydrationRequestedRef.current.has(id))
    
    if (idsToHydrate.length === 0) return
    
    idsToHydrate.forEach(id => hydrationRequestedRef.current.add(id))
    const startMs = Date.now()
    
    try {
      const response = await fetch(`/api/atlas/search?ids=${idsToHydrate.join(',')}`)
      const data = await response.json()
      const elapsedMs = Date.now() - startMs
      
      if (data.ok && data.results) {
        console.log('[Atlas Hydrate] Fields:', data.results[0] ? Object.keys(data.results[0]) : [], 'hasOpeningHours:', !!data.results[0]?.opening_hours)
        for (const biz of data.results) {
          hydratedDataRef.current.set(biz.id, biz)
        }
        console.log(`[Atlas] Hydrated ${data.results.length} businesses in ${elapsedMs}ms`)
      }
    } catch (error) {
      console.error('[Atlas] Hydration failed:', error)
    }
  }, [])
  
  // Fact chips: track hydration completions to re-render chips
  const [hydratedVersion, setHydratedVersion] = useState(0)
  
  // Trigger hydration when businesses change
  useEffect(() => {
    if (baseBusinesses.length > 0 && isActive) {
      hydrateBusinesses(baseBusinesses).then(() => {
        setHydratedVersion(v => v + 1)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseBusinesses.length, isActive])
  
  // Track result center for "Search this area" detection
  useEffect(() => {
    if (baseBusinesses.length > 0) {
      const avgLat = baseBusinesses.reduce((s, b) => s + b.latitude, 0) / baseBusinesses.length
      const avgLng = baseBusinesses.reduce((s, b) => s + b.longitude, 0) / baseBusinesses.length
      resultBoundsRef.current = { lat: avgLat, lng: avgLng }
      setShowSearchThisArea(false)
    }
  }, [baseBusinesses])
  
  // Listen for map moveend to detect when user pans far from results
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    
    const onMoveEnd = () => {
      if (!resultBoundsRef.current || !map.current) return
      const center = map.current.getCenter()
      const rCenter = resultBoundsRef.current
      // Haversine-ish quick distance check (~km)
      const dLat = Math.abs(center.lat - rCenter.lat)
      const dLng = Math.abs(center.lng - rCenter.lng)
      const approxKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111
      setShowSearchThisArea(approxKm > 1.5)
    }
    
    map.current.on('moveend', onMoveEnd)
    const currentMap = map.current
    return () => { currentMap.off('moveend', onMoveEnd) }
  }, [mapLoaded])
  
  // Transient status message helper
  const showStatus = useCallback((msg: string, durationMs = 2000) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    setStatusMessage(msg)
    statusTimerRef.current = setTimeout(() => setStatusMessage(null), durationMs)
  }, [])
  
  const handleSearchThisArea = useCallback(() => {
    if (!map.current) return
    const center = map.current.getCenter()
    setShowSearchThisArea(false)
    showStatus('Searching this area...')
    trackEvent({ eventType: 'atlas_area_search' })
    if (vibeSearchRef.current) {
      vibeSearchRef.current(`places near ${center.lat.toFixed(4)},${center.lng.toFixed(4)}`)
    }
  }, [showStatus, trackEvent])
  
  const selectedBusinessFactChips = useMemo(() => {
    if (!selectedBusiness) return []
    const hydrated = hydratedDataRef.current.get(selectedBusiness.id)
    return buildBusinessFacts(selectedBusiness, {
      userLocation,
      hydratedData: hydrated,
      isMobile: isMobile
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusiness?.id, userLocation, isMobile, hydratedVersion])
  
  // ✅ SHIP-SAFE: Show friendly message when filters result in 0 places
  useEffect(() => {
    const hasActiveFilters = activeFilters.openNow || activeFilters.maxDistance !== null
    
    if (hasActiveFilters && baseBusinesses.length > 0 && visibleBusinesses.length === 0) {
      // Filters applied but 0 results - show helpful message
      const filterNames = []
      if (activeFilters.openNow) filterNames.push('"Open now"')
      if (activeFilters.maxDistance) filterNames.push('"Closer"')
      
      setHudSummary(`No places match ${filterNames.join(' + ')} — try removing a filter or clearing all`)
      setHudPrimaryBusinessName(null)
      setHudVisible(true)
    } else if (hasActiveFilters && visibleBusinesses.length > 0) {
      // Filters applied and have results - already handled by status strip
      // Don't override HUD if user is viewing a business
    }
  }, [visibleBusinesses.length, baseBusinesses.length, activeFilters])
  
  // Track Atlas opened when it becomes active (not just on mount)
  const prevIsActiveRef = useRef(false)
  useEffect(() => {
    if (isActive && !prevIsActiveRef.current) {
      trackEvent({
        eventType: 'atlas_opened',
        performanceMode: performanceMode.enabled
      })
      // Resize map when becoming visible again (canvas may have stale dimensions)
      if (map.current && mapLoaded) {
        requestAnimationFrame(() => {
          map.current?.resize()
        })
      }
      // Check if vibe setup should show (cold start, no businesses, not onboarded)
      const onboardedKey = `atlasOnboarded:${city}`
      const hasOnboarded = typeof window !== 'undefined' && localStorage.getItem(onboardedKey) === 'true'
      if (!hasOnboarded && (!incomingBusinesses || incomingBusinesses.length === 0)) {
        setShowVibeSetup(true)
      }
    }
    prevIsActiveRef.current = isActive
  }, [isActive, trackEvent, performanceMode.enabled, mapLoaded, city, incomingBusinesses])
  
  // Ref-bridged callbacks (defined later, avoids declaration order issues)
  const vibeSearchRef = useRef<((q: string) => void) | null>(null)
  const addBusinessMarkersRef = useRef<((businesses: Business[]) => Promise<void>) | null>(null)
  
  const handleVibeComplete = useCallback((preferences: { mood: string; transport: string; priority: string }) => {
    const onboardedKey = `atlasOnboarded:${city}`
    const prefsKey = `atlasPrefs:${city}`
    
    try {
      localStorage.setItem(onboardedKey, 'true')
      localStorage.setItem(prefsKey, JSON.stringify({ ...preferences, timestamp: Date.now() }))
    } catch { /* localStorage not available */ }
    
    setShowVibeSetup(false)
    showStatus('Finding places...')
    
    trackEvent({ eventType: 'atlas_vibe_setup_completed', query: `${preferences.mood}/${preferences.transport}/${preferences.priority}` })
    
    const moodQuery = preferences.mood === 'surprise' ? '' : preferences.mood.replace(/_/g, ' ')
    if (moodQuery && vibeSearchRef.current) {
      vibeSearchRef.current(moodQuery)
    }
  }, [city, showStatus, trackEvent])
  
  const handleToggleSave = useCallback((businessId: string) => {
    setSavedBusinessIds(prev => {
      const next = new Set(prev)
      if (next.has(businessId)) {
        next.delete(businessId)
      } else {
        next.add(businessId)
        trackEvent({ eventType: 'atlas_save_business', businessId })
      }
      try {
        localStorage.setItem('qwikker_atlas_saved', JSON.stringify([...next]))
      } catch { /* */ }
      return next
    })
  }, [trackEvent])
  
  const handleVibeSkip = useCallback(() => {
    const onboardedKey = `atlasOnboarded:${city}`
    try {
      localStorage.setItem(onboardedKey, 'true')
    } catch { /* */ }
    setShowVibeSetup(false)
    trackEvent({ eventType: 'atlas_vibe_setup_skipped' })
  }, [city, trackEvent])
  
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
  
  // Play sound helper (currently disabled -- no-op)
  const playSound = useCallback((_audio: HTMLAudioElement | null) => {
    // Sound feature not yet active
  }, [])
  
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
        
        // Wait for map to be fully ready: style loaded + first render complete (idle)
        mapInstance.once('idle', () => {
          console.log('[Atlas] ✅ Map idle (style loaded, first render done). mapReadyRef = true')
          
          if (process.env.NODE_ENV === 'development') {
            ;(window as any).__atlasMap = mapInstance
            console.log('[Atlas] window.__atlasMap set for debugging')
          }
          
          if (!performanceMode.enabled && performanceMode.fog) {
            mapInstance.setFog({
              color: 'rgb(5, 10, 12)',
              'high-color': 'rgb(8, 20, 18)',
              'horizon-blend': 0.3,
              'space-color': 'rgb(0, 5, 3)',
              'star-intensity': 0.4
            })
          }
          
          // Subtle Qwikker green tint on water
          try {
            if (mapInstance.getLayer('water')) {
              mapInstance.setPaintProperty('water', 'fill-color', 'hsl(160, 15%, 12%)')
            }
          } catch { /* style may not have water layer */ }
          
          mapReadyRef.current = true
          setMapLoaded(true)
          
          playSound(audioWakeRef.current)
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
      // Only destroy map on true unmount (page navigation away)
      // With keep-alive mount, this rarely fires -- only on page leave
      mapReadyRef.current = false
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
      }
      if (map.current) {
        map.current.remove()
        map.current = null
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
  
  // Pending user marker (queue if map not ready when location arrives)
  const pendingUserMarkerRef = useRef<Coordinates | null>(null)
  
  // Pending business markers (queue if map not ready when businesses arrive)
  const pendingBusinessMarkersRef = useRef<Business[] | null>(null)
  
  // User location marker ref (HTML marker for 3D pin)
  const userMarkerRef = useRef<any>(null)
  
  // User location marker management (3D PIN STYLE) - always on top!
  const addUserLocationMarker = useCallback(async (coords: Coordinates) => {
    if (!map.current || !mapReadyRef.current) {
      console.log('[Atlas] ⚠️ Cannot add marker: mapReady=', mapReadyRef.current, '-- queuing')
      pendingUserMarkerRef.current = coords
      return
    }
    
    // If marker exists, just update position (don't re-create to avoid "floating")
    if (userMarkerRef.current) {
      // #region agent log
      console.log('[Atlas] 📍 Updating existing user marker position:', coords.lat.toFixed(5), coords.lng.toFixed(5))
      // #endregion
      userMarkerRef.current.setLngLat([coords.lng, coords.lat])
      return
    }
    
    try {
      const mapboxglModule = await import('mapbox-gl')
      const mapboxgl = mapboxglModule.default
      
      console.log('[Atlas] 📍 Creating 3D pin marker at:', coords)
      
      // Create 3D pin element (z-index: 2 to render above the vignette overlay at z-1)
      const el = document.createElement('div')
      el.className = 'user-location-3d-pin'
      el.style.cssText = 'width: 40px; height: 60px; cursor: pointer; position: relative; z-index: 2;'
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
      
      userMarkerRef.current = new mapboxgl.Marker({ 
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map.current)
      
      // Force the Mapbox marker wrapper to sit above all overlays (vignette, etc.)
      const markerWrapper = userMarkerRef.current.getElement()
      if (markerWrapper) {
        markerWrapper.style.zIndex = '10'
      }
      
      console.log('[Atlas] ✅ 3D pin marker created and added to map!')
      
    } catch (error) {
      console.error('[Atlas] ❌ Failed to add user location marker:', error)
    }
  }, [mapLoaded])
  
  // FlyTo helper with queue support (gated on mapReadyRef for determinism)
  const flyToLocation = useCallback((coords: Coordinates, zoom: number) => {
    console.log('[Atlas] 🔧 flyToLocation called:', { coords, zoom, hasMap: !!map.current, mapReady: mapReadyRef.current })
    
    if (!map.current || !mapReadyRef.current) {
      console.log('[Atlas] ⏳ Map not ready, queuing flyTo')
      pendingFlyToRef.current = { coords, zoom }
      return
    }
    
    console.log('[Atlas] ✈️ Executing flyTo:', coords)
    
    try {
      map.current.resize()
      map.current.flyTo({
        center: [coords.lng, coords.lat],
        zoom,
        duration: 1500,
        essential: true,
        curve: 1.2
      })
      map.current.triggerRepaint()
      console.log('[Atlas] ✅ flyTo command sent successfully')
    } catch (error) {
      console.error('[Atlas] ❌ flyTo FAILED:', error)
    }
  }, [mapLoaded])
  
  // Execute pending operations when map becomes ready
  useEffect(() => {
    if (!mapLoaded) return
    
    if (pendingFlyToRef.current) {
      const pending = pendingFlyToRef.current
      pendingFlyToRef.current = null
      flyToLocation(pending.coords, pending.zoom)
    }
    
    if (pendingUserMarkerRef.current) {
      const pendingCoords = pendingUserMarkerRef.current
      pendingUserMarkerRef.current = null
      addUserLocationMarker(pendingCoords)
    }
    
    if (pendingBusinessMarkersRef.current && addBusinessMarkersRef.current) {
      const pendingBusinesses = pendingBusinessMarkersRef.current
      pendingBusinessMarkersRef.current = null
      addBusinessMarkersRef.current(pendingBusinesses)
    }
  }, [mapLoaded, flyToLocation, addUserLocationMarker])
  
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
    
    // Clear route layers and animation
    if (routeAnimationRef.current !== null) {
      cancelAnimationFrame(routeAnimationRef.current)
      routeAnimationRef.current = null
    }
    const routeLayerIds = ['route-glow', 'route-line', 'route-dash']
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
    if (!map.current || !mapReadyRef.current || !userLocation) return
    
    try {
      // Cancel existing route animation
      if (routeAnimationRef.current !== null) {
        cancelAnimationFrame(routeAnimationRef.current)
        routeAnimationRef.current = null
      }
      
      // Remove existing route
      const routeLayerIds = ['route-glow', 'route-line', 'route-dash']
      routeLayerIds.forEach(id => {
        if (map.current!.getLayer(id)) {
          map.current!.removeLayer(id)
        }
      })
      if (map.current.getSource('route')) {
        map.current.removeSource('route')
      }
      
      const curvedCoordinates = buildArcRoute(
        userLocation.lng,
        userLocation.lat,
        activeBusiness.longitude,
        activeBusiness.latitude,
        40
      )
      
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
        lineMetrics: true
      })
      
      const routeLayers = getRouteLayers()
      const beforeLayer = map.current.getLayer('business-pins-glow') ? 'business-pins-glow' : undefined
      
      routeLayers.forEach(layer => {
        map.current!.addLayer(layer, beforeLayer)
      })
      
      // Animate route: start with low opacity, fade in, then run marching ants
      const mapRef = map.current
      
      // Set initial low opacity
      if (mapRef.getLayer('route-glow')) {
        mapRef.setPaintProperty('route-glow', 'line-opacity', 0)
      }
      if (mapRef.getLayer('route-line')) {
        mapRef.setPaintProperty('route-line', 'line-opacity', 0)
      }
      
      // Fade in over 1.5s
      const fadeStart = performance.now()
      const fadeDuration = 1500
      
      const animateFade = (now: number) => {
        if (!mapRef || !mapRef.getSource('route')) return
        const progress = Math.min((now - fadeStart) / fadeDuration, 1)
        const opacity = progress * progress // ease-in
        
        if (mapRef.getLayer('route-glow')) {
          mapRef.setPaintProperty('route-glow', 'line-opacity', opacity * 0.4)
        }
        if (mapRef.getLayer('route-line')) {
          mapRef.setPaintProperty('route-line', 'line-opacity', opacity)
        }
        
        if (progress < 1) {
          routeAnimationRef.current = requestAnimationFrame(animateFade)
        } else if (mapRef.getLayer('route-dash')) {
          // Start marching ants after fade completes
          let dashOffset = 0
          const animateDash = () => {
            if (!mapRef || !mapRef.getLayer('route-dash')) return
            dashOffset += 0.15
            mapRef.setPaintProperty('route-dash', 'line-dasharray', [2, 4 + (dashOffset % 6)])
            routeAnimationRef.current = requestAnimationFrame(animateDash)
          }
          routeAnimationRef.current = requestAnimationFrame(animateDash)
        }
      }
      
      routeAnimationRef.current = requestAnimationFrame(animateFade)
    } catch (error) {
      console.error('[Atlas] Failed to add route line:', error)
    }
  }, [mapLoaded, userLocation, performanceMode.enabled])
  
  // Update active business marker
  const updateActiveBusinessMarker = useCallback(async (business: Business) => {
    if (!map.current || !mapReadyRef.current) return
    
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
      pitch: isMobile ? 45 : 60,
      bearing: 0,
      duration: 3000,
      essential: true,
      curve: 1.42,
      padding: isMobile ? { top: 60, bottom: 350, left: 20, right: 20 } : undefined
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
    
    // Primary reason (why shown)
    if (business.reason) {
      parts.push(`${business.reason.emoji} ${business.reason.label}`)
    }
    
    // Secondary metadata
    if (business.reasonMeta) {
      if (business.reasonMeta.ratingBadge) {
        parts.push(`⭐ ${business.reasonMeta.ratingBadge}`)
      }
      if (business.reasonMeta.isOpenNow) {
        parts.push('🕐 Open now')
      }
      if (business.reasonMeta.distanceMeters) {
        parts.push(`📍 ${business.reasonMeta.distanceMeters}m`)
      }
    }
    
    // Fallback if no reason data
    if (parts.length === 0) {
      parts.push(`${business.business_name} — ${business.rating}★`)
      if (business.display_category) {
        parts.push(business.display_category)
      }
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
    
    setShowTourEndHelper(false)
    setTourActive(true)
    setSelectedBusinessIndex(0)
    setSelectedBusiness(tourBusinesses[0])
    
    // ✨ Mobile: Open bottom sheet, Desktop: Show HUD
    if (isMobile) {
      setShowMobileSheet(true)
    } else {
      // ✨ Tour intro message (brief, then show first stop)
      const tourIntro = `Starting your tour of ${tourBusinesses.length} ${tourBusinesses.length === 1 ? 'place' : 'places'}...`
      setHudSummary(tourIntro)
      setHudPrimaryBusinessName(null)
      setHudVisible(true)
    }
    
    // Go directly to first business (no detour to user location)
    console.log('🎬 Flying to first business:', tourBusinesses[0].business_name)
    
    flyToBusiness(tourBusinesses[0])
    updateActiveBusinessMarker(tourBusinesses[0])
    
    if (!isMobile) {
      setTimeout(() => {
        const firstBusiness = tourBusinesses[0]
        const reviewCount = firstBusiness.review_count || 0
        const firstStopMessage = `Stop 1 of ${tourBusinesses.length} • Rated ${firstBusiness.rating}★ by ${reviewCount} ${reviewCount === 1 ? 'person' : 'people'} on Google`
        setHudSummary(firstStopMessage)
      }, 1500)
    }
    
    // Schedule advance to next business
    if (tourBusinesses.length > 1) {
      tourTimerRef.current = setTimeout(() => {
        advanceTour(1)
      }, isMobile ? 5000 : 5500)
    } else {
      setTimeout(() => {
        setTourActive(false)
        if (!isMobile) setHudVisible(false)
      }, isMobile ? 5000 : 5500)
    }
  }, [flyToBusiness, updateActiveBusinessMarker, isMobile])
  
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
    
    // ✨ Update HUD with stop info (desktop only, mobile uses bottom sheet)
    if (!isMobile) {
      const stopNumber = targetIndex + 1
      const totalStops = currentBusinesses.length
      const reviewCount = targetBusiness.review_count || 0
      const hudMessage = `Stop ${stopNumber} of ${totalStops} • Rated ${targetBusiness.rating}★ by ${reviewCount} ${reviewCount === 1 ? 'person' : 'people'} on Google`
      
      setHudSummary(hudMessage)
      setHudPrimaryBusinessName(null)
      setHudVisible(true)
    }
    
    // Schedule next advance if not at end
    if (targetIndex < currentBusinesses.length - 1) {
      tourTimerRef.current = setTimeout(() => {
        advanceTour(targetIndex + 1)
      }, 3000)
    } else {
      // End of tour - show decision helper!
      setTourActive(false)
      setHudVisible(false)
      
      // Show decision helper after 6s (give user time to view last stop)
      setTimeout(() => {
        setShowTourEndHelper(true)
      }, 6000)
    }
  }, [flyToBusiness, updateActiveBusinessMarker, generateBusinessHudMessage, isMobile])
  
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
    dlog('📍 addBusinessMarkers', { count: businesses.length, mapReady: mapReadyRef.current, mapExists: !!map.current, mapLoaded: map.current?.loaded?.() ?? false })
    
    if (!map.current || !mapReadyRef.current) {
      dlog('⏳ mapNotReady', { queued: businesses.length })
      pendingBusinessMarkersRef.current = businesses
      return
    }
    
    // NOTE: removed map.loaded() check — mapReadyRef.current already confirms style is loaded.
    // loaded() can return false mid-flight (loading tiles) which blocked pin creation.
    
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
      // #region agent log
      dlog('🎨 imageCheck', { hasCyan: map.current.hasImage('pulsing-dot-cyan'), hasGrey: map.current.hasImage('pulsing-dot-grey') })
      // #endregion
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
      
      // Create GeoJSON features
      const features = businesses.map(business => {
        // Determine pin styling based on simplified tier from chat
        // mapPins use: 'paid' | 'unclaimed' | 'claimed_free'
        const tier = business.business_tier || 'unclaimed'
        const isPaid = tier === 'paid' || tier === 'trial'
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
      
      console.log('[Atlas] 🔧 Processing', features.length, 'features')
      console.log(`[Atlas] 📊 Pin tier breakdown: ${paidCount} paid (cyan), ${claimedFreeCount} claimed-free, ${unclaimedCount} unclaimed (grey)`)
      
      // ✅ MVP-CRITICAL FIX: Update existing source via setData() instead of removing/re-adding
      // This makes filters and pin updates work correctly
      const existingSource = map.current.getSource('businesses') as any
      
      if (existingSource) {
        // Source exists → update data, but verify layers still exist
        const pinsLayerExists = !!map.current.getLayer('business-pins')
        const clustersLayerExists = !!map.current.getLayer('business-clusters')
        dlog('🔄 sourceExists', { pinsLayerExists, clustersLayerExists, featureCount: features.length })
        
        existingSource.setData({
          type: 'FeatureCollection',
          features
        })
        map.current.triggerRepaint()
        
        // If layers are missing (e.g. after cleanup), re-add them
        if (!pinsLayerExists) {
          console.warn('[Atlas] ⚠️ Source exists but pin layers missing! Re-adding layers...')
          const pinLayers = getBusinessPinLayers()
          pinLayers.forEach(layer => {
            try { map.current!.addLayer(layer) } catch (e) { console.error('[Atlas] ❌ Re-add layer failed:', e) }
          })
          try {
            const clusterLayers = getClusterLayers()
            clusterLayers.forEach(layer => {
              try { map.current!.addLayer(layer) } catch (e) { console.error('[Atlas] ❌ Re-add cluster failed:', e) }
            })
          } catch (e) { console.error('[Atlas] ❌ Cluster layers failed:', e) }
        }
        
        console.log('[Atlas] ✅ Source updated, features:', features.length)
        return
      }
      
      // Source doesn't exist → add it (first time setup)
      console.log('[Atlas] 🔧 Adding NEW source "businesses" with', features.length, 'features')
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
        // ✅ MVP-CRITICAL: Define handlers ONCE using stable refs (prevents handler stacking)
        if (!onPinClickRef.current) {
          onPinClickRef.current = (e: any) => {
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
              
              // ✨ Mobile: Show bottom sheet instead of HUD
              if (isMobile) {
                setShowMobileSheet(true)
              } else {
                // Desktop: Show HUD
                setHudSummary(generateBusinessHudMessage(business))
                setHudPrimaryBusinessName(null)
                setHudVisible(true)
              }
            }
          }
          
          onPinEnterRef.current = () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer'
          }
          
          onPinLeaveRef.current = () => {
            if (map.current) map.current.getCanvas().style.cursor = ''
          }
          
          // ✨ Cluster handlers - zoom into cluster on click
          onClusterClickRef.current = (e: any) => {
            if (!e.features || e.features.length === 0 || !map.current) return
            
            const feature = e.features[0]
            const clusterId = feature.properties.cluster_id
            const source = map.current.getSource('businesses') as any
            
            if (source && source.getClusterExpansionZoom) {
              source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
                if (err || !map.current || zoom === null || zoom === undefined) return
                
                map.current.easeTo({
                  center: feature.geometry.coordinates,
                  zoom: zoom + 0.5, // Slight extra zoom for better reveal
                  duration: 800
                })
              })
            }
          }
          
          onClusterEnterRef.current = () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer'
          }
          
          onClusterLeaveRef.current = () => {
            if (map.current) map.current.getCanvas().style.cursor = ''
          }
        }
        
        // ✅ Always detach then attach using the SAME stable references
        map.current.off('click', 'business-pins', onPinClickRef.current!)
        map.current.off('mouseenter', 'business-pins', onPinEnterRef.current!)
        map.current.off('mouseleave', 'business-pins', onPinLeaveRef.current!)
        
        map.current.on('click', 'business-pins', onPinClickRef.current!)
        map.current.on('mouseenter', 'business-pins', onPinEnterRef.current!)
        map.current.on('mouseleave', 'business-pins', onPinLeaveRef.current!)
        
        // Cluster handlers
        map.current.off('click', 'business-clusters', onClusterClickRef.current!)
        map.current.off('mouseenter', 'business-clusters', onClusterEnterRef.current!)
        map.current.off('mouseleave', 'business-clusters', onClusterLeaveRef.current!)
        
        map.current.on('click', 'business-clusters', onClusterClickRef.current!)
        map.current.on('mouseenter', 'business-clusters', onClusterEnterRef.current!)
        map.current.on('mouseleave', 'business-clusters', onClusterLeaveRef.current!)
        
        businessHandlersAttachedRef.current = true
      }
      
      dlog('✅ pinsAdded', { count: businesses.length, layersNow: map.current.getStyle().layers.map((l: any) => l.id).filter((id: string) => id.includes('business') || id.includes('cluster')) })
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
      dlog('❌ CRITICAL_FAIL', { error: String(error), stack: error instanceof Error ? error.stack : 'N/A' })
    }
  }, [mapLoaded, dlog, updateActiveBusinessMarker, flyToBusiness, tourActive, stopTour, generateBusinessHudMessage, playSound])
  
  // Update map when visibleBusinesses changes (filters applied)
  useEffect(() => {
    if (!mapLoaded || visibleBusinesses.length === 0) return
    
    console.log(`[Atlas] 🔄 Updating map with ${visibleBusinesses.length} visible businesses (filters applied)`)
    addBusinessMarkers(visibleBusinesses)
  }, [visibleBusinesses, mapLoaded, addBusinessMarkers])
  
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
    
    console.log('[Atlas] 🎯 Received businesses from chat:', incomingBusinesses.length)
    console.log('[Atlas] 📊 First business reason:', incomingBusinesses[0]?.reason)
    console.log('[Atlas] 📊 First business reasonMeta:', incomingBusinesses[0]?.reasonMeta)
    
    // ✅ CRITICAL: Update ref FIRST before any effects run
    businessesRef.current = incomingBusinesses
    
    // Update local state
    setBusinesses(incomingBusinesses)
    setBaseBusinesses(incomingBusinesses) // Store for filtering
    
    // ✅ SHIP-SAFE: Clear filters when new businesses arrive
    // This prevents confusing UX where filters were applied to empty list,
    // then businesses arrive but are immediately hidden by stale filters
    const hadActiveFilters = activeFilters.openNow || activeFilters.maxDistance !== null
    setActiveFilters({ openNow: false, maxDistance: null })
    
    // Show brief notification if we auto-cleared filters
    if (hadActiveFilters && incomingBusinesses.length > 0) {
      setHudSummary(`Showing all ${incomingBusinesses.length} places (filters cleared)`)
      setHudVisible(true)
      setTimeout(() => setHudVisible(false), 3000)
    }
    
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
      
      // Wait for map to be truly ready before animating
      if (!mapReadyRef.current) {
        console.warn('[Atlas] ⏳ Map not ready, waiting for idle...')
        map.current.once('idle', () => {
          console.log('[Atlas] ✅ Map idle, executing cinematic flyTo')
          if (map.current) {
            map.current.resize()
            map.current.flyTo({
              center: [first.longitude, first.latitude],
              zoom: 14,
              duration: 2000,
              curve: 1.42,
              essential: true
            })
            map.current.triggerRepaint()
            console.log('[Atlas] ✅ flyTo executed after idle')
            startTourIfMultiple()
          }
        })
        // Safety fallback: if idle doesn't fire in 3s, force jumpTo
        const safetyTimeout = setTimeout(() => {
          if (map.current && !mapReadyRef.current) {
            console.warn('[Atlas] ⚠️ Idle timeout, falling back to jumpTo')
            map.current.jumpTo({ center: [first.longitude, first.latitude], zoom: 14 })
            map.current.resize()
            map.current.triggerRepaint()
            startTourIfMultiple()
          }
        }, 3000)
        // Clear safety timeout if idle fires first
        map.current.once('idle', () => clearTimeout(safetyTimeout))
        return
      }
      
      try {
        showStatus(`Flying to ${first.business_name}...`)
        map.current.resize()
        map.current.flyTo({
          center: [first.longitude, first.latitude],
          zoom: 14,
          duration: 2000,
          curve: 1.42,
          essential: true
        })
        map.current.triggerRepaint()
        console.log('[Atlas] ✅ Cinematic flyTo sent to first business')
      } catch (error) {
        console.error('[Atlas] ❌ flyTo FAILED, falling back to jumpTo:', error)
        try {
          map.current!.jumpTo({ center: [first.longitude, first.latitude], zoom: 14 })
        } catch (e) { /* last resort failed */ }
      }
      
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
    
    // Guard: ensure map is fully ready (use ref for determinism)
    if (!mapReadyRef.current || !map.current.isStyleLoaded()) {
      console.warn('[Atlas] Cannot recenter: map not ready')
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
    setEmptyStateDismissed(false)
    
    const lower = query.toLowerCase()
    
    // Check for filter commands (filters preserve tour index when possible)
    if (lower.includes('open now') || lower.includes('currently open')) {
      console.log('[Atlas] 🕐 Applying "open now" filter')
      setActiveFilters(prev => ({ ...prev, openNow: true }))
      showStatus('Filtering: open now')
      setHudSummary('Showing only open businesses')
      setHudVisible(true)
      return
    }
    
    if (lower.includes('closer') || lower.includes('nearby') || lower.includes('within')) {
      // ✅ SAFETY: Check if location is available before applying distance filter
      if (!userLocation) {
        console.log('[Atlas] ⚠️ Distance filter requested but location not available')
        setHudSummary('Enable location to filter by distance')
        setHudVisible(true)
        return
      }
      console.log('[Atlas] 📍 Applying "closer" filter (within 1km)')
      setActiveFilters(prev => ({ ...prev, maxDistance: 1000 }))
      setHudSummary('Showing businesses within 1km')
      setHudVisible(true)
      return
    }
    
    // Clear/reset commands
    if (/\b(clear|reset|show all)\b/.test(lower)) {
      console.log('[Atlas] 🔄 Clearing all filters')
      setActiveFilters({ openNow: false, maxDistance: null })
      setHudSummary('Filters cleared')
      setHudVisible(true)
      return
    }
    
    // New search - clear filters, reset tour state, and run query
    setActiveFilters({ openNow: false, maxDistance: null })
    setShowTourEndHelper(false)
    stopTour()
    setSearching(true)
    showStatus('Finding places...')
    setSelectedBusiness(null)
    setHudVisible(false)
    
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
      
      const dismissMs = atlasResponse.ui?.autoDismissMs ?? 4200
      
      // Store query and business IDs for state handoff
      setLastAtlasQuery(query)
      setLastAtlasBusinessIds(atlasResponse.businessIds ?? [])
      
      if (atlasResponse.businessIds?.length > 0) {
        console.log('[Atlas Search] ✅ Found', atlasResponse.businessIds.length, 'business IDs')
        
        // Hydrate: fetch full business data by IDs (avoids re-searching with mismatched terms)
        const idsToFetch = atlasResponse.businessIds.slice(
          0, performanceMode.enabled ? performanceMode.maxMarkers : config.maxResults
        )
        console.log('[Atlas Search] 📡 Hydrating', idsToFetch.length, 'business IDs...')
        const detailsResponse = await fetch(`/api/atlas/search?ids=${idsToFetch.join(',')}`)
        const detailsData = await detailsResponse.json()
        console.log('[Atlas Search] 📦 Hydration response:', detailsData)
        
        if (detailsData.ok && detailsData.results) {
          const filteredResults = detailsData.results as Business[]
          console.log('[Atlas Search] 📊 Hydrated results:', filteredResults.length)
          console.log('[Atlas Search] 📊 Business names:', filteredResults.map((b: Business) => b.business_name))
          
          setBusinesses(filteredResults)
          setBaseBusinesses(filteredResults)
          await addBusinessMarkers(filteredResults)
          
          if (filteredResults.length > 0) {
            setSelectedBusinessIndex(0)
            const firstBusiness = filteredResults[0]
            setSelectedBusiness(firstBusiness)
            await updateActiveBusinessMarker(firstBusiness)
            flyToBusiness(firstBusiness)
            
            if (filteredResults.length > 1) {
              console.log('[Atlas Search] 🎬 Will start tour in', dismissMs + 500, 'ms')
              setTimeout(() => {
                startTour(filteredResults)
              }, dismissMs + 500)
            }
          }
          
          let primaryBusinessName: string | null = null
          if (atlasResponse.primaryBusinessId) {
            const primaryBusiness = filteredResults.find((b: Business) => 
              b.id === atlasResponse.primaryBusinessId
            )
            primaryBusinessName = primaryBusiness?.business_name || null
          }
          
          setHudSummary(atlasResponse.summary || 'Found places nearby.')
          setHudPrimaryBusinessName(primaryBusinessName)
          
          setTimeout(() => {
            setHudVisible(true)
            
            hudDismissTimerRef.current = setTimeout(() => {
              setHudVisible(false)
            }, dismissMs)
          }, 120)
          
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
        setHudSummary(atlasResponse.summary || 'No results found.')
        setHudPrimaryBusinessName(null)
        
        setTimeout(() => {
          setHudVisible(true)
          
          hudDismissTimerRef.current = setTimeout(() => {
            setHudVisible(false)
          }, dismissMs)
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
  }, [userLocation, addBusinessMarkers, flyToBusiness, config.maxResults, performanceMode, trackEvent, stopTour])
  
  // Bridge refs to callbacks (avoids declaration-order issues)
  vibeSearchRef.current = handleSearch
  addBusinessMarkersRef.current = addBusinessMarkers
  
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
  
  // Pause/resume when Atlas becomes inactive/active
  useEffect(() => {
    if (isActive) {
      // Resize map when returning (visibility was hidden, canvas may need recalc)
      if (map.current) {
        requestAnimationFrame(() => {
          map.current?.resize()
          map.current?.triggerRepaint()
          // Re-add user marker after visibility toggle (marker DOM may need refresh)
          if (userLocation && mapReadyRef.current) {
            addUserLocationMarker(userLocation)
          }
        })
      }
    } else {
      if (tourTimerRef.current) {
        clearTimeout(tourTimerRef.current)
        tourTimerRef.current = null
      }
      if (hudDismissTimerRef.current) {
        clearTimeout(hudDismissTimerRef.current)
        hudDismissTimerRef.current = null
      }
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current)
        statusTimerRef.current = null
      }
      if (routeAnimationRef.current !== null) {
        cancelAnimationFrame(routeAnimationRef.current)
        routeAnimationRef.current = null
      }
      setHudVisible(false)
      setStatusMessage(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, userLocation, addUserLocationMarker])
  
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
    // ID-based detail request
    if (onRequestDetails && selectedBusiness) {
      console.log(`📱 Requesting details for business ID: ${selectedBusiness.id}`)
      onRequestDetails(selectedBusiness.id)
      handleHudDismiss()
    } else {
      // Fallback: close and return to chat
      handleHudDismiss()
      handleClose()
    }
  }, [selectedBusiness, onRequestDetails, handleHudDismiss, handleClose])
  
  return (
    <>
      {/* Mapbox CSS - Must be in head */}
      <Head>
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.18.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </Head>
      
      <div className="atlas-container fixed inset-0 z-50 bg-black">
        {/* Map Container - Explicit height and width for Mapbox */}
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ minHeight: '100vh' }} />
        
        {/* VIGNETTE OVERLAY - Subtle edge darkening */}
        <div 
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.15) 75%, rgba(0,0,0,0.35) 100%)',
          }}
        />
        
        {/* Vibe Setup (replaces intro overlay for cold starts) */}
        {showVibeSetup && (
          <AtlasVibeSetup
            city={city}
            onComplete={handleVibeComplete}
            onSkip={handleVibeSkip}
          />
        )}
      
      {/* ✨ MOBILE TOP BAR - Back + Mute buttons */}
      {isMobile && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pt-safe">
          {/* Back to Chat */}
          <button
            onClick={handleClose}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="font-medium">Back to Chat</span>
          </button>

        </div>
      )}
      
      {/* Status Strip with Filter Pills -- stacked below top bar on mobile */}
      {(activeFilters.openNow || activeFilters.maxDistance !== null || visibleBusinesses.length !== baseBusinesses.length) && (
        <div className={`absolute ${isMobile ? 'top-14' : 'top-20'} left-0 right-0 z-[15] px-4 py-2 bg-black/40 backdrop-blur-sm border-b border-white/10`}>
          <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'} text-white/80`}>
            <span>
              {visibleBusinesses.length} 
              {baseBusinesses.length > 0 && visibleBusinesses.length !== baseBusinesses.length ? ` / ${baseBusinesses.length}` : ''} places
              {!activeFilters.openNow && !activeFilters.maxDistance && !isMobile && ' • sorted by relevance'}
            </span>
            
            {(activeFilters.openNow || activeFilters.maxDistance) && (
              <div className="flex items-center gap-1.5">
                {activeFilters.openNow && (
                  <button
                    onClick={() => setActiveFilters(prev => ({ ...prev, openNow: false }))}
                    className="px-2 py-1 rounded-full bg-[#00d083]/20 border border-[#00d083]/40 text-[#00d083] text-xs flex items-center gap-1 hover:bg-[#00d083]/30 transition-colors"
                  >
                    Open now <span className="ml-1">×</span>
                  </button>
                )}
                {activeFilters.maxDistance && (
                  <button
                    onClick={() => setActiveFilters(prev => ({ ...prev, maxDistance: null }))}
                    className="px-2 py-1 rounded-full bg-[#00d083]/20 border border-[#00d083]/40 text-[#00d083] text-xs flex items-center gap-1 hover:bg-[#00d083]/30 transition-colors"
                  >
                    Within 1km <span className="ml-1">×</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* ✨ TOUR END DECISION HELPER - "What now?" */}
      {showTourEndHelper && visibleBusinesses.length > 0 && (
        <>
          {/* Backdrop - STRONG blur + darken */}
          <div 
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl"
            onClick={() => setShowTourEndHelper(false)}
          />
          
          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md px-6">
            <div className="bg-black/95 backdrop-blur-xl border-2 border-[#00d083]/30 rounded-3xl p-8 shadow-2xl">
              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  Which one interests you?
                </h3>
                <p className="text-white/60 text-sm">
                  Tap below to narrow it down or get details
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => {
                    // Find highest rated
                    const best = [...visibleBusinesses].sort((a, b) => b.rating - a.rating)[0]
                    if (best) {
                      setSelectedBusiness(best)
                      setSelectedBusinessIndex(visibleBusinesses.findIndex(b => b.id === best.id))
                      flyToBusiness(best)
                      updateActiveBusinessMarker(best)
                    }
                    setShowTourEndHelper(false)
                  }}
                  className="w-full px-6 py-4 rounded-xl bg-[#00d083] hover:bg-[#00ff9d] transition-colors text-white font-semibold text-center"
                >
                  Show me the best rated
                </button>
                
                {userLocation && (
                  <button
                    onClick={() => {
                      // Find closest
                      const withDistance = visibleBusinesses.map(b => ({
                        ...b,
                        dist: userLocation && b.latitude && b.longitude 
                          ? Math.hypot(userLocation.lat - b.latitude, userLocation.lng - b.longitude)
                          : Infinity
                      })).sort((a, b) => a.dist - b.dist)[0]
                      
                      if (withDistance) {
                        setSelectedBusiness(withDistance)
                        setSelectedBusinessIndex(visibleBusinesses.findIndex(b => b.id === withDistance.id))
                        flyToBusiness(withDistance)
                        updateActiveBusinessMarker(withDistance)
                      }
                      setShowTourEndHelper(false)
                    }}
                    className="w-full px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white font-semibold text-center"
                  >
                    Show me the closest
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setShowTourEndHelper(false)
                    if (onTellMeMore && visibleBusinesses.length > 0) {
                      const names = visibleBusinesses.map(b => b.business_name)
                      const message = visibleBusinesses.length === 1
                        ? `Tell me more about ${names[0]}`
                        : `Compare ${names.join(', ')} — which one should I visit?`
                      onTellMeMore(message, visibleBusinesses[0].id)
                    } else {
                      handleClose()
                    }
                  }}
                  className="w-full px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white font-semibold text-center"
                >
                  See details in chat
                </button>
              </div>
              
              {/* Dismiss */}
              <button
                onClick={() => setShowTourEndHelper(false)}
                className="w-full text-white/40 hover:text-white/60 text-sm transition-colors"
              >
                I'll keep browsing
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* HUD Bubble (ephemeral AI response) - DESKTOP ONLY */}
      {!isMobile && (
        <AtlasHudBubble
          visible={hudVisible}
          summary={hudSummary}
          primaryBusinessName={hudPrimaryBusinessName || undefined}
          onDismiss={handleHudDismiss}
          onMoreDetails={handleHudMoreDetails}
        />
      )}
      
      {/* Overlay UI - DESKTOP ONLY (mobile uses bottom sheet + input) */}
      {!isMobile && (
        <AtlasOverlay
          onClose={handleClose}
          onSearch={handleSearch}
          searching={searching}
          selectedBusiness={selectedBusiness}
          userLocation={userLocation}
          tourActive={tourActive}
          totalBusinesses={businesses.length}
          currentBusinessIndex={selectedBusinessIndex}
          onNextBusiness={goToNextBusiness}
          onPreviousBusiness={goToPreviousBusiness}
          onStopTour={stopTour}
          factChips={selectedBusinessFactChips}
          onIntentChipTap={(chip) => handleSearch(chip)}
          isSaved={selectedBusiness ? savedBusinessIds.has(selectedBusiness.id) : false}
          onToggleSave={selectedBusiness ? () => handleToggleSave(selectedBusiness.id) : undefined}
          onTellMeMore={selectedBusiness && onTellMeMore ? () => {
            onTellMeMore(`Tell me more about ${selectedBusiness.business_name}`, selectedBusiness.id)
          } : undefined}
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
      )}
      
      {/* Chat Context Strip - Desktop only (mobile has bottom input) */}
      {!isMobile && mapLoaded && (lastUserQuery || lastAIResponse) && (
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
      
      {/* Empty State -- only show briefly, not when HUD is visible */}
      {mapLoaded && !searching && baseBusinesses.length === 0 && !showVibeSetup && !hudVisible && !emptyStateDismissed && (
        <div className={`absolute ${isMobile ? 'bottom-24' : 'bottom-28'} left-1/2 -translate-x-1/2 z-20 w-full max-w-sm px-4`}>
          <div className="relative bg-black/70 backdrop-blur-lg rounded-2xl px-5 py-4 border border-white/10">
            <button
              onClick={() => setEmptyStateDismissed(true)}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-3.5 h-3.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <p className="text-white/70 text-sm text-center mb-3 pr-4">
              {!userLocation
                ? 'Try searching for something specific'
                : 'No places matched — try a different search'
              }
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => handleSearch('restaurants')}
                className="px-4 py-2 bg-[#00d083]/20 border border-[#00d083]/30 rounded-full text-[#00d083] text-sm hover:bg-[#00d083]/30 transition-colors"
              >
                Restaurants
              </button>
              <button
                onClick={() => handleSearch('bars and pubs')}
                className="px-4 py-2 bg-[#00d083]/20 border border-[#00d083]/30 rounded-full text-[#00d083] text-sm hover:bg-[#00d083]/30 transition-colors"
              >
                Bars
              </button>
              <button
                onClick={() => handleSearch('cafes')}
                className="px-4 py-2 bg-[#00d083]/20 border border-[#00d083]/30 rounded-full text-[#00d083] text-sm hover:bg-[#00d083]/30 transition-colors"
              >
                Cafes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* "Search this area" removed -- not needed for MVP */}
      
      {/* Status Breadcrumb Pill (transient) -- centered, above bottom UI */}
      {statusMessage && (
        <div className={`absolute ${isMobile ? 'top-20' : 'bottom-48'} left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-fade-in`}>
          <div className="px-5 py-2.5 rounded-full bg-black/80 backdrop-blur-lg border border-[#00d083]/30 shadow-xl">
            <p className="text-sm font-medium text-white/90 whitespace-nowrap">{statusMessage}</p>
          </div>
        </div>
      )}
      
      {/* ATLAS STATUS PILL - Bottom left, raised above mobile input bar */}
      {mapLoaded && (
        <div className={`absolute ${isMobile ? 'bottom-20' : 'bottom-6'} left-4 z-10 pointer-events-none`}>
          <div className="px-3 py-2 rounded-full bg-black/60 backdrop-blur-md border border-[#00d083]/30 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00d083] animate-pulse" />
              <p className="text-xs font-medium text-white/80">Atlas</p>
              <span className="text-xs text-white/40">·</span>
              <p className="text-xs text-white/50">{city}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Pin Legend (?) button -- positioned below mobile top bar to avoid overlap */}
      {mapLoaded && (
        <div className={`absolute ${isMobile ? 'top-16 right-4' : 'top-6 right-6'} z-20`}>
          <button
            onClick={() => {
              const next = !showLegend
              setShowLegend(next)
              if (next) trackEvent({ eventType: 'atlas_legend_opened' })
            }}
            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/60 hover:text-white text-sm font-bold transition-colors"
          >
            ?
          </button>
          
          {showLegend && (
            <div className="absolute top-12 right-0 w-64 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-50">
              <h4 className="text-sm font-semibold text-white mb-3">Map pins</h4>
              <div className="space-y-2.5 text-xs text-white/70">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#00f0ff]" />
                  <span>Highlighted = Qwikker Pick</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/40" />
                  <span>Grey = more places nearby</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#00d083]" />
                  <span>Green = your location</span>
                </div>
              </div>
              <p className="text-xs text-white/40 mt-3">
                Some places haven&apos;t been claimed yet — info may be limited.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* MANUAL LOCATION BUTTON - raised on mobile to clear bottom input */}
      {mapLoaded && locationStatus && (locationStatus === 'idle' || locationStatus === 'denied' || locationStatus === 'unavailable') && onRequestLocation && (
        <div className={`absolute ${isMobile ? 'bottom-24 left-4 right-4' : 'bottom-24 right-6'} z-10`}>
          <button
            onClick={onRequestLocation}
            className={`px-4 py-3 rounded-full bg-[#00d083] hover:bg-[#00ff9d] transition-colors shadow-lg border border-white/20 flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-semibold text-white">Use my location</span>
          </button>
        </div>
      )}
      
      {/* RECENTER TO USER BUTTON - Positioned to avoid overlap with tour controls on mobile */}
      {mapLoaded && userLocation && (
        <div className={`absolute ${isMobile && tourActive ? 'bottom-64' : 'bottom-32'} ${isMobile ? 'right-4' : 'right-6'} z-20`}>
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
      
      
      {/* Location Fallback Pill - Show when viewing city center, raised on mobile */}
      {mapLoaded && locationStatus && (locationStatus === 'denied' || locationStatus === 'unavailable') && !userLocation && (
        <div className={`absolute ${isMobile ? 'bottom-24' : 'bottom-6'} left-1/2 -translate-x-1/2 z-10 pointer-events-none`}>
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
      
      {/* ✨ MOBILE TOUR CONTROLS - Floating buttons when tour is active (z-[55] to sit above bottom sheet z-50) */}
      {isMobile && tourActive && visibleBusinesses.length > 1 && (
        <div className="absolute top-1/2 -translate-y-1/2 right-3 z-[55] flex flex-col gap-3">
          <button
            onClick={goToPreviousBusiness}
            className="w-14 h-14 rounded-full bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={stopTour}
            className="w-14 h-14 rounded-full bg-red-500/90 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <button
            onClick={goToNextBusiness}
            className="w-14 h-14 rounded-full bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {/* Tour counter pill */}
          <div className="px-3 py-2 rounded-full bg-[#00d083]/90 backdrop-blur-md text-white text-xs font-semibold text-center">
            {selectedBusinessIndex + 1} of {visibleBusinesses.length}
          </div>
        </div>
      )}
      
      {/* ✨ MOBILE BOTTOM SHEET - Replaces overlay on mobile */}
      {isMobile && (
        <BottomSheet
          isOpen={showMobileSheet && !!selectedBusiness}
          onClose={() => setShowMobileSheet(false)}
          snapPoints={[0.45, 0.7, 0.95]}
          initialSnap={0}
        >
          {selectedBusiness && (
            <div className="space-y-4">
              {/* Tour indicator */}
              {tourActive && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00d083]/20 border border-[#00d083]/40">
                  <span className="text-[#00d083] text-sm font-medium">
                    Stop {selectedBusinessIndex + 1} of {visibleBusinesses.length}
                  </span>
                </div>
              )}
              
              <h2 className="text-xl font-bold text-white">
                {selectedBusiness.business_name}
              </h2>
              
              {/* Fact Chips (mobile) */}
              {selectedBusinessFactChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedBusinessFactChips.map((chip, i) => (
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
              
              {/* Trust cue */}
              {selectedBusiness.isUnclaimed && (
                <p className="text-xs text-white/30">Imported from Google</p>
              )}
              
              {selectedBusiness.business_address && (
                <p className="text-white/60 text-sm">{selectedBusiness.business_address}</p>
              )}
              
              {/* Reason Tag */}
              {selectedBusiness.reason && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00d083]/20 border border-[#00d083]/40">
                  <span className="text-[#00d083] text-sm font-medium">{selectedBusiness.reason.label}</span>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-3 pt-4">
                {onTellMeMore ? (
                  <button
                    onClick={() => onTellMeMore(`Tell me more about ${selectedBusiness.business_name}`, selectedBusiness.id)}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#00d083] hover:bg-[#00ff9d] transition-colors text-white font-semibold"
                  >
                    Tell me more
                  </button>
                ) : (
                  <button
                    onClick={handleHudMoreDetails}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#00d083] hover:bg-[#00ff9d] transition-colors text-white font-semibold"
                  >
                    More Details
                  </button>
                )}
                <button
                  onClick={() => handleToggleSave(selectedBusiness.id)}
                  className={`p-3 rounded-xl transition-colors ${
                    savedBusinessIds.has(selectedBusiness.id)
                      ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  ★
                </button>
                <button
                  onClick={() => {
                    if (selectedBusiness.latitude && selectedBusiness.longitude) {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${selectedBusiness.latitude},${selectedBusiness.longitude}`,
                        '_blank'
                      )
                    }
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white font-semibold"
                >
                  Directions
                </button>
              </div>
            </div>
          )}
        </BottomSheet>
      )}
      
      {/* ✨ MOBILE BOTTOM INPUT - Quick Atlas search on mobile */}
      {isMobile && mapLoaded && !showMobileSheet && (
        <div className="fixed bottom-0 left-0 right-0 z-30 safe-area-bottom">
          <div className="bg-black/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 pb-6">
            <input
              type="text"
              placeholder="Refine search... (e.g. 'closer', 'open now')"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = e.currentTarget.value
                  if (query.trim()) {
                    handleSearch(query)
                    e.currentTarget.value = ''
                  }
                }
              }}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 text-base focus:outline-none focus:ring-2 focus:ring-[#00d083] focus:border-transparent"
            />
          </div>
        </div>
      )}
      
    </div>
    </>
  )
}
