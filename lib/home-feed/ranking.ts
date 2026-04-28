/**
 * Home Feed Ranking Engine
 *
 * All ranking, scoring, filtering, and deduplication logic lives here.
 * Written once, used by the feed builder. No ranking logic in UI components.
 */

import type { TimeOfDay, BusinessTier } from './types'
import { getPlaceholderUrl } from '@/lib/placeholders/getPlaceholderImage'

const isDev = process.env.NODE_ENV === 'development'

// Tier weight mapping: Spotlight > Featured > Starter > Free
const TIER_WEIGHTS: Record<string, number> = {
  spotlight: 40,
  featured: 30,
  starter: 15,
  free: 5,
}

const PREMIUM_THRESHOLD = 3

export function getTierWeight(plan: string | null, status: string | null): number {
  if (!plan || plan === 'free') {
    if (status === 'claimed_free') return TIER_WEIGHTS.free
    if (status === 'unclaimed') return 1
    return TIER_WEIGHTS.free
  }
  return TIER_WEIGHTS[plan] ?? TIER_WEIGHTS.free
}

/**
 * Check if hybrid mode is active (fewer than 3 premium businesses)
 */
export function isHybridMode(premiumCount: number): boolean {
  return premiumCount < PREMIUM_THRESHOLD
}

/**
 * Determine whether a business should be included in a premium section
 * based on hybrid mode status.
 */
export function shouldIncludeInPremiumSection(
  plan: string | null,
  status: string | null,
  hybridMode: boolean
): boolean {
  if (plan === 'spotlight' || plan === 'featured') return true
  if (!hybridMode) return false
  // In hybrid mode, include lower tiers
  if (plan === 'starter') return true
  if (status === 'claimed_free') return true
  if (status === 'unclaimed') return true
  return false
}

/**
 * For Must-Try Dishes: premium tiers always included, claimed_free
 * included as filler (scored lowest so premium always shows first),
 * unclaimed always excluded (unverified data).
 */
export function shouldIncludeInDishesSection(
  plan: string | null,
  status: string | null,
  _hybridMode: boolean
): boolean {
  if (status === 'unclaimed') return false
  if (plan === 'spotlight' || plan === 'featured' || plan === 'starter') return true
  if (status === 'claimed_free') return true
  return false
}

/**
 * Compute composite score for a business/offer/event.
 * preferenceBoost is calculated by section builders based on category/dietary/loyalty match.
 */
export function computeCompositeScore(params: {
  plan: string | null
  status: string | null
  latitude?: number | null
  longitude?: number | null
  userLat?: number | null
  userLng?: number | null
  createdAt?: string | null
  offerEndDate?: string | null
  preferenceBoost?: number
}): number {
  const { plan, status, latitude, longitude, userLat, userLng, createdAt, offerEndDate, preferenceBoost } = params

  let score = getTierWeight(plan, status)

  // Proximity bonus (0-20): closer = higher score
  if (latitude && longitude && userLat && userLng) {
    const distKm = haversineDistance(userLat, userLng, latitude, longitude)
    // Max bonus at 0km, zero bonus at 10km+
    const proximityBonus = Math.max(0, 20 - (distKm * 2))
    score += proximityBonus

    if (isDev) {
      console.log(`  [ranking] proximity: ${distKm.toFixed(1)}km → +${proximityBonus.toFixed(1)}`)
    }
  }

  // Freshness bonus (0-10): recently created items score slightly higher
  if (createdAt) {
    const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
    // Max bonus for items < 24h old, decays over 7 days
    const freshness = Math.max(0, 10 - (ageHours / 168) * 10)
    score += freshness
  }

  // Urgency bonus (0-15): offers expiring within 24h get a boost
  if (offerEndDate) {
    const hoursUntilExpiry = (new Date(offerEndDate).getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntilExpiry > 0 && hoursUntilExpiry <= 24) {
      const urgency = 15 * (1 - hoursUntilExpiry / 24)
      score += urgency

      if (isDev) {
        console.log(`  [ranking] urgency: expires in ${hoursUntilExpiry.toFixed(1)}h → +${urgency.toFixed(1)}`)
      }
    }
  }

  // Preference boost: category match, dietary, loyalty — computed by section builders
  if (preferenceBoost) {
    score += preferenceBoost
    if (isDev) {
      console.log(`  [ranking] preference boost: +${preferenceBoost}`)
    }
  }

  return score
}

/**
 * Haversine distance between two coordinates in kilometers
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Light shuffle within similar score tiers.
 * Seeded by date+hour so it's stable within the same hour but changes over time.
 * Items with very different scores maintain their rank order.
 */
