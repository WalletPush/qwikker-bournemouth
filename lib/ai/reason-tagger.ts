/**
 * Reason Tagging for Atlas MVP
 * 
 * Assigns a primary "why shown" reason + secondary metadata to each business.
 * Works brilliantly with thin data (unclaimed Google listings).
 */

import { IntentResult } from './intent-detector'
import { normalizeLocation, calculateDistance as calculateDistanceShared } from '@/lib/utils/location'

export type ReasonType = 
  | 'category_match' // 🍜 PRIORITY 1 when intent exists
  | 'open_now'       // 🕐 PRIORITY 2
  | 'closest'        // 📍 PRIORITY 3
  | 'top_rated'      // ⭐ PRIORITY 4
  | 'highly_rated'   // ⭐ PRIORITY 5
  | 'popular'        // 💬 PRIORITY 6
  | 'recommended'    // PRIORITY 7

export interface ReasonTag {
  type: ReasonType
  label: string
  emoji: string
}

export interface ReasonMeta {
  isOpenNow: boolean
  distanceMeters: number | null
  ratingBadge: string | null
}

/**
 * Get primary reason tag for a business
 * TIER FIRST (paid businesses show tier badge)
 * THEN differentiation by rating/reviews/distance
 */
export function getReasonTag(
  business: any,
  intent: IntentResult,
  relevanceScore: number,
  userLocation?: { lat: number, lng: number } | { latitude: number, longitude: number },
  isBrowseMode: boolean = false,
  allBusinesses?: any[] // ✅ For relative ranking
): ReasonTag {
  
  // ✅ TIER BADGES FIRST (paid businesses always show their tier)
  // This is transparent + trustworthy: user sees they're paid but ONLY if relevant
  
  if (business.business_tier === 'paid' || business.tier === 'spotlight') {
    return { 
      type: 'top_rated', 
      label: 'Qwikker Pick', 
      emoji: '' 
    }
  }
  
  if (business.business_tier === 'featured' || business.tier === 'featured') {
    return { 
      type: 'highly_rated', 
      label: 'Featured', 
      emoji: '' 
    }
  }
  
  if (business.business_tier === 'starter' || business.tier === 'starter') {
    return { 
      type: 'recommended', 
      label: 'Recommended', 
      emoji: '' 
    }
  }
  
  // ✅ FOR UNCLAIMED/FREE BUSINESSES: Show what makes them special
  
  // Calculate distance if available
  let distanceMeters = null
  if (userLocation && business.latitude && business.longitude) {
    distanceMeters = calculateDistance(
      normalizeLocation(userLocation),
      { latitude: business.latitude, longitude: business.longitude }
    )
  }
  
  // ✅ RELATIVE RANKING: Find out where this business stands
  let isTopRated = false
  let isMostReviewed = false
  let isClosest = false
  
  if (allBusinesses && allBusinesses.length > 1) {
    // Find THE highest rated (among unclaimed/free only)
    const unclaimedBusinesses = allBusinesses.filter(b => 
      b.business_tier !== 'paid' && 
      b.business_tier !== 'featured' && 
      b.business_tier !== 'starter' &&
      b.tier !== 'spotlight' &&
      b.tier !== 'featured' &&
      b.tier !== 'starter'
    )
    
    const sortedByRating = [...unclaimedBusinesses].sort((a, b) => (b.rating || 0) - (a.rating || 0))
    isTopRated = sortedByRating[0]?.id === business.id
    
    // Find THE most reviewed
    const sortedByReviews = [...unclaimedBusinesses].sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
    isMostReviewed = sortedByReviews[0]?.id === business.id
    
    // Find THE closest
    if (userLocation) {
      const withDistances = unclaimedBusinesses.map(b => ({
        ...b,
        dist: b.latitude && b.longitude 
          ? calculateDistance(
              normalizeLocation(userLocation),
              { latitude: b.latitude, longitude: b.longitude }
            )
          : Infinity
      })).sort((a, b) => a.dist - b.dist)
      
      isClosest = withDistances[0]?.id === business.id
    }
  }
  
  // PRIORITY 1: Perfect 5★ with high reviews (THE BEST)
  if (business.rating === 5.0 && business.review_count >= 100) {
    return { 
      type: 'top_rated', 
      label: `Highest rated (5★, ${business.review_count} reviews)`, 
      emoji: '' 
    }
  }
  
  // PRIORITY 2: THE highest rated in the set
  if (isTopRated && business.rating >= 4.7) {
    return { 
      type: 'top_rated', 
      label: `Highest rated (${business.rating}★)`, 
      emoji: '' 
    }
  }
  
  // PRIORITY 3: THE most reviewed (social proof)
  if (isMostReviewed && business.review_count >= 200) {
    return { 
      type: 'popular', 
      label: `Most reviews (${business.review_count})`, 
      emoji: '' 
    }
  }
  
  // PRIORITY 4: Perfect 5★ (but fewer reviews)
  if (business.rating === 5.0 && business.review_count >= 10) {
    return { 
      type: 'top_rated', 
      label: 'Top rated (5★)', 
      emoji: '' 
    }
  }
  
  // PRIORITY 5: THE closest
  if (isClosest && distanceMeters !== null && distanceMeters < 5000) {
    return { 
      type: 'closest', 
      label: 'Closest option', 
      emoji: '' 
    }
  }
  
  // PRIORITY 6: Very close (< 500m)
  if (distanceMeters !== null && distanceMeters < 500) {
    return { 
      type: 'closest', 
      label: `Very close (${Math.round(distanceMeters)}m)`, 
      emoji: '' 
    }
  }
  
  // PRIORITY 7: High rating + lots of reviews
  if (business.rating >= 4.5 && business.review_count >= 100) {
    return { 
      type: 'popular', 
      label: `Well-reviewed (${business.review_count})`, 
      emoji: '' 
    }
  }
  
  // PRIORITY 8: High rating
  if (business.rating >= 4.5) {
    return { 
      type: 'highly_rated', 
      label: `${business.rating}★ rated`, 
      emoji: '' 
    }
  }
  
  // PRIORITY 9: Hidden gem (high rated, low review count)
  if (business.rating >= 4.3 && business.review_count < 50 && business.review_count >= 10) {
    return { 
      type: 'highly_rated', 
      label: 'Hidden gem', 
      emoji: '' 
    }
  }
  
  // PRIORITY 10: Open now (only if nothing else special)
  if (business.business_hours && isOpenNow(business.business_hours)) {
    return { 
      type: 'open_now', 
      label: 'Open now', 
      emoji: '' 
    }
  }
  
  // PRIORITY 11: Solid choice
  if (business.rating >= 4.0) {
    return { 
      type: 'recommended', 
      label: 'Solid choice', 
      emoji: '' 
    }
  }
  
  // PRIORITY 12: Fallback
  return { 
    type: 'recommended', 
    label: 'Worth checking out', 
    emoji: '' 
  }
}

