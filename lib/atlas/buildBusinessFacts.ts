import type { Business } from '@/components/atlas/AtlasMode'
import type { Coordinates } from '@/lib/location/useUserLocation'
import { parseStructuredBusinessHours } from '@/lib/utils/business-hours'

export interface FactChip {
  icon: string
  label: string
  priority: number
}

interface BuildFactsOptions {
  userLocation?: Coordinates | null
  transportMode?: 'walking' | 'driving' | 'either'
  hydratedData?: any
  isMobile?: boolean
}

const WALKING_PACE_M_PER_MIN = 80

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

function formatWalkTime(meters: number): string {
  const mins = Math.round(meters / WALKING_PACE_M_PER_MIN)
  if (mins < 1) return '1 min walk'
  return `${mins} min walk`
}

function haversineDistance(a: Coordinates, b: { latitude: number; longitude: number }): number {
  const R = 6371e3
  const p1 = a.lat * Math.PI / 180
  const p2 = b.latitude * Math.PI / 180
  const dp = (b.latitude - a.lat) * Math.PI / 180
  const dl = (b.longitude - a.lng) * Math.PI / 180
  const x = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2)
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

/**
 * Parse open/closed status from hydrated business data.
 * Supports Supabase structured format: { monday: { open, close, closed }, ... }
 */
function parseOpenStatus(hydrated: any): { isOpen: boolean; label: string } | null {
  const hours = hydrated?.opening_hours
  if (!hours) return null

  try {
    const parsed = typeof hours === 'string' ? JSON.parse(hours) : hours
    if (!parsed || typeof parsed !== 'object') return null

    const result = parseStructuredBusinessHours(parsed)

    if (result.displayText === 'Hours not available') return null

    return {
      isOpen: result.isOpen,
      label: result.isOpen
        ? result.nextChange ? `Open · ${result.nextChange}` : 'Open now'
        : result.nextChange ? `Closed · ${result.nextChange}` : 'Closed'
    }
  } catch {
    return null
  }
}

export function buildBusinessFacts(
  business: Business,
  options: BuildFactsOptions = {}
): FactChip[] {
  const {
    userLocation,
    transportMode = 'walking',
    hydratedData,
    isMobile = false
  } = options

  const chips: FactChip[] = []

  // 1. Open/Closed status
  const openStatus = parseOpenStatus(hydratedData)
  if (openStatus) {
    chips.push({ icon: '🕒', label: openStatus.label, priority: 1 })
  }

  // 2. Distance + walk time (only if user location available)
  if (userLocation && business.latitude && business.longitude) {
    const dist = haversineDistance(userLocation, business)
    const distLabel = formatDistance(dist)
    if (transportMode === 'walking' && dist < 5000) {
      chips.push({ icon: '📍', label: `${distLabel} · ${formatWalkTime(dist)}`, priority: 2 })
    } else {
      chips.push({ icon: '📍', label: distLabel, priority: 2 })
    }
  }

  // 3. Rating + review count
  if (business.rating && business.rating > 0) {
    const countLabel = business.review_count ? ` (${business.review_count})` : ''
    chips.push({ icon: '⭐', label: `${business.rating.toFixed(1)}${countLabel}`, priority: 3 })
  }

  // 4. Category (humanized)
  if (business.display_category) {
    chips.push({ icon: '🍽', label: business.display_category, priority: 4 })
  }

  // 5. Tier badge: "Qwikker Pick" for Tier 1 only
  if (business.isPaid) {
    chips.push({ icon: '🏷', label: 'Qwikker Pick', priority: 5 })
  }

  // 6. Loyalty badge (with user progress if available)
  if (business.hasLoyalty) {
    if (business.userStampsRemaining != null && business.userStampsRemaining <= 3 && business.userStampsRemaining > 0) {
      chips.push({ icon: '🎯', label: `${business.userStampsRemaining} away from free reward!`, priority: 1.5 })
    } else if (business.userStamps != null && business.userStamps > 0) {
      chips.push({ icon: '🎟', label: `${business.userStamps}/${business.loyaltyThreshold} stamps`, priority: 5 })
    } else {
      chips.push({ icon: '🎟', label: 'Loyalty card available', priority: 5.5 })
    }
  }

  // 7. Offers/events flags (only if hydration data confirms)
  if (hydratedData?.has_offers) {
    chips.push({ icon: '🎫', label: 'Offers available', priority: 6 })
  }

  // 8. Qwikker Vibes (only if 5+ vibes from hydration)
  if (hydratedData?.vibes?.total_vibes >= 5) {
    chips.push({ icon: '💚', label: `${hydratedData.vibes.positive_percentage}% positive`, priority: 5.5 })
  }

  // Sort by priority and cap
  chips.sort((a, b) => a.priority - b.priority)
  const maxChips = isMobile ? 4 : 6
  return chips.slice(0, maxChips)
}
