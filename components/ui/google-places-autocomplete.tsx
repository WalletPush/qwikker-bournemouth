'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from './input'
import { Label } from './label'

interface GooglePlacesAutocompleteProps {
  onPlaceSelected: (placeId: string) => void
  disabled?: boolean
  className?: string
}

export function GooglePlacesAutocomplete({ 
  onPlaceSelected, 
  disabled, 
  className 
}: GooglePlacesAutocompleteProps) {
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
          types: ['establishment'],
          fields: ['place_id', 'name', 'formatted_address']
        })

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          
          if (place.place_id) {
            console.log('📍 Place selected:', place.name, place.place_id)
            onPlaceSelected(place.place_id)
          }
        })

        setIsLoading(false)
      } catch (err) {
        console.error('Error initializing autocomplete:', err)
        setError('Failed to initialize autocomplete')
        setIsLoading(false)
      }
    }

    loadGooglePlaces()
  }, [onPlaceSelected])

  if (error) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
        <p className="text-slate-300 text-sm">
          Google verification is temporarily unavailable.
        </p>
        <p className="text-slate-400 text-xs mt-2">
          Please use "Create Listing" to continue with manual entry.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <Label htmlFor="google-search" className="text-white mb-2 block">
        Search for your business on Google <span className="text-red-500">*</span>
      </Label>
      <Input
        ref={inputRef}
        id="google-search"
        type="text"
        placeholder={isLoading ? "Loading Google Places..." : "Start typing your business name..."}
        disabled={disabled || isLoading}
        className="bg-slate-900 border-slate-600 text-white h-14 text-lg focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
      />
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
          Autocomplete: new (
            input: HTMLInputElement,
            options?: {
              types?: string[]
              fields?: string[]
            }
          ) => {
            addListener: (event: string, callback: () => void) => void
            getPlace: () => {
              place_id?: string
              name?: string
              formatted_address?: string
            }
          }
        }
      }
    }
  }
}