export function lightShuffle<T extends { compositeScore: number }>(items: T[]): T[] {
  if (items.length <= 1) return items

  const now = new Date()
  const seed = now.getFullYear() * 1000000 + (now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours()

  // Group into score buckets (items within 5 points of each other)
  const buckets: T[][] = []
  let currentBucket: T[] = []
  const sorted = [...items].sort((a, b) => b.compositeScore - a.compositeScore)

  for (const item of sorted) {
    if (currentBucket.length === 0) {
      currentBucket.push(item)
    } else {
      const bucketTop = currentBucket[0].compositeScore
      if (bucketTop - item.compositeScore <= 5) {
        currentBucket.push(item)
      } else {
        buckets.push(currentBucket)
        currentBucket = [item]
      }
    }
  }
  if (currentBucket.length > 0) buckets.push(currentBucket)

  // Deterministically shuffle within each bucket using the seed
  const result: T[] = []
  for (const bucket of buckets) {
    const shuffled = seededShuffle(bucket, seed)
    result.push(...shuffled)
  }

  return result
}

function seededShuffle<T>(array: T[], seed: number): T[] {
  const arr = [...array]
  let s = seed
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Apply cross-rail deduplication.
 * Returns a set of IDs that have been "used" so far.
 * Tracks both business appearances (max 2 across page) and specific offer/dish IDs.
 */
export class DedupTracker {
  private businessAppearances = new Map<string, number>()
  private usedOfferIds = new Set<string>()
  private usedDishKeys = new Set<string>()

  canUseBusinessInRail(businessId: string, railBusinessIds: Set<string>): boolean {
    // No business more than once in same rail
    if (railBusinessIds.has(businessId)) return false
    // No business in more than 2 sections across page
    const appearances = this.businessAppearances.get(businessId) || 0
    return appearances < 2
  }

  markBusinessUsed(businessId: string): void {
    const current = this.businessAppearances.get(businessId) || 0
    this.businessAppearances.set(businessId, current + 1)
  }

  canUseOffer(offerId: string): boolean {
    return !this.usedOfferIds.has(offerId)
  }

  markOfferUsed(offerId: string): void {
    this.usedOfferIds.add(offerId)
  }

  // Dish identity = businessId + normalized dish name
  canUseDish(businessId: string, dishName: string): boolean {
    const key = `${businessId}:${dishName.toLowerCase().trim()}`
    return !this.usedDishKeys.has(key)
  }

  markDishUsed(businessId: string, dishName: string): void {
    const key = `${businessId}:${dishName.toLowerCase().trim()}`
    this.usedDishKeys.add(key)
  }
}

/**
 * Determine time of day from a timezone string
 */
export function getTimeOfDay(timezone: string): TimeOfDay {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    const hour = parseInt(formatter.format(now), 10)

    if (hour >= 5 && hour < 11) return 'morning'
    if (hour >= 11 && hour < 14) return 'lunch'
    if (hour >= 14 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 21) return 'evening'
    return 'late_night'
  } catch {
    return 'evening' // safe fallback
  }
}

/**
 * Generate the greeting text for the time-of-day banner
 */
export function getGreeting(timeOfDay: TimeOfDay, name: string, cityDisplayName: string): string {
  switch (timeOfDay) {
    case 'morning':
      return `Good morning, ${name}`
    case 'lunch':
      return `Good afternoon, ${name}`
    case 'afternoon':
      return `Good afternoon, ${name}`
    case 'evening':
      return `Good evening, ${name}`
    case 'late_night':
      return `Good evening, ${name}`
  }
}

export function getGreetingSubtitle(timeOfDay: TimeOfDay, cityDisplayName: string): string {
  switch (timeOfDay) {
    case 'morning':
      return `Coffee or brunch in ${cityDisplayName}?`
    case 'lunch':
      return `Here are some great picks in ${cityDisplayName}.`
    case 'afternoon':
      return `Fancy a treat in ${cityDisplayName}?`
    case 'evening':
      return `Great time for dinner or cocktails in ${cityDisplayName}.`
    case 'late_night':
      return `Explore late night picks in ${cityDisplayName}.`
  }
}

/**
 * Get the first usable image from a business.
 * Falls back to the placeholder system when no uploaded photos exist.
 */
export function getBusinessImage(
  businessImages: string[] | null,
  logo: string | null,
  systemCategory?: string | null,
  businessId?: string | null,
): {
  image: string | null
  logo: string | null
} {
  if (businessImages && businessImages.length > 0) {
    return { image: businessImages[0], logo }
  }

  if (systemCategory && businessId) {
    return { image: getPlaceholderUrl(systemCategory, businessId), logo }
  }

  return { image: null, logo }
}

/**
 * Count premium (Spotlight + Featured) businesses
 */
export function countPremiumBusinesses(businesses: Array<{ plan: string | null }>): number {
  return businesses.filter(b => b.plan === 'spotlight' || b.plan === 'featured').length
}

/**
 * Normalise a business tier from the plan field
 */
export function normaliseTier(plan: string | null): BusinessTier | null {
  if (!plan) return null
  if (plan === 'spotlight' || plan === 'featured' || plan === 'starter') return plan
  return 'free'
}
