/**
 * Refresh a business's Google rating + review_count from Places API (New).
 * Used by enrich, admin "Sync from Google", and the nightly cron.
 *
 * Writes:
 *   rating, review_count, rating_source = 'google_verified', google_verified_at = now()
 * Optionally backfills google_place_id when discovered via text search.
 */

import { createAdminClient } from '@/lib/supabase/admin'

const FALLBACK_API_KEY = process.env.GOOGLE_PLACES_SERVER_KEY

export interface RefreshRatingResult {
  ok: boolean
  businessId: string
  businessName?: string
  rating?: number | null
  reviewCount?: number | null
  previousRating?: number | null
  previousReviewCount?: number | null
  changed?: boolean
  error?: string
}

async function resolveApiKey(supabase: ReturnType<typeof createAdminClient>, city: string | null): Promise<string | null> {
  if (city) {
    const { data: config } = await supabase
      .from('franchise_crm_configs')
      .select('google_places_server_key, google_places_api_key')
      .eq('city', city)
      .maybeSingle()
    const key = config?.google_places_server_key || config?.google_places_api_key
    if (key) return key
  }
  return FALLBACK_API_KEY || null
}

async function fetchPlaceRating(
  placeId: string,
  apiKey: string
): Promise<{ rating: number | null; reviewCount: number | null } | null> {
  const resource = placeId.startsWith('places/') ? placeId : `places/${placeId}`
  const res = await fetch(`https://places.googleapis.com/v1/${resource}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'rating,userRatingCount',
    },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { rating?: number; userRatingCount?: number }
  return {
    rating: typeof data.rating === 'number' ? data.rating : null,
    reviewCount: typeof data.userRatingCount === 'number' ? data.userRatingCount : null,
  }
}

async function findPlaceId(
  name: string,
  town: string | null,
  apiKey: string
): Promise<string | null> {
  const textQuery = [name, town].filter(Boolean).join(' ')
  if (!textQuery.trim()) return null
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.rating,places.userRatingCount',
    },
    body: JSON.stringify({ textQuery, pageSize: 1 }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { places?: Array<{ id?: string }> }
  const id = data.places?.[0]?.id
  if (!id) return null
  return id.startsWith('places/') ? id.slice('places/'.length) : id
}

/**
 * Fetch live Google rating/review count and persist onto business_profiles.
 */
export async function refreshBusinessRating(businessId: string): Promise<RefreshRatingResult> {
  const supabase = createAdminClient()

  const { data: business, error: bizErr } = await supabase
    .from('business_profiles')
    .select('id, business_name, business_town, city, google_place_id, rating, review_count')
    .eq('id', businessId)
    .maybeSingle()

  if (bizErr || !business) {
    return { ok: false, businessId, error: bizErr?.message || 'Business not found' }
  }

  const apiKey = await resolveApiKey(supabase, business.city)
  if (!apiKey) {
    return { ok: false, businessId, businessName: business.business_name, error: 'Google Places API key not configured' }
  }

  let placeId = business.google_place_id as string | null
  let live = placeId ? await fetchPlaceRating(placeId, apiKey) : null

  if (!live) {
    const discovered = await findPlaceId(business.business_name || '', business.business_town, apiKey)
    if (discovered) {
      placeId = discovered
      live = await fetchPlaceRating(discovered, apiKey)
    }
  }

  if (!live || (live.rating == null && live.reviewCount == null)) {
    return {
      ok: false,
      businessId,
      businessName: business.business_name,
      previousRating: business.rating,
      previousReviewCount: business.review_count,
      error: 'Could not fetch rating from Google',
    }
  }

  const previousRating = business.rating
  const previousReviewCount = business.review_count
  const changed =
    previousRating !== live.rating || previousReviewCount !== live.reviewCount

  const update: Record<string, unknown> = {
    rating_source: 'google_verified',
    google_verified_at: new Date().toISOString(),
  }
  if (live.rating != null) update.rating = live.rating
  if (live.reviewCount != null) update.review_count = live.reviewCount
  if (placeId && placeId !== business.google_place_id) {
    update.google_place_id = placeId
  }

  const { error: updErr } = await supabase
    .from('business_profiles')
    .update(update)
    .eq('id', businessId)

  if (updErr) {
    return {
      ok: false,
      businessId,
      businessName: business.business_name,
      error: updErr.message,
    }
  }

  return {
    ok: true,
    businessId,
    businessName: business.business_name,
    rating: live.rating,
    reviewCount: live.reviewCount,
    previousRating,
    previousReviewCount,
    changed,
  }
}

export interface RefreshCityBatchResult {
  processed: number
  updated: number
  errors: number
  hasMore: boolean
  nextOffset: number
  results: RefreshRatingResult[]
}

/**
 * Refresh Google ratings for a city in bounded batches (admin button / API).
 * mode=all → page through every listing with a place_id
 * mode=stale → only never-synced or older than staleDays
 */
export async function refreshRatingsForCity(opts: {
  city: string
  mode?: 'all' | 'stale'
  staleDays?: number
  limit?: number
  offset?: number
}): Promise<RefreshCityBatchResult> {
  const { city, mode = 'stale', staleDays = 7, limit = 25, offset = 0 } = opts
  const supabase = createAdminClient()

  let query = supabase
    .from('business_profiles')
    .select('id')
    .eq('city', city.toLowerCase())
    .not('google_place_id', 'is', null)
    .order('business_name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (mode === 'stale') {
    const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString()
    query = query.or(`google_verified_at.is.null,google_verified_at.lt.${cutoff}`)
  }

  const { data: candidates, error } = await query

  if (error) {
    console.error('[refresh-ratings] candidate query failed:', error.message)
    return { processed: 0, updated: 0, errors: 1, hasMore: false, nextOffset: offset, results: [] }
  }

  const results: RefreshRatingResult[] = []
  let updated = 0
  let errors = 0

  for (const row of candidates || []) {
    // Small delay to stay gentle on Places quotas
    await new Promise((r) => setTimeout(r, 100))
    const result = await refreshBusinessRating(row.id)
    results.push(result)
    if (result.ok && result.changed) updated++
    if (!result.ok) errors++
  }

  const processed = results.length
  return {
    processed,
    updated,
    errors,
    hasMore: processed >= limit,
    nextOffset: offset + processed,
    results,
  }
}

/** @deprecated use refreshRatingsForCity({ mode: 'stale' }) */
export async function refreshStaleRatingsForCity(opts: {
  city: string
  staleDays?: number
  limit?: number
}): Promise<{ processed: number; updated: number; errors: number; results: RefreshRatingResult[] }> {
  const batch = await refreshRatingsForCity({ ...opts, mode: 'stale', offset: 0 })
  return {
    processed: batch.processed,
    updated: batch.updated,
    errors: batch.errors,
    results: batch.results,
  }
}
