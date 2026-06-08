'use client'

import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps, isGoogleMapsLoaded } from '@/lib/google/loadGoogleMaps'

interface GoogleAddressAutocompleteProps {
  onAddressSelected: (addressData: {
    formattedAddress: string
    town: string
    postcode: string
  }) => void
  onChange?: (value: string) => void
  value?: string
  disabled?: boolean
  className?: string
  cityOverride?: string // DEV ONLY: allows ?city=X on localhost/vercel
}

interface TenantConfig {
  ok: boolean
  googlePlacesPublicKey?: string
  country?: string
  center?: { lat: number; lng: number } | null
  onboardingRadiusMeters?: number
}

export function GoogleAddressAutocomplete({ 
  onAddressSelected, 
  onChange,
  value,
  disabled, 
  className,
  cityOverride
}: GoogleAddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load tenant config first so we use the FRANCHISE's Google key + country + center
    // (not a global env key, and not a hardcoded UK restriction). This keeps each
    // franchise billing their own Google account and scopes suggestions to their city.
    const loadGooglePlaces = async () => {
      try {
        let url = '/api/tenant/config'
        if (cityOverride) {
          url += `?city=${encodeURIComponent(cityOverride)}`
        }

        const response = await fetch(url)
        const config: TenantConfig = await response.json()

        if (!config.ok || !config.googlePlacesPublicKey) {
          setError('unavailable')
          setIsLoading(false)
          return
        }

        if (!isGoogleMapsLoaded()) {
          await loadGoogleMaps(config.googlePlacesPublicKey)
        }
        initAutocomplete(config)
      } catch (err) {
        console.error('[GoogleAddressAutocomplete] Failed to load Google Maps:', err)
        setError('unavailable')
        setIsLoading(false)
      }
    }

    const initAutocomplete = (config: TenantConfig) => {
      if (!inputRef.current) return

      try {
        const options: any = {
          types: ['address'],
          fields: ['formatted_address', 'address_components']
        }

        // Only restrict by country when one is configured for this franchise
        // (never hardcode 'gb' — that forces UK-only results for non-UK cities).
        if (config.country) {
          options.componentRestrictions = { country: config.country }
        }

        // Bias suggestions toward the franchise's city center when available.
        if (config.center && config.onboardingRadiusMeters && window.google.maps.Circle) {
          const circle = new window.google.maps.Circle({
            center: config.center,
            radius: config.onboardingRadiusMeters
          })
          options.bounds = circle.getBounds()
        }

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, options)

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          
          if (place.formatted_address && place.address_components) {
            // Extract town and postcode from address components
            let town = ''
            let postcode = ''
            
            for (const component of place.address_components) {
              const types = component.types
              
              if (types.includes('postal_town') || types.includes('locality')) {
                town = component.long_name
              }
              
              if (types.includes('postal_code')) {
                postcode = component.long_name
              }
            }
            
            console.log('📍 Address selected:', {
              formattedAddress: place.formatted_address,
              town,
              postcode
            })
            
            onAddressSelected({
              formattedAddress: place.formatted_address,
              town,
              postcode
            })
          }
        })

        setIsLoading(false)
      } catch (err) {
        console.error('Error initializing address autocomplete:', err)
        setError('Failed to initialize autocomplete')
        setIsLoading(false)
      }
    }

    loadGooglePlaces()
  }, [onAddressSelected, cityOverride])

  if (error) {
    // Silently fall back to regular input if Google Places fails
    return (
      <>
        <input
          ref={inputRef}
          type="text"
          placeholder="Start typing your address..."
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={className || "h-14 text-lg bg-slate-900 border-slate-600 rounded-lg focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all w-full px-4 text-white"}
        />
        <p className="text-xs text-slate-400 mt-2">
          💡 Google autocomplete temporarily unavailable - please enter address manually
        </p>
      </>
    )
  }

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        placeholder={isLoading ? "Loading..." : "Start typing your address..."}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || isLoading}
        className={className || "h-14 text-lg bg-slate-900 border-slate-600 rounded-lg focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all w-full px-4 text-white"}
      />
      <p className="text-xs text-slate-400 mt-2">
        💡 Start typing and select from the dropdown - we'll auto-fill town & postcode
      </p>
    </>
  )
}

// Type declarations for Google Maps API
declare global {
  interface Window {
    google: {
      maps: {
        Circle: new (opts: { center: { lat: number; lng: number }; radius: number }) => {
          getBounds: () => unknown
        }
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: {
              types?: string[]
              componentRestrictions?: { country: string }
              fields?: string[]
              bounds?: unknown
            }
          ) => {
            addListener: (event: string, callback: () => void) => void
            getPlace: () => {
              formatted_address?: string
              address_components?: Array<{
                long_name: string
                short_name: string
                types: string[]
              }>
            }
          }
        }
      }
    }
  }
}
