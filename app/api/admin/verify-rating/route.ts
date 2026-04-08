import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const FALLBACK_API_KEY = process.env.GOOGLE_PLACES_SERVER_KEY

/**
 * POST — Look up a business's real Google rating via Places API.
 * Compares claimed vs actual and returns both.
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json()
    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
    }

    // Admin auth
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')
    if (!adminSessionCookie?.value) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    let adminSession
    try { adminSession = JSON.parse(adminSessionCookie.value) } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    const admin = await getAdminById(adminSession.adminId)
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 403 })
    }

    const supabase = createAdminClient()

    const { data: business, error: bizErr } = await supabase
      .from('business_profiles')
      .select('id, business_name, business_address, business_town, city, google_place_id, rating, review_count')
      .eq('id', businessId)
      .single()

    if (bizErr || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get API key from franchise config or fallback
    const { data: config } = await supabase
      .from('franchise_crm_configs')
      .select('google_places_server_key, google_places_api_key')
      .eq('city', business.city)
      .single()

    const apiKey = config?.google_places_server_key || config?.google_places_api_key || FALLBACK_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 400 })
    }

    let googleRating: number | null = null
    let googleReviewCount: number | null = null
    let googlePlaceId: string | null = business.google_place_id || null

    // If we already have a place_id, fetch directly
    if (googlePlaceId) {
      const result = await fetchPlaceDetails(googlePlaceId, apiKey)
      if (result) {
        googleRating = result.rating
        googleReviewCount = result.reviewCount
      }
    }

    // If no place_id or details fetch failed, try text search
    if (googleRating === null) {
      const searchQuery = `${business.business_name} ${business.business_town}`
      const searchResult = await searchPlace(searchQuery, apiKey)
      if (searchResult) {
        googlePlaceId = searchResult.placeId
        googleRating = searchResult.rating
        googleReviewCount = searchResult.reviewCount

        // Store the discovered place_id for future lookups
        if (googlePlaceId && !business.google_place_id) {
          await supabase
            .from('business_profiles')
            .update({ google_place_id: googlePlaceId })
            .eq('id', businessId)
        }
      }
    }

    if (googleRating === null) {
      return NextResponse.json({
        found: false,
        claimedRating: business.rating,
        claimedReviewCount: business.review_count,
      })
    }

    const ratingDiff = Math.abs((business.rating || 0) - googleRating)
    const match = ratingDiff <= 0.3

    return NextResponse.json({
      found: true,
      googleRating,
      googleReviewCount,
      googlePlaceId,
      claimedRating: business.rating,
      claimedReviewCount: business.review_count,
      match,
    })
  } catch (err) {
    console.error('[verify-rating] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH — Admin confirms/updates rating_source and optionally overrides rating values.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { businessId, rating_source, rating, review_count } = await request.json()
    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')
    if (!adminSessionCookie?.value) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    let adminSession
    try { adminSession = JSON.parse(adminSessionCookie.value) } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    const admin = await getAdminById(adminSession.adminId)
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const updateData: Record<string, unknown> = {
      rating_source: rating_source || 'admin_verified',
    }
    if (typeof rating === 'number') updateData.rating = rating
    if (typeof review_count === 'number') updateData.review_count = review_count

    const { error } = await supabase
      .from('business_profiles')
      .update(updateData)
      .eq('id', businessId)

    if (error) {
      console.error('[verify-rating PATCH] DB error:', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[verify-rating PATCH] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function fetchPlaceDetails(placeId: string, apiKey: string) {
  try {
    const fields = 'rating,user_ratings_total'
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.status !== 'OK' || !data.result) return null
    return {
      rating: data.result.rating || null,
      reviewCount: data.result.user_ratings_total || null,
    }
  } catch {
    return null
  }
}

async function searchPlace(query: string, apiKey: string) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,rating,user_ratings_total&key=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.status !== 'OK' || !data.candidates?.length) return null
    const candidate = data.candidates[0]
    return {
      placeId: candidate.place_id || null,
      rating: candidate.rating || null,
      reviewCount: candidate.user_ratings_total || null,
    }
  } catch {
    return null
  }
}
