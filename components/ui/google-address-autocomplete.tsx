'use client'

import { useEffect, useRef, useState } from 'react'

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
}

export function GoogleAddressAutocomplete({ 
  onAddressSelected, 
  onChange,
  value,
  disabled, 
  className 
}: GoogleAddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load Google Places API script
    const loadGooglePlaces = () => {
      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        initAutocomplete()
        return
      }

      // Check for API key
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
      if (!apiKey) {
        setError('Google Places API key not configured')
        setIsLoading(false)
        return
      }

      // Load script
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => initAutocomplete()
      script.onerror = () => {
        setError('Failed to load Google Places API')
        setIsLoading(false)
      }
      document.head.appendChild(script)
    }

    const initAutocomplete = () => {
      if (!inputRef.current) return

      try {
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'gb' },
          fields: ['formatted_address', 'address_components']
        })

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
  }, [onAddressSelected])

  if (error) {
    // Silently fall back to regular input if Google Places fails
    return (
      <>
        <input
          ref={inputRef}
          type="text"
          placeholder="Start typing your address..."
          value={value}
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
        value={value}
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
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: {
              types?: string[]
              componentRestrictions?: { country: string }
              fields?: string[]
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
