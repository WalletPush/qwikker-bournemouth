import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/tenant/config
 * 
 * Returns tenant-specific configuration for Google Places and geographic settings.
 * This endpoint is called client-side to get the franchise's public API key and bounds.
 * 
 * Query params (DEV ONLY):
 * - ?city=X - Override city on localhost/vercel/app.qwikker.com (ignored on real subdomains)
 * 
 * SECURITY:
 * - Only returns public API key (never server key)
 * - City derived from hostname server-side
 * - Safe fallback for non-subdomain hosts
 */

// Helper: Check if hostname is a "safe fallback" host (allows ?city override)
function isFallbackHost(hostname: string): boolean {
  if (!hostname) return false
  
  // Localhost
  if (hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1')) {
    return true
  }
  
  // Vercel previews
  if (hostname.includes('.vercel.app')) {
    return true
  }
  
  // Staging/app domain (no city subdomain)
  if (hostname.startsWith('app.qwikker.')) {
    return true
  }
  
  return false
}

// Helper: Extract city from hostname (simplified tenant detection)
function getCityFromHostname(hostname: string): string | null {
  if (!hostname) return null
  
  // Extract subdomain
  const parts = hostname.split('.')
  
  // If hostname is like "bournemouth.qwikker.co.uk" or "bournemouth.qwikker.com"
  if (parts.length >= 3 && parts[1] === 'qwikker') {
    const subdomain = parts[0].toLowerCase()
    
    // Known city subdomains
    const validCities = ['bournemouth', 'poole', 'christchurch', 'london']
    if (validCities.includes(subdomain)) {
      return subdomain
    }
  }
  
  return null
}

export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production'
  
  try {
    // Get hostname from request
    const hostname = request.headers.get('host') || ''
    
    // Determine if we're on a fallback host
    const isFallback = isFallbackHost(hostname)
    
    // Try to derive city from hostname
    let city = getCityFromHostname(hostname)
    
    // If on fallback host AND city param provided, use it (DEV ONLY)
    if (isFallback && !city) {
      const searchParams = request.nextUrl.searchParams
      const cityParam = searchParams.get('city')
      
      if (cityParam) {
        city = cityParam.toLowerCase()
        
        if (isDev) {
          console.debug(`[Tenant Config] Fallback host detected, using ?city=${city}`)
        }
      }
    }
    
    // If still no city, return error
    if (!city) {
      if (isDev) {
        console.debug(`[Tenant Config] No city detected. Hostname: ${hostname}, Fallback: ${isFallback}`)
      }
      
      return NextResponse.json({
        ok: false,
        message: isFallback 
          ? 'Please specify ?city=yourCity for development/staging'
          : 'Unable to determine franchise city from hostname'
      }, { status: 400 })
    }
    
    // Query franchise_crm_configs
    const supabase = createAdminClient()
    const { data: config, error } = await supabase
      .from('franchise_crm_configs')
      .select('city, google_places_public_key, google_places_country, city_center_lat, city_center_lng, onboarding_search_radius_m, import_search_radius_m, import_max_radius_m, is_active')
      .eq('city', city)
      .eq('is_active', true)
      .single()
    
    if (error || !config) {
      if (isDev) {
        console.debug(`[Tenant Config] No active config found for city: ${city}`)
      }
      
      return NextResponse.json({
        ok: false,
        message: `No active franchise configuration found for ${city}`
      }, { status: 404 })
    }
    
    // Check if Places API is configured
    if (!config.google_places_public_key) {
      if (isDev) {
        console.debug(`[Tenant Config] No Google Places API key configured for ${city}`)
      }
      
      return NextResponse.json({
        ok: false,
        city: config.city,
        message: 'Google Places not configured for this franchise'
      }, { status: 200 }) // Not a server error, just not configured
    }
    
    // Check if center coordinates are set
    const hasCenter = config.city_center_lat != null && config.city_center_lng != null
    
    if (isDev) {
      console.debug(`[Tenant Config] Loaded config for ${city}:`, {
        hasKey: !!config.google_places_public_key,
        hasCenter,
        center: hasCenter ? `${config.city_center_lat},${config.city_center_lng}` : null,
        onboardingRadius: config.onboarding_search_radius_m,
        country: config.google_places_country
      })
    }
    
    // Return safe config (never include server key)
    return NextResponse.json({
      ok: true,
      city: config.city,
      googlePlacesPublicKey: config.google_places_public_key,
      country: config.google_places_country || 'gb',
      center: hasCenter ? {
        lat: parseFloat(config.city_center_lat as any),
        lng: parseFloat(config.city_center_lng as any)
      } : null,
      onboardingRadiusMeters: config.onboarding_search_radius_m || 30000,
      importDefaultRadiusMeters: config.import_search_radius_m || 50000,
      importMaxRadiusMeters: config.import_max_radius_m || 200000,
      message: 'Configuration loaded successfully'
    })
    
  } catch (error) {
    console.error('[Tenant Config] Error:', error)
    
    return NextResponse.json({
      ok: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
