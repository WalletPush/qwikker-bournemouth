import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveRequestCity } from '@/lib/utils/tenant-city'
import { hasValidCoords } from '@/lib/atlas/eligibility'

/**
 * GET /api/atlas/search
 * 
 * Search businesses for Atlas map display
 * 
 * Query params:
 * - q: search query (optional, if empty returns top-rated businesses)
 * - limit: max results (optional, defaults to franchise atlas_max_results)
 * 
 * SECURITY:
 * - City derived from hostname server-side (never trust client)
 * - Only returns businesses for current tenant city
 * - Uses business_profiles_ai_eligible view (excludes free_tier)
 * - Only returns businesses with rating >= atlas_min_rating
 * - Only returns businesses with latitude/longitude (enforced by view)
 * - Only returns approved or unclaimed businesses
 * 
 * Returns array of businesses with:
 * - id, business_name, latitude, longitude, rating, review_count
 * - business_tagline, display_category, business_address
 * - google_place_id, website_url, phone
 */

export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production'
  
  try {
    // Resolve city using centralized, secure resolver
    const cityRes = await resolveRequestCity(request, { allowQueryOverride: true })
    
    if (!cityRes.ok) {
      return NextResponse.json({
        ok: false,
        error: cityRes.error
      }, { status: cityRes.status })
    }
    
    const city = cityRes.city
    
    // Get franchise config to check Atlas settings
    const supabase = createServiceRoleClient()
    const { data: config, error: configError } = await supabase
      .from('franchise_crm_configs')
      .select('atlas_enabled, atlas_max_results, atlas_min_rating, atlas_mode, status')
      .eq('city', city)
      .single()
    
    if (configError || !config) {
      return NextResponse.json({
        ok: false,
        error: 'Franchise configuration not found'
      }, { status: 404 })
    }
    
    // Check if Atlas is enabled for this franchise
    if (!config.atlas_enabled || config.status !== 'active') {
      return NextResponse.json({
        ok: false,
        error: 'Atlas is not enabled for this franchise'
      }, { status: 403 })
    }
    
    // Parse query parameters
    const url = new URL(request.url)
    const rawQuery = url.searchParams.get('q')?.trim() || ''
    // ✅ Clean search: remove punctuation that breaks ILIKE matching
    const query = rawQuery.replace(/[?!.,;:'"()]/g, '').trim()
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : (config.atlas_max_results ?? 12)
    const idsParam = url.searchParams.get('ids')?.trim() || ''
    
    // Hydration mode: fetch enriched fields for specific business IDs
    if (idsParam) {
      const ids = idsParam.split(',').filter(Boolean).slice(0, 25)
      if (ids.length === 0) {
        return NextResponse.json({ ok: true, results: [] })
      }
      
      const { data: hydrated, error: hydrateError } = await supabase
        .from('business_profiles')
        .select(`
          id,
          business_name,
          latitude,
          longitude,
          rating,
          review_count,
          business_tagline,
          display_category,
          business_address,
          google_place_id,
          website_url,
          phone,
          business_tier,
          business_hours_structured
        `)
        .in('id', ids)
        .eq('city', city)
      
      if (hydrateError) {
        console.error('[Atlas Hydrate] Error:', hydrateError)
        return NextResponse.json({ ok: false, error: 'Hydration failed' }, { status: 500 })
      }
      
      // Build enriched map with offer/event counts
      const enrichedMap: Record<string, any> = {}
      for (const biz of (hydrated || [])) {
        const { count: offersCount } = await supabase
          .from('business_offers')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', biz.id)
          .eq('is_active', true)
        
        enrichedMap[biz.id] = {
          ...biz,
          opening_hours: biz.business_hours_structured || null,
          has_offers: (offersCount || 0) > 0,
          offers_count: offersCount || 0,
        }
      }
      
      if (isDev) {
        console.debug(`[Atlas Hydrate] city=${city} ids=${ids.length} hydrated=${Object.keys(enrichedMap).length}`)
      }
      
      return NextResponse.json({
        ok: true,
        results: Object.values(enrichedMap),
        meta: { city, mode: 'hydrate', count: Object.keys(enrichedMap).length }
      })
    }
    
    // Build query using ALL THREE TIER VIEWS (same as /api/atlas/query)
    // ✅ FIX: PostgREST uses * as wildcard, not %
    // ✅ Tier 1 searches: name, display_category, system_category, google_primary_type, tagline, address
    // ✅ Tier 2/3 search: name, display_category, google_primary_type (system_category not available)
    const [tier1Response, tier2Response, tier3Response] = await Promise.all([
      supabase
        .from('business_profiles_chat_eligible')
        .select('*')
        .eq('city', city)
        .gte('rating', config.atlas_min_rating ?? 4.4)
        .or(query ? `business_name.ilike.*${query}*,display_category.ilike.*${query}*,system_category.ilike.*${query}*,google_primary_type.ilike.*${query}*,business_tagline.ilike.*${query}*,business_address.ilike.*${query}*` : 'id.neq.null'),
      
      supabase
        .from('business_profiles_lite_eligible')
        .select('*')
        .eq('city', city)
        .gte('rating', config.atlas_min_rating ?? 4.4)
        .or(query ? `business_name.ilike.*${query}*,display_category.ilike.*${query}*,google_primary_type.ilike.*${query}*` : 'id.neq.null'),
      
      supabase
        .from('business_profiles_ai_fallback_pool')
        .select('*')
        .eq('city', city)
        .gte('rating', config.atlas_min_rating ?? 4.4)
        .or(query ? `business_name.ilike.*${query}*,display_category.ilike.*${query}*,google_primary_type.ilike.*${query}*` : 'id.neq.null')
    ])
    
    console.log(`[Atlas Search] Query results - T1: ${tier1Response.data?.length || 0}, T2: ${tier2Response.data?.length || 0}, T3: ${tier3Response.data?.length || 0}`)
    
    // Tag each with simplified tier
    const tier1 = (tier1Response.data || []).map(b => ({ ...b, business_tier: 'paid' as const }))
    const tier2 = (tier2Response.data || []).map(b => ({ ...b, business_tier: 'claimed_free' as const }))
    const tier3 = (tier3Response.data || []).map(b => ({ ...b, business_tier: 'unclaimed' as const }))
    
    // Combine and deduplicate
    const allResults = [...tier1, ...tier2, ...tier3]
    const businessMap = new Map()
    allResults.forEach(b => {
      if (!businessMap.has(b.id)) {
        businessMap.set(b.id, b)
      }
    })
    
    const businesses = Array.from(businessMap.values())
      .sort((a, b) => {
        // Sort by rating desc, then review_count desc
        if (a.rating !== b.rating) return (b.rating || 0) - (a.rating || 0)
        return (b.review_count || 0) - (a.review_count || 0)
      })
      .slice(0, Math.min(limit, 50))
    
    // Defense-in-depth: views already enforce eligibility, just verify coords
    const filteredBusinesses = (businesses || []).filter(b => 
      hasValidCoords(b.latitude, b.longitude)
    )
    
    if (isDev) {
      console.debug(`[Atlas Search] city=${city} query="${query}" results=${filteredBusinesses.length}`)
    }
    
    return NextResponse.json({
      ok: true,
      results: filteredBusinesses,
      meta: {
        city,
        query,
        count: businesses?.length || 0,
        minRating: config.atlas_min_rating ?? 4.4
      }
    })
    
  } catch (error) {
    console.error('[Atlas Search] Error:', error)
    
    return NextResponse.json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
