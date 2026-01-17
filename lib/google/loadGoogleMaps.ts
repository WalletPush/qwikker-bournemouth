/**
 * Singleton Google Maps JS loader
 * 
 * Ensures Google Maps script is loaded only once across the entire app,
 * preventing "included multiple times" errors and duplicate script tags.
 * 
 * Safe for:
 * - React Strict Mode (won't load twice)
 * - Multiple components using Google Maps
 * - Route transitions
 */

declare global {
  interface Window {
    __qwikkerGoogleMapsPromise?: Promise<void>
  }
}

/**
 * Load Google Maps JavaScript API with Places library
 * 
 * @param apiKey - Google Places API key
 * @returns Promise that resolves when Maps is loaded
 * 
 * @example
 * await loadGoogleMaps('AIza...')
 * // Now window.google.maps.places is available
 */
export function loadGoogleMaps(apiKey: string): Promise<void> {
  // Server-side: no-op
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  // Already fully loaded: done
  if (window.google?.maps?.places) {
    return Promise.resolve()
  }

  // Already loading: reuse the same promise
  if (window.__qwikkerGoogleMapsPromise) {
    return window.__qwikkerGoogleMapsPromise
  }

  // Start loading
  window.__qwikkerGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const SCRIPT_ID = 'qwikker-google-maps'

    // If script tag already exists, wait for it rather than adding another
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')), { once: true })
      return
    }

    // Create and append script tag
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      if (window.google?.maps?.places) {
        resolve()
      } else {
        reject(new Error('Google Maps loaded but places library not available'))
      }
    }

    script.onerror = () => {
      reject(new Error('Google Maps script failed to load'))
    }

    document.head.appendChild(script)
  }).finally(() => {
    // If it failed, allow retry next time
    if (!window.google?.maps?.places) {
      window.__qwikkerGoogleMapsPromise = undefined
    }
  })

  return window.__qwikkerGoogleMapsPromise
}

/**
 * Check if Google Maps is already loaded
 */
export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.google?.maps?.places
}
