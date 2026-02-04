/**
 * Smart distance formatter for Atlas UI
 * 
 * Rules:
 * - Close (< 5km): "5 min walk"
 * - Medium (5-50km): "12 miles away"
 * - Far (> 50km): "Quite far from you (150 miles)"
 */

interface DistanceFormatResult {
  text: string
  isWalkable: boolean
  distanceKm: number
}

export function formatDistance(
  distanceKm: number,
  includeIcon?: boolean
): DistanceFormatResult {
  const icon = includeIcon ? '📍 ' : ''
  
  // Close: walkable distance (< 5km)
  if (distanceKm < 5) {
    const walkingMinutes = Math.round(distanceKm / 0.08) // 4.8 km/h = 0.08 km/min
    return {
      text: `${icon}~${walkingMinutes} min walk`,
      isWalkable: true,
      distanceKm
    }
  }
  
  // Medium: driving distance (5-50km)
  if (distanceKm < 50) {
    const miles = (distanceKm * 0.621371).toFixed(1)
    return {
      text: `${icon}${miles} miles away`,
      isWalkable: false,
      distanceKm
    }
  }
  
  // Far: too far for local recommendations (> 50km)
  const miles = Math.round(distanceKm * 0.621371)
  return {
    text: `${icon}Quite far from you (${miles} miles)`,
    isWalkable: false,
    distanceKm
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const R = 6371 // Earth's radius in km
  const dLat = (to.lat - from.lat) * Math.PI / 180
  const dLng = (to.lng - from.lng) * Math.PI / 180
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
