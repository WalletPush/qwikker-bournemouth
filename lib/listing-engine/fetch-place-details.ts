import { getFranchiseApiKeys } from '@/lib/utils/franchise-api-keys'

/**
 * Listing Engine — combined Google Place Details fetch (reviews + website).
 *
 * The Acquisition draft already pays for a Place Details call to read reviews.
 * Google bills a Details call at the tier of the MOST EXPENSIVE field requested,
 * and `reviews` is already top-tier — so adding `websiteUri` to the SAME call is
 * effectively free. We use the recovered website to scrape a business that has a
 * Google listing but no website_url on file (a big source of "no email" misses),
 * then persist it back to the profile.
 *
 * Non-throwing: returns null on any failure so the caller falls back gracefully.
 */

export interface PlaceReview {
  author: string
  rating: number
  text: string
}

export interface PlaceDetails {
  reviews: PlaceReview[]
  website: string | null
}

export async function fetchPlaceDetailsForListing(
  googlePlaceId: string,
  city: string
): Promise<PlaceDetails | null> {
  try {
    const keys = await getFranchiseApiKeys(city)
    if (!keys.google_places_api_key) {
      console.error(`❌ No Google Places API key configured for ${city}`)
      return null
    }

    const placeResource = googlePlaceId.startsWith('places/') ? googlePlaceId : `places/${googlePlaceId}`

    const res = await fetch(`https://places.googleapis.com/v1/${placeResource}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': keys.google_places_api_key,
        // `reviews` already sets the (Enterprise+Atmosphere) billing tier, so
        // `websiteUri` rides along at no extra cost.
        'X-Goog-FieldMask': 'reviews,websiteUri',
      },
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      console.error(`❌ Google Place Details error (${res.status}):`, errorText)
      return null
    }

    const place = await res.json()

    const reviews: PlaceReview[] = Array.isArray(place.reviews)
      ? place.reviews.slice(0, 10).map((r: any) => ({
          author: r.authorAttribution?.displayName || 'Anonymous',
          rating: r.rating || 5,
          text: r.text?.text || r.originalText?.text || '',
        }))
      : []

    const website = typeof place.websiteUri === 'string' && place.websiteUri.trim() ? place.websiteUri.trim() : null

    return { reviews, website }
  } catch (error) {
    console.error('❌ Error fetching place details:', error)
    return null
  }
}