/**
 * Get secondary metadata for "decision engine" feel
 * Rating badge + open now + distance
 */
export function getReasonMeta(
  business: any,
  userLocation?: { lat: number, lng: number } | { latitude: number, longitude: number }
): ReasonMeta {
  const isOpen = business.business_hours && isOpenNow(business.business_hours)
  
  let distanceMeters = null
  if (userLocation && business.latitude && business.longitude) {
    distanceMeters = Math.round(calculateDistance(
      normalizeLocation(userLocation),
      { latitude: business.latitude, longitude: business.longitude }
    ))
  }
  
  let ratingBadge = null
  if (business.rating && business.review_count) {
    ratingBadge = `${business.rating.toFixed(1)} (${business.review_count})`
  }
  
  return { 
    isOpenNow: isOpen, 
    distanceMeters, 
    ratingBadge 
  }
}

// ✅ DEPRECATED: Use shared normalizeLocation from @/lib/utils/location instead

/**
 * Check if business is currently open
 * Best effort parser for business_hours field
 */
function isOpenNow(businessHours: any): boolean {
  if (!businessHours) return false
  
  try {
    const now = new Date()
    const currentDay = now.getDay() // 0 = Sunday, 6 = Saturday
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    
    // Handle if business_hours is a string (need to parse)
    if (typeof businessHours === 'string') {
      // Best effort: check if string contains "Open" or time patterns
      // This is simplified - adjust based on your actual format
      return businessHours.toLowerCase().includes('open')
    }
    
    // Handle if business_hours is JSON object
    if (typeof businessHours === 'object') {
      // Expected format: { monday: { open: "09:00", close: "17:00" }, ... }
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const todayName = dayNames[currentDay]
      const todayHours = businessHours[todayName]
      
      if (!todayHours || todayHours.closed) return false
      
      if (todayHours.open && todayHours.close) {
        const openMinutes = parseTimeToMinutes(todayHours.open)
        const closeMinutes = parseTimeToMinutes(todayHours.close)
        
        if (openMinutes !== null && closeMinutes !== null) {
          // Handle overnight hours (close < open, e.g. 22:00 to 02:00)
          if (closeMinutes < openMinutes) {
            return currentMinutes >= openMinutes || currentMinutes < closeMinutes
          }
          return currentMinutes >= openMinutes && currentMinutes < closeMinutes
        }
      }
    }
    
    return false
  } catch (error) {
    console.warn('Error parsing business hours:', error)
    return false
  }
}

/**
 * Parse time string to minutes (e.g. "09:30" => 570)
 */
function parseTimeToMinutes(timeStr: string): number | null {
  try {
    const parts = timeStr.split(':')
    if (parts.length !== 2) return null
    
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    
    if (isNaN(hours) || isNaN(minutes)) return null
    
    return hours * 60 + minutes
  } catch {
    return null
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in meters
 * ✅ SHIP-SAFE: Wrapper using shared canonical utility
 */
export function calculateDistance(
  from: any,
  to: any
): number {
  const fromNorm = normalizeLocation(from)
  const toNorm = normalizeLocation(to)
  
  if (!fromNorm || !toNorm) {
    console.warn('⚠️ Invalid location for distance calculation')
    return Infinity
  }
  
  return calculateDistanceShared(fromNorm, toNorm)
}
