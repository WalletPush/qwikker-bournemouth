import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const requestSchema = z.object({
  placeId: z.string().min(1, 'Place ID is required')
})

// DEV ONLY fallback key (use tenant keys in production)
const FALLBACK_API_KEY = process.env.GOOGLE_PLACES_SERVER_KEY

/**
 * Haversine formula to calculate distance between two lat/lng points in meters
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

/**
 * Extract city from hostname (same logic as /api/tenant/config)
 */
function getCityFromHostname(hostname: string): string | null {
  if (!hostname) return null
  
  const parts = hostname.split('.')
  
  if (parts.length >= 3 && parts[1] === 'qwikker') {
    const subdomain = parts[0].toLowerCase()
    const validCities = ['bournemouth', 'poole', 'christchurch', 'london']
    if (validCities.includes(subdomain)) {
      return subdomain
    }
  }
  
  return null
}

function isFallbackHost(hostname: string): boolean {
  return hostname.startsWith('localhost') || 
         hostname.includes('.vercel.app') || 
         hostname.startsWith('app.qwikker.')
}

/**
 * Derive a user-friendly primary type from Google types array
 * Skip generic types like 'establishment', 'point_of_interest'
 */
function derivePrimaryType(types: string[] | undefined): string | null {
  if (!types || types.length === 0) return null
  
  const genericTypes = new Set(['establishment', 'point_of_interest', 'premise', 'subpremise'])
  
  for (const type of types) {
    if (!genericTypes.has(type)) {
      return type
    }
  }
  
  return types[0] || null
}

/**
 * Extract normalized town from address components
 */
function extractTown(addressComponents: any[] | undefined): string | null {
  if (!addressComponents) return null
  
  // Look for postal_town, locality, or administrative_area_level_2
  const townTypes = ['postal_town', 'locality', 'administrative_area_level_2']
  
  for (const component of addressComponents) {
    if (component.types?.some((t: string) => townTypes.includes(t))) {
      return component.long_name?.toLowerCase().trim().replace(/\s+/g, ' ') || null
    }
  }
  
  return null
}

/**
 * Extract postcode from address components
 */
function extractPostcode(addressComponents: any[] | undefined): string | null {
  if (!addressComponents) return null
  
  const postcodeComponent = addressComponents.find(c => 
    c.types?.includes('postal_code')
  )
  
  return postcodeComponent?.long_name || null
}

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production'
  
  try {
    // Parse request
    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }
    
    const { placeId } = validation.data
    
    // Derive tenant city from hostname
    const hostname = request.headers.get('host') || ''
    const isFallback = isFallbackHost(hostname)
    let city = getCityFromHostname(hostname)
    
    // Allow query param override on fallback hosts (DEV ONLY)
    if (isFallback && !city) {
      const url = new URL(request.url)
      const cityParam = url.searchParams.get('city')
      if (cityParam) {
        city = cityParam.toLowerCase()
      }
    }
    
    if (!city) {
      return NextResponse.json(
        { error: 'Unable to determine franchise city' },
        { status: 400 }
      )
    }
    
    // Fetch tenant configuration
    const supabase = createAdminClient()
    const { data: config, error: configError } = await supabase
      .from('franchise_crm_configs')
      .select('city, google_places_server_key, city_center_lat, city_center_lng, onboarding_search_radius_m')
      .eq('city', city)
      .eq('is_active', true)
      .single()
    
    if (configError || !config) {
      return NextResponse.json(
        { error: `No active configuration found for ${city}` },
        { status: 404 }
      )
    }
    
    // Check for API key (tenant key OR fallback)
    const apiKey = config.google_places_server_key || FALLBACK_API_KEY
    
    if (!apiKey) {
      if (isDev) {
        console.debug(`[Places Details] No API key configured for ${city}`)
      }
      return NextResponse.json(
        { error: 'Google verification not configured for this franchise' },
        { status: 400 }
      )
    }
    
    // Call Google Places API Details endpoint
    const fields = [
      'name',
      'formatted_address',
      'geometry',
      'address_component',
      'website',
      'types',
      'rating',
      'user_ratings_total'
    ].join(',')
    
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`
    
    if (isDev) {
      console.debug(`[Places Details] Fetching details for ${placeId} (city: ${city})`)
    }
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status !== 'OK') {
      console.error('❌ Google Places API error:', data.status, data.error_message)
      return NextResponse.json(
        { error: `Google Places API error: ${data.status}`, message: data.error_message },
        { status: 400 }
      )
    }
    
    const result = data.result
    
    if (!result) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      )
    }
    
    // Extract location
    const lat = result.geometry?.location?.lat
    const lng = result.geometry?.location?.lng
    
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Place location not available' },
        { status: 400 }
      )
    }
    
    // ENFORCE RADIUS (if center configured)
    if (config.city_center_lat != null && config.city_center_lng != null) {
      const centerLat = parseFloat(config.city_center_lat as any)
      const centerLng = parseFloat(config.city_center_lng as any)
      const maxRadius = config.onboarding_search_radius_m || 30000
      
      const distance = calculateDistance(centerLat, centerLng, lat, lng)
      
      if (isDev) {
        console.debug(`[Places Details] Distance check:`, {
          place: result.name,
          distance: Math.round(distance),
          maxRadius,
          within: distance <= maxRadius
        })
      }
      
      if (distance > maxRadius) {
        return NextResponse.json(
          { 
            error: 'Business outside coverage area',
            message: `This business is ${Math.round(distance / 1000)}km from ${city} center. Maximum radius is ${Math.round(maxRadius / 1000)}km.`,
            distance: Math.round(distance),
            maxRadius
          },
          { status: 400 }
        )
      }
    }
    
    // Extract and normalize data
    const town = extractTown(result.address_components)
    const postcode = extractPostcode(result.address_components)
    const primaryType = derivePrimaryType(result.types)
    
    const sanitizedData = {
      placeId: placeId,
      name: result.name || null,
      formattedAddress: result.formatted_address || null,
      latitude: lat,
      longitude: lng,
      website: result.website || null,
      types: result.types || [],
      rating: result.rating || 0,
      userRatingsTotal: result.user_ratings_total || 0,
      // Derived fields
      googlePrimaryType: primaryType,
      normalizedTown: town,
      postcode: postcode,
    }
    
    if (isDev) {
      console.debug(`[Places Details] Success:`, {
        name: sanitizedData.name,
        rating: sanitizedData.rating,
        reviews: sanitizedData.userRatingsTotal,
        primaryType: sanitizedData.googlePrimaryType
      })
    }
    
    return NextResponse.json({
      success: true,
      data: sanitizedData
    })
    
  } catch (error) {
    console.error('❌ Google Places Details API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}
