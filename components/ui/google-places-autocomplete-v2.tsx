'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from './input'
import { Label } from './label'
import { loadGoogleMaps } from '@/lib/google/loadGoogleMaps'

interface TenantConfig {
  ok: boolean
  city?: string
  googlePlacesPublicKey?: string
  country?: string
  center?: { lat: number; lng: number } | null
  onboardingRadiusMeters?: number
  message?: string
}

interface GooglePlacesAutocompleteProps {
  onPlaceSelected: (placeId: string) => void
  disabled?: boolean
  className?: string
  cityOverride?: string // DEV ONLY: allows ?city=X on localhost/vercel
}

export function GooglePlacesAutocompleteV2({ 
  onPlaceSelected, 
  disabled, 
  className,
  cityOverride
}: GooglePlacesAutocompleteProps) {
  // CONTROLLED INPUT (never undefined)
  const [inputValue, setInputValue] = useState<string>('')
  const [predictions, setPredictions] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Tenant config
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null)
  
  // Google Maps API services
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  
  const isDev = process.env.NODE_ENV !== 'production'
  
  // Fetch tenant configuration on mount
  useEffect(() => {
    async function loadTenantConfig() {
      try {
        // Build URL with optional city override for DEV
        let url = '/api/tenant/config'
        if (cityOverride) {
          url += `?city=${encodeURIComponent(cityOverride)}`
        }
        
        const response = await fetch(url)
        const config: TenantConfig = await response.json()
        
        if (isDev) {
          console.debug('[GooglePlaces] Tenant config loaded:', {
            ok: config.ok,
            city: config.city,
            hasKey: !!config.googlePlacesPublicKey,
            hasCenter: !!config.center,
            radius: config.onboardingRadiusMeters,
            country: config.country
          })
        }
        
        if (!config.ok || !config.googlePlacesPublicKey) {
          // Clean UX: don't expose technical details
          setError('unavailable')
          setIsLoading(false)
          return
        }
        
        setTenantConfig(config)
        
        // Load Google Maps JS API using singleton loader
        try {
          await loadGoogleMaps(config.googlePlacesPublicKey)
          
          if (isDev) {
            console.debug('[GooglePlaces] Google Maps API loaded successfully')
          }
          
          initializeServices()
          setIsLoading(false)
        } catch (loadErr) {
          console.error('[GooglePlaces] Failed to load Google Maps:', loadErr)
          setError('unavailable')
          setIsLoading(false)
        }
        
      } catch (err) {
        if (isDev) {
          console.error('[GooglePlaces] Failed to load tenant config:', err)
        }
        setError('unavailable')
        setIsLoading(false)
      }
    }
    
    loadTenantConfig()
  }, [cityOverride, isDev])
  
  // Initialize Google Places services
  function initializeServices() {
    if (!window.google?.maps?.places) {
      console.error('[GooglePlaces] Google Maps API not available')
      return
    }
    
    try {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
      
      // Create a dummy div for PlacesService (required by Google)
      const dummyDiv = document.createElement('div')
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
      
      if (isDev) {
        console.debug('[GooglePlaces] Services initialized')
      }
    } catch (err) {
      console.error('[GooglePlaces] Failed to initialize services:', err)
      setError('Failed to initialize Places services')
    }
  }
  
  // Handle input change and fetch predictions
  useEffect(() => {
    // Don't search if:
    // - Input too short
    // - No service available
    // - No tenant config
    if (inputValue.length < 3 || !autocompleteServiceRef.current || !tenantConfig) {
      setPredictions([])
      setShowDropdown(false)
      return
    }
    
    const fetchPredictions = async () => {
      try {
        const request: google.maps.places.AutocompletionRequest = {
          input: inputValue,
          types: ['establishment'],
          componentRestrictions: { country: tenantConfig.country || 'gb' },
        }
        
        // Add location bias if center is configured
        if (tenantConfig.center && tenantConfig.onboardingRadiusMeters) {
          request.locationBias = {
            center: tenantConfig.center,
            radius: tenantConfig.onboardingRadiusMeters
          } as any
          request.strictBounds = true
        }
        
        autocompleteServiceRef.current!.getPlacePredictions(
          request,
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              if (isDev) {
                console.debug(`[GooglePlaces] Found ${results.length} predictions for "${inputValue}"`)
              }
              setPredictions(results)
              setShowDropdown(true)
            } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              if (isDev) {
                console.debug(`[GooglePlaces] No results for "${inputValue}"`)
              }
              setPredictions([])
              setShowDropdown(false)
            } else {
              console.error('[GooglePlaces] Prediction error:', status)
              setPredictions([])
              setShowDropdown(false)
            }
          }
        )
      } catch (err) {
        console.error('[GooglePlaces] Prediction fetch error:', err)
        setPredictions([])
        setShowDropdown(false)
      }
    }
    
    // Debounce
    const timeoutId = setTimeout(fetchPredictions, 300)
    return () => clearTimeout(timeoutId)
  }, [inputValue, tenantConfig, isDev])
  
  // Handle prediction selection
  function handleSelectPrediction(placeId: string, description: string) {
    setInputValue(description)
    setShowDropdown(false)
    setPredictions([])
    
    if (isDev) {
      console.debug(`[GooglePlaces] Place selected: ${description} (${placeId})`)
    }
    
    onPlaceSelected(placeId)
  }
  
  // Render error state (clean UX: no technical details)
  if (error) {
    return (
      <div className={className}>
        <Label htmlFor="google-search" className="text-white mb-2 block">
          Search for your business on Google
        </Label>
        <div className="rounded-lg border border-blue-800/50 bg-blue-950/20 p-4">
          <p className="text-blue-200 text-sm">
            Google search is temporarily unavailable.
          </p>
          <p className="text-blue-300/70 text-xs mt-2">
            Please continue with "Create Listing" below.
          </p>
        </div>
      </div>
    )
  }
  
  // Render loading state
  if (isLoading) {
    return (
      <div className={className}>
        <Label htmlFor="google-search" className="text-white mb-2 block">
          Search for your business on Google <span className="text-red-500">*</span>
        </Label>
        <Input
          id="google-search"
          type="text"
          placeholder="Loading..."
          value=""
          disabled
          className="bg-slate-900 border-slate-600 text-white h-14 text-lg"
        />
      </div>
    )
  }
  
  return (
    <div className={className}>
      <Label htmlFor="google-search" className="text-white mb-2 block">
        Search for your business on Google <span className="text-red-500">*</span>
      </Label>
      
      <div className="relative">
        <Input
          id="google-search"
          type="text"
          placeholder="Start typing your business name..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value ?? '')}
          disabled={disabled}
          className="bg-slate-900 border-slate-600 text-white h-14 text-lg focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
          autoComplete="off"
        />
        
        {/* Predictions dropdown */}
        {showDropdown && predictions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => handleSelectPrediction(prediction.place_id, prediction.description)}
                className="w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
              >
                <div className="text-white text-sm font-medium">
                  {prediction.structured_formatting?.main_text || prediction.description}
                </div>
                <div className="text-slate-400 text-xs mt-0.5">
                  {prediction.structured_formatting?.secondary_text || ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <p className="text-xs text-slate-400 mt-2">
        💡 Start typing and select your business from the dropdown
      </p>
    </div>
  )
}

// Type declarations for Google Maps API
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          AutocompleteService: new () => google.maps.places.AutocompleteService
          PlacesService: new (attrContainer: HTMLDivElement) => google.maps.places.PlacesService
          PlacesServiceStatus: {
            OK: string
            ZERO_RESULTS: string
            [key: string]: string
          }
        }
      }
    }
  }
}

namespace google.maps.places {
  interface AutocompletionRequest {
    input: string
    types?: string[]
    componentRestrictions?: { country: string }
    locationBias?: { center: { lat: number; lng: number }; radius: number }
    strictBounds?: boolean
  }
  
  interface AutocompletePrediction {
    place_id: string
    description: string
    structured_formatting?: {
      main_text: string
      secondary_text: string
    }
  }
  
  interface AutocompleteService {
    getPlacePredictions(
      request: AutocompletionRequest,
      callback: (results: AutocompletePrediction[] | null, status: string) => void
    ): void
  }
  
  interface PlacesService {
    // Placeholder for PlacesService (not used in this component)
  }
}
