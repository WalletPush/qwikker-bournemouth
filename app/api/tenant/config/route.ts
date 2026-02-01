import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveRequestCity } from '@/lib/utils/tenant-city'

// Force dynamic rendering - never cache this endpoint
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/tenant/config
 * 
 * Returns tenant-specific configuration for Google Places and geographic settings.
 * This endpoint is called client-side to get the franchise's public API key and bounds.
 * 
 * Query params (DEV ONLY):
 * - ?city=X - Override city on localhost/vercel/app.qwikker.com (403 on real subdomains)
 * 
 * SECURITY:
 * - Only returns public API key (never server key)
 * - City derived from hostname server-side
 * - Query overrides only allowed on fallback hosts
 * 
 * NOTE:
 * - Google Places API keys are stored per-franchise in DB (franchise_crm_configs)
 * - Only Supabase env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) required
 */

export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production'
  
  try {
    // Resolve city using centralized, secure resolver
    const cityRes = await resolveRequestCity(request, { allowQueryOverride: true })
    
    if (!cityRes.ok) {
      if (isDev) {
        console.debug(`[Tenant Config] ${cityRes.error}`)
      }
      
      return NextResponse.json({
        ok: false,
        message: cityRes.error,
        hostname: request.headers.get('host') || ''
      }, { status: cityRes.status })
    }
    
    const city = cityRes.city
    
    if (isDev) {
      console.debug(`[Tenant Config] city=${city} source=${cityRes.source} fallback=${cityRes.fallback}`)
    }
    
    // Query franchise_crm_configs (only public fields, never server key)
    // Include legacy lat/lng as fallback + Atlas configuration
    const supabase = createServiceRoleClient()
    const { data: config, error } = await supabase
      .from('franchise_crm_configs')
      .select(`
        city,
        status,
        google_places_api_key,
        google_places_country,
        city_center_lat,
        city_center_lng,
        lat,
        lng,
        onboarding_search_radius_m,
        import_search_radius_m,
        import_max_radius_m,
        atlas_enabled,
        atlas_provider,
        mapbox_public_token,
        mapbox_style_url,
        atlas_default_zoom,
        atlas_pitch,
        atlas_bearing,
        atlas_max_results,
        atlas_min_rating,
        atlas_mode
      `)
      .eq('city', city)
      .single()
    
    if (error || !config) {
      if (isDev) {
        console.debug(`[Tenant Config] No config found for city: ${city}`, error)
      }
      
      return NextResponse.json({
        ok: false,
        message: `No franchise configuration found for city: ${city}`
      }, { status: 404 })
    }
    
    // Google Places is optional - used for onboarding, but not required for Atlas
    const hasGooglePlaces = !!config.google_places_api_key
    
    if (!hasGooglePlaces && isDev) {
      console.debug(`[Tenant Config] No Google Places API key configured for ${city} (optional for Atlas)`)
    }
    
    // Use city_center_lat/lng if set, otherwise fallback to legacy lat/lng
    const centerLat = config.city_center_lat ?? config.lat ?? null
    const centerLng = config.city_center_lng ?? config.lng ?? null
    const hasCenter = centerLat != null && centerLng != null
    
    if (isDev) {
      console.debug(`[Tenant Config] Loaded config for ${city}:`, {
        hasKey: !!config.google_places_api_key,
        hasCenter,
        center: hasCenter ? `${centerLat},${centerLng}` : null,
        usingLegacyCenter: !config.city_center_lat && !!config.lat,
        onboardingRadius: config.onboarding_search_radius_m,
        country: config.google_places_country
      })
    }
    
    // Check if franchise is active
    const isActive = config.status === 'active'
    
    // Atlas only available if franchise is active AND atlas_enabled=true
    const atlasEnabled = isActive && (config.atlas_enabled ?? false)
    
    // Return safe config (never include server keys, only public tokens)
    const response = NextResponse.json({
      ok: true,
      city: config.city,
      status: config.status,
      googlePlacesPublicKey: config.google_places_api_key || null,
      country: config.google_places_country || 'gb',
      center: hasCenter ? {
        lat: parseFloat(centerLat as any),
        lng: parseFloat(centerLng as any)
      } : null,
      onboardingRadiusMeters: config.onboarding_search_radius_m ?? 35000,
      importDefaultRadiusMeters: config.import_search_radius_m ?? 75000,
      importMaxRadiusMeters: config.import_max_radius_m ?? 200000,
      atlas: {
        enabled: atlasEnabled,
        provider: config.atlas_provider || 'mapbox',
        mapboxPublicToken: config.mapbox_public_token || null,
        styleUrl: config.mapbox_style_url || null,
        defaultZoom: config.atlas_default_zoom ?? 13,
        pitch: config.atlas_pitch ?? 45,
        bearing: config.atlas_bearing ?? 0,
        maxResults: config.atlas_max_results ?? 12,
        minRating: config.atlas_min_rating ?? 4.4,
        mode: config.atlas_mode || 'curated'
      },
      meta: {
        source: cityRes.source,
        fallback: cityRes.fallback,
        usingLegacyCenter: !config.city_center_lat && !!config.lat
      }
    })
    
    // 🔥 CRITICAL: No caching - always fetch fresh config
    // This ensures Atlas toggles in HQ Admin take effect immediately
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('[Tenant Config] Error:', error)
    
    return NextResponse.json({
      ok: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
