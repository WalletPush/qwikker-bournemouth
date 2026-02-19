import type { Business } from '@/components/atlas/AtlasMode'
import type { Coordinates } from '@/lib/location/useUserLocation'

export interface FactChip {
  icon: string
  label: string
  priority: number
}

interface BuildFactsOptions {
  userLocation?: Coordinates | null
  transportMode?: 'walking' | 'driving' | 'either'
  now?: Date
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

function parseOpenStatus(hydrated: any, now: Date): { isOpen: boolean; closesAt: string | null } | null {
  if (!hydrated?.opening_hours) return null

  try {
    const hours = typeof hydrated.opening_hours === 'string'
      ? JSON.parse(hydrated.opening_hours)
      : hydrated.opening_hours

    if (!hours || !Array.isArray(hours.periods)) return null

    const dayIndex = now.getDay()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    for (const period of hours.periods) {
      if (period.open?.day === dayIndex) {
        const openMin = (period.open.hours || 0) * 60 + (period.open.minutes || 0)
        const closeMin = period.close
          ? (period.close.hours || 0) * 60 + (period.close.minutes || 0)
          : 24 * 60

        if (currentMinutes >= openMin && currentMinutes < closeMin) {
          const closeHour = period.close?.hours
          const closeMinute = period.close?.minutes
          const closesAt = closeHour != null
            ? `${String(closeHour).padStart(2, '0')}:${String(closeMinute || 0).padStart(2, '0')}`
            : null
          return { isOpen: true, closesAt }
        }
      }
    }
    return { isOpen: false, closesAt: null }
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
    now = new Date(),
    hydratedData,
    isMobile = false
  } = options

  const chips: FactChip[] = []

  // 1. Open/Closed status (only if hours available)
  const openStatus = parseOpenStatus(hydratedData, now)
  if (openStatus) {
    if (openStatus.isOpen) {
      const label = openStatus.closesAt ? `Open · Closes ${openStatus.closesAt}` : 'Open now'
      chips.push({ icon: '🕒', label, priority: 1 })
    } else {
      chips.push({ icon: '🕒', label: 'Closed', priority: 1 })
    }
  } else if (hydratedData && !hydratedData.opening_hours) {
    chips.push({ icon: '🕒', label: 'Hours not listed', priority: 1 })
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

  // 6. Offers/events flags (only if hydration data confirms)
  if (hydratedData?.has_offers) {
    chips.push({ icon: '🎫', label: 'Offers available', priority: 6 })
  }

  // Sort by priority and cap
  chips.sort((a, b) => a.priority - b.priority)
  const maxChips = isMobile ? 4 : 6
  return chips.slice(0, maxChips)
}
