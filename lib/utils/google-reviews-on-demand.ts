'use server'

import { getFranchiseApiKeys } from '@/lib/utils/franchise-api-keys'

/**
 * 🚨 COST WARNING: ~$0.014-$0.017 per call (depends on Google SKU for 'reviews' field)
 * Keep FieldMask minimal to avoid extra charges.
 * 
 * Fetch Google reviews on-demand for unclaimed businesses with stale cached reviews.
 * Only call this when:
 * 1. Business is unclaimed (Tier 3 fallback)
 * 2. google_reviews_highlights is NULL (deleted after 30 days)
 * 3. About to display review snippets in chat (shouldAttachCarousel = true)
 * 
 * PROTECTIONS:
 * - Max 1 call per chat response (enforced by caller)
 * - Rate limited per user/business (best-effort in-memory on serverless, resets on cold start)
 * - Only fetches 'reviews' field (minimal cost)
 * 
 * ⚠️ RATE LIMITING NOTE: In-memory Map works for dev, but resets on Vercel cold starts.
 * For production hardening, use DB-based cooldown (e.g. google_review_fetch_locks table).
 */

interface GoogleReview {
  author: string
  rating: number
  text: string
  time: string
  profile_photo: string | null
}

export async function fetchGoogleReviewsOnDemand(
  googlePlaceId: string,
  city: string
): Promise<GoogleReview[] | null> {
  try {
    // Get franchise-specific Google API key
    const franchiseKeys = await getFranchiseApiKeys(city)
    
    if (!franchiseKeys.google_places_api_key) {
      console.error(`❌ No Google Places API key configured for ${city}`)
      return null
    }

    // Normalize place ID to resource name format
    const placeResource = googlePlaceId.startsWith('places/')
      ? googlePlaceId
      : `places/${googlePlaceId}`

    const detailsUrl = `https://places.googleapis.com/v1/${placeResource}`
    
    // 💰 COST: $0.025 per call (Place Details + Atmosphere)
    const response = await fetch(detailsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': franchiseKeys.google_places_api_key,
        // CRITICAL: Only request reviews (minimize cost)
        'X-Goog-FieldMask': 'reviews'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Google Places API error (${response.status}):`, errorText)
      return null
    }

    const place = await response.json()

    if (!place.reviews || !Array.isArray(place.reviews)) {
      console.log(`ℹ️ No reviews found for place ${googlePlaceId}`)
      return null
    }

    // Map to our format (max 10 reviews, show 3 in chat)
    const reviews: GoogleReview[] = place.reviews.slice(0, 10).map((review: any) => ({
      author: review.authorAttribution?.displayName || 'Anonymous',
      rating: review.rating || 5,
      text: review.text?.text || review.originalText?.text || '',
      time: review.publishTime || review.relativePublishTimeDescription || 'Recently',
      profile_photo: review.authorAttribution?.photoUri || null
    }))

    console.log(`✅ Fetched ${reviews.length} reviews on-demand for place ${googlePlaceId} (cost: $0.025)`)
    
    return reviews

  } catch (error) {
    console.error('❌ Error fetching reviews on-demand:', error)
    return null
  }
}

/**
 * Rate limiting cache for on-demand review fetches
 * Prevents abuse and runaway costs
 * 
 * Key format: "reviews:{userKey}:{businessId}"
 * TTL: 5 minutes (prevent same user hammering same business)
 */

// In-memory rate limit cache (reset on server restart)
// For production, use Redis or Supabase cache
const rateLimitCache = new Map<string, number>()

export async function checkReviewFetchRateLimit(
  userKey: string, // wallet_pass_id or IP
  businessId: string
): Promise<{ allowed: boolean; resetAt?: Date }> {
  const cacheKey = `reviews:${userKey}:${businessId}`
  const now = Date.now()
  const lastFetch = rateLimitCache.get(cacheKey)

  if (lastFetch) {
    const timeSinceLastFetch = now - lastFetch
    const cooldownMs = 5 * 60 * 1000 // 5 minutes

    if (timeSinceLastFetch < cooldownMs) {
      const resetAt = new Date(lastFetch + cooldownMs)
      console.log(`⏱️ Rate limit: User ${userKey} must wait ${Math.ceil((cooldownMs - timeSinceLastFetch) / 1000)}s before fetching reviews for ${businessId} again`)
      return { allowed: false, resetAt }
    }
  }

  // Allow fetch and update cache
  rateLimitCache.set(cacheKey, now)
  
  // Cleanup old entries (prevent memory leak)
  if (rateLimitCache.size > 10000) {
    const oldestKey = rateLimitCache.keys().next().value
    rateLimitCache.delete(oldestKey)
  }

  return { allowed: true }
}
