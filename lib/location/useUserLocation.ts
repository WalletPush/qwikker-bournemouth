/**
 * useUserLocation Hook
 * 
 * Manages user's geolocation with:
 * - Lazy permission request (only when needed)
 * - localStorage caching (30 minutes)
 * - Graceful fallback to city center
 * - Permission status tracking
 */

import { useState, useCallback, useEffect } from 'react'

export interface Coordinates {
  lat: number
  lng: number
}

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'

export interface UseUserLocationReturn {
  status: LocationStatus
  coords: Coordinates | null
  error: string | null
  requestPermission: () => Promise<void>
  clearLocation: () => void
}

const CACHE_KEY = 'qwikker_user_location'
const CACHE_DURATION_MS = 30 * 60 * 1000 // 30 minutes

interface CachedLocation {
  coords: Coordinates
  timestamp: number
}

function getCachedLocation(): Coordinates | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const parsed: CachedLocation = JSON.parse(cached)
    const age = Date.now() - parsed.timestamp
    
    if (age > CACHE_DURATION_MS) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    return parsed.coords
  } catch {
    return null
  }
}

function setCachedLocation(coords: Coordinates): void {
  if (typeof window === 'undefined') return
  
  try {
    const cached: CachedLocation = {
      coords,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
  } catch (err) {
    console.warn('[Location] Failed to cache location:', err)
  }
}

export function useUserLocation(fallbackCenter?: Coordinates): UseUserLocationReturn {
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [coords, setCoords] = useState<Coordinates | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load cached location on mount
  useEffect(() => {
    const cached = getCachedLocation()
    if (cached) {
      setCoords(cached)
      setStatus('granted')
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable')
      setError('Geolocation is not supported by your browser')
      // DON'T set fallback - keep coords null
      return
    }

    setStatus('requesting')
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, // More accurate for Atlas
          timeout: 6000, // Faster timeout for better UX
          maximumAge: CACHE_DURATION_MS
        })
      })

      const userCoords: Coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[Atlas] User location granted:', userCoords)
      }

      setCoords(userCoords)
      setStatus('granted')
      setCachedLocation(userCoords)
      
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Atlas] Location request failed:', err.code, err.message)
      }
      
      if (err.code === 1) {
        // Permission denied
        setStatus('denied')
        setError('Location permission denied')
      } else {
        setStatus('denied')
        setError('Could not get your location')
      }
      
      // DON'T set fallback coords - keep coords null so recenter won't appear
      // (Map will stay at city center but won't pretend it's user location)
    }
  }, [fallbackCenter])

  const clearLocation = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY)
    }
    setCoords(null)
    setStatus('idle')
    setError(null)
  }, [])

  return {
    status,
    coords,
    error,
    requestPermission,
    clearLocation
  }
}

/**
 * Calculate walking time based on straight-line distance
 * Assumes 4.8 km/h walking speed
 */
export function calculateWalkingTime(from: Coordinates, to: Coordinates): number {
  const R = 6371 // Earth's radius in km
  const dLat = (to.lat - from.lat) * Math.PI / 180
  const dLng = (to.lng - from.lng) * Math.PI / 180
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distanceKm = R * c
  
  // Walking speed: 4.8 km/h = 0.08 km/min
  const walkingMinutes = distanceKm / 0.08
  
  return Math.round(walkingMinutes)
}
