/**
 * Shared place validation pipeline used by preview, text-search, and import routes.
 *
 * Three validation levels:
 *   'full'     – preview route: denylist + rating + reviews + closed + distance + category
 *   'light'    – text-search:   denylist + closed  (admin intentionally searched for this)
 *   'category' – import route:  denylist + closed + category  (safety net at insert time)
 */

import {
  type CategoryConfig,
  GLOBAL_DENIED_TYPES,
  validatePlaceCategory,
} from '@/lib/constants/category-mapping'

export interface PlaceInput {
  name: string
  types?: string[]
  primaryType?: string
  rating?: number
  reviewCount?: number
  businessStatus?: string
  lat?: number
  lng?: number
}

export interface ValidationOptions {
  /** Minimum Google rating (e.g. 4.4). Skipped if omitted. */
  minRating?: number
  /** Minimum review count (e.g. 10). Skipped if omitted. */
  minReviews?: number
  /** Category config to validate against. Skipped if omitted. */
  categoryConfig?: CategoryConfig
  /** Whether to skip lodging unless category is hotel. Default true. */
  excludeLodging?: boolean
  /** Search center + max radius for distance check. Skipped if omitted. */
  distanceCheck?: { centerLat: number; centerLng: number; radiusMeters: number }
}

export interface ValidationResult {
  valid: boolean
  rejectReason?: string
  matchReason?: string
}

/**
 * Run the full validation pipeline on a single place.
 * Each check is opt-in via `options` so callers choose their strictness level.
 */
export function validatePlace(place: PlaceInput, options: ValidationOptions = {}): ValidationResult {
  const placeTypes = new Set((place.types || []).map(t => t.toLowerCase()))

  // 1. Global denylist (always runs)
  for (const denied of GLOBAL_DENIED_TYPES) {
    if (placeTypes.has(denied)) {
      return { valid: false, rejectReason: `denied:${denied}` }
    }
  }

  // 2. Lodging exclusion (default on, unless searching hotels)
  if (options.excludeLodging !== false && placeTypes.has('lodging')) {
    return { valid: false, rejectReason: 'lodging' }
  }

  // 3. Closed status (always runs)
  if (place.businessStatus === 'CLOSED_PERMANENTLY' || place.businessStatus === 'CLOSED_TEMPORARILY') {
    return { valid: false, rejectReason: place.businessStatus }
  }

  // 4. Minimum rating
  if (options.minRating != null && place.rating != null && place.rating < options.minRating) {
    return { valid: false, rejectReason: `rating:${place.rating}<${options.minRating}` }
  }

  // 5. Minimum reviews
  if (options.minReviews != null) {
    const count = place.reviewCount ?? 0
    if (count < options.minReviews) {
      return { valid: false, rejectReason: `reviews:${count}<${options.minReviews}` }
    }
  }

  // 6. Distance check
  if (options.distanceCheck && place.lat != null && place.lng != null) {
    const dist = haversineMeters(
      options.distanceCheck.centerLat,
      options.distanceCheck.centerLng,
      place.lat,
      place.lng
    )
    if (dist > options.distanceCheck.radiusMeters) {
      return { valid: false, rejectReason: `distance:${Math.round(dist)}m>${options.distanceCheck.radiusMeters}m` }
    }
  }

  // 7. Category validation (requiredAnyTypes + excludedTypes + name keywords)
  if (options.categoryConfig) {
    const catResult = validatePlaceCategory(
      { name: place.name, types: place.types, primaryType: place.primaryType },
      options.categoryConfig
    )
    if (!catResult.valid) {
      return { valid: false, rejectReason: catResult.rejectReason }
    }
    return { valid: true, matchReason: catResult.matchReason }
  }

  return { valid: true }
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const p1 = lat1 * Math.PI / 180
  const p2 = lat2 * Math.PI / 180
  const dp = (lat2 - lat1) * Math.PI / 180
  const dl = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
