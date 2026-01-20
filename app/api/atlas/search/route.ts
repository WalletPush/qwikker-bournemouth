import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveRequestCity } from '@/lib/utils/tenant-city'
import { isAtlasEligible } from '@/lib/atlas/eligibility'

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
    const query = url.searchParams.get('q')?.trim() || ''
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : (config.atlas_max_results ?? 12)
    
    // Build query using AI-safe view (excludes free_tier automatically)
    let dbQuery = supabase
      .from('business_profiles_ai_eligible')
      .select(`
        id,
        business_name,
        business_tier,
        latitude,
        longitude,
        rating,
        review_count,
        business_tagline,
        display_category,
        business_address,
        google_place_id,
        website_url,
        phone
      `)
      .eq('city', city)
      .gte('rating', config.atlas_min_rating ?? 4.4)
      .in('status', ['approved', 'unclaimed'])
    
    // If search query provided, filter by name/category/tagline/address
    if (query) {
      // Use text search across multiple fields
      dbQuery = dbQuery.or(
        `business_name.ilike.%${query}%,display_category.ilike.%${query}%,business_tagline.ilike.%${query}%,business_address.ilike.%${query}%`
      )
    }
    
    // Order by rating and review count (highest quality first)
    dbQuery = dbQuery
      .order('rating', { ascending: false })
      .order('review_count', { ascending: false })
      .limit(Math.min(limit, 50)) // Cap at 50 for performance
    
    const { data: businesses, error: searchError } = await dbQuery
    
    if (searchError) {
      console.error('[Atlas Search] Database error:', searchError)
      return NextResponse.json({
        ok: false,
        error: 'Search failed'
      }, { status: 500 })
    }
    
    // 🔒 CRITICAL: Runtime check for tier leakage (should never happen via view)
    const leakedBusinesses = (businesses || []).filter(b => 
      !isAtlasEligible({ 
        business_tier: b.business_tier, 
        latitude: b.latitude, 
        longitude: b.longitude 
      })
    )
    
    let filteredBusinesses = businesses || []
    
    if (leakedBusinesses.length > 0) {
      console.error('❌ CRITICAL: free_tier or invalid tier leaked into Atlas search:', 
        leakedBusinesses.map(b => ({ id: b.id, name: b.business_name, tier: b.business_tier }))
      )
      // Filter them out as a safety net
      filteredBusinesses = filteredBusinesses.filter(b => isAtlasEligible({
        business_tier: b.business_tier,
        latitude: b.latitude,
        longitude: b.longitude
      }))
    }
    
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
