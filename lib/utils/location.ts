/**
 * Canonical location utilities
 * 
 * SHIP-SAFE RULE: All location handling uses { latitude, longitude } shape
 * This prevents "distance works sometimes" bugs from shape mismatches
 */

export interface CanonicalLocation {
  latitude: number
  longitude: number
}

/**
 * Normalize any location shape to canonical { latitude, longitude }
 * 
 * ✅ SHIP-SAFE: This is the ONLY way to consume location data
 * Use this before ANY distance math or reason tagging
 * 
 * @returns Canonical location or null if invalid
 */
export function normalizeLocation(
  location: any
): CanonicalLocation | null {
  if (!location) return null
  
  // Already canonical
  if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
    return { latitude: location.latitude, longitude: location.longitude }
  }
  
  // Mapbox style { lat, lng }
  if (typeof location.lat === 'number' && typeof location.lng === 'number') {
    return { latitude: location.lat, longitude: location.lng }
  }
  
  // Invalid
  console.warn('⚠️ Invalid location shape:', location)
  return null
}

/**
 * Calculate distance between two locations using Haversine formula
 * 
 * @returns Distance in meters
 */
export function calculateDistance(
  from: CanonicalLocation,
  to: CanonicalLocation
): number {
  const R = 6371e3 // Earth radius in meters
  const φ1 = from.latitude * Math.PI / 180
  const φ2 = to.latitude * Math.PI / 180
  const Δφ = (to.latitude - from.latitude) * Math.PI / 180
  const Δλ = (to.longitude - from.longitude) * Math.PI / 180
  
  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c // Distance in meters
}

/**
 * Validate UUID format (basic check for ship-safety)
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id) && id.length <= 36
}
