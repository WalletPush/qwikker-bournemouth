import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveRequestCity } from '@/lib/utils/tenant-city'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { CATEGORY_MAPPING } from '@/lib/constants/category-mapping'
import {
  type SystemCategory,
  SYSTEM_CATEGORY_LABEL,
  isValidSystemCategory,
} from '@/lib/constants/system-categories'
import { validateCategoryMatch } from '@/lib/import/category-filters'

// Google Places API (New) Pricing (GBP) - Update here if pricing changes
const GOOGLE_PLACES_NEARBY_BASIC_GBP = 0.025  // £0.025 per Nearby Search request
const GOOGLE_PLACES_DETAILS_BASIC_GBP = 0.017 // £0.017 per Place Details request

interface PreviewRequest {
  city?: string // DEPRECATED: Now derived from hostname server-side (ignored if provided)
  location: string // e.g., "Bournemouth, UK"
  category: SystemCategory // Now uses canonical system_category enum (e.g. 'restaurant', 'cafe')
  minRating: number
  radius: number // in meters (5000 = 5km)
  maxResults: number
  skipDuplicates?: boolean // Optional: skip already imported businesses
}

interface PlaceResult {
  id: string
  displayName: {
    text: string
  }
  rating?: number
  userRatingCount?: number
  location?: {
    latitude: number
    longitude: number
  }
  types?: string[]
  businessStatus?: string
  formattedAddress?: string
  photos?: Array<{
    name: string
    widthPx: number
    heightPx: number
  }>
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Require admin authentication
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      return NextResponse.json({
        success: false,
        error: 'Admin authentication required'
      }, { status: 401 })
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid admin session'
      }, { status: 401 })
    }

    // 🔒 SECURITY: Derive city from hostname (never trust client)
    // Allow ?city= override on fallback hosts (localhost/vercel preview) for development
    const cityRes = await resolveRequestCity(request, { allowQueryOverride: true })
    
    if (!cityRes.ok) {
      return NextResponse.json({
        success: false,
        error: cityRes.error,
        hostname: request.headers.get('host') || ''
      }, { status: cityRes.status })
    }
    
    const requestCity = cityRes.city

    // Verify admin exists and has permission for this city
    const admin = await getAdminById(adminSession.adminId)
    if (!admin || !await isAdminForCity(adminSession.adminId, requestCity)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions for this city'
      }, { status: 403 })
    }

    const body: PreviewRequest = await request.json()
    const { location, category, minRating, radius, maxResults, skipDuplicates = true } = body

    // Use requestCity (from resolved city), ignore body.city if provided
    const city = requestCity

    // Validate inputs
    if (!location || !category || minRating < 1 || radius < 100 || maxResults < 1) {
      return NextResponse.json({
        success: false,
        error: 'Invalid search parameters'
      }, { status: 400 })
    }

    // Validate system_category
    if (!isValidSystemCategory(category)) {
      return NextResponse.json({
        success: false,
        error: `Invalid category: ${category}. Must be a valid SystemCategory enum.`
      }, { status: 400 })
    }

    // Hard minimum rating of 4.4
    if (minRating < 4.4) {
      return NextResponse.json({
        success: false,
        error: 'Minimum rating must be at least 4.4 stars'
      }, { status: 400 })
    }

    // Get Google Places API key, cached lat/lng, AND country constraints from franchise config
    const supabase = createServiceRoleClient()
    const { data: franchiseConfig, error: configError } = await supabase
      .from('franchise_crm_configs')
      .select('google_places_api_key, lat, lng, display_name, country_code, country_name')
      .eq('city', city.toLowerCase())
      .single()

    if (configError || !franchiseConfig) {
      return NextResponse.json({
        success: false,
        error: `Franchise configuration not found for ${city}`
      }, { status: 400 })
    }

    if (!franchiseConfig.google_places_api_key) {
      return NextResponse.json({
        success: false,
        error: `Google Places API key not configured for ${city}. Please add it in Admin > Franchise Setup before importing businesses.`
      }, { status: 400 })
    }

    const apiKey = franchiseConfig.google_places_api_key

    // Get Google type from our category
    const categoryConfig = CATEGORY_MAPPING[category]
    if (!categoryConfig) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category selected'
      }, { status: 400 })
    }

    console.log(`🔍 Searching Google Places (NEW API): ${location}, Category: ${category}`)

    // Step 1: Get lat/lng - use cached or geocode once
    let lat = franchiseConfig.lat
    let lng = franchiseConfig.lng

    if (!lat || !lng) {
      // CRITICAL: Normalize location to prevent cross-country imports
      // Example: "Manchester" → "Manchester, United Kingdom" (not Manchester, USA)
      // Country constraint hierarchy (strongest → weakest):
      // 1. includedRegionCodes (hard filter on Places API) ← MOST IMPORTANT
      // 2. Normalized address with country name (strong hint)
      // 3. region parameter (weak bias)
      const normalizedLocation = `${location}, ${franchiseConfig.country_name}`
      console.log(`📍 No cached coordinates for ${city}, geocoding "${normalizedLocation}"...`)
      
      // Geocode using Google Geocoding API with region biasing + language
      // Note: region= is a bias (not hard limit), but combined with normalized address, it's very reliable
      // language= improves formatting consistency (addresses, names feel more native)
      const languageCode = franchiseConfig.country_code === 'AE' ? 'ar' : `en-${franchiseConfig.country_code}`
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(normalizedLocation)}&region=${franchiseConfig.country_code.toLowerCase()}&language=${languageCode}&key=${apiKey}`
      
      console.log(`🌍 Geocoding URL: ${geocodeUrl.replace(apiKey, 'API_KEY_HIDDEN')}`)
      
      const geocodeResponse = await fetch(geocodeUrl)
      const geocodeData = await geocodeResponse.json()

      console.log(`📍 Geocoding response status: ${geocodeData.status}`)
      
      if (geocodeData.status !== 'OK' || !geocodeData.results?.[0]) {
        // Log the actual Google error for debugging
        console.error(`❌ Geocoding failed:`, JSON.stringify(geocodeData, null, 2))
        
        // Provide helpful error message based on Google's response
        let errorMessage = `Could not find location: ${location}.`
        
        if (geocodeData.status === 'REQUEST_DENIED') {
          errorMessage = `Google Maps API error: ${geocodeData.error_message || 'REQUEST_DENIED'}. Check that:\n1. Geocoding API is enabled\n2. Billing is enabled\n3. API key restrictions allow server-side requests (no HTTP referrer restrictions)`
        } else if (geocodeData.status === 'ZERO_RESULTS') {
          errorMessage = `Location not found: "${normalizedLocation}". Please verify the location name and try again.`
        } else if (geocodeData.error_message) {
          errorMessage = `Google Maps API error: ${geocodeData.error_message}`
        }
        
        return NextResponse.json({
          success: false,
          error: errorMessage,
          debug: {
            status: geocodeData.status,
            normalizedLocation,
            errorMessage: geocodeData.error_message
          }
        }, { status: 400 })
      }

      const coords = geocodeData.results[0].geometry.location
      lat = coords.lat
      lng = coords.lng

      // Cache coordinates for future use
      console.log(`💾 Caching coordinates for ${city}: ${lat}, ${lng}`)
      await supabase
        .from('franchise_crm_configs')
        .update({ lat, lng })
        .eq('city', city.toLowerCase())
      
      console.log(`✅ Coordinates cached - future searches will skip geocoding`)
    } else {
      console.log(`✅ Using cached coordinates for ${city}: ${lat}, ${lng}`)
    }

    // CRITICAL: Cast lat/lng to numbers (Supabase NUMERIC columns can return as strings)
    const latNum = typeof lat === 'string' ? parseFloat(lat) : lat
    const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng

    // Validate coordinates are valid numbers
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      console.error(`❌ Invalid coordinates for ${city}: lat=${lat}, lng=${lng}`)
      return NextResponse.json({
        success: false,
        error: `Invalid coordinates stored for ${city}. Please contact support.`
      }, { status: 500 })
    }

    // Validate coordinates are within valid range
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      console.error(`❌ Coordinates out of range for ${city}: lat=${latNum}, lng=${lngNum}`)
      return NextResponse.json({
        success: false,
        error: `Coordinates out of valid range for ${city}. Please contact support.`
      }, { status: 500 })
    }

    // Clamp radius to safe values (Google Places API limits)
    // Min: 500m (avoid too-small searches that return nothing)
    // Max: 50km (Google's practical limit for accurate results)
    const radiusMeters = Math.max(500, Math.min(radius, 50000))
    
    if (radiusMeters !== radius) {
      console.warn(`⚠️ Radius clamped from ${radius}m to ${radiusMeters}m`)
    }

    console.log(`📍 Search center: ${latNum}, ${lngNum} | Radius: ${radiusMeters}m`)

    // Step 2: Search using Places API (New) - Nearby Search
    // Strategy: Oversample then filter (collect more raw results than needed, filter by quality, then return top N)
    const TARGET_POOL = Math.min(200, maxResults * 5) // Collect 5x more than needed, capped at 200
    const searchResults: PlaceResult[] = []
    let requestsMade = 0 // Track actual API requests for accurate cost calculation
    
    for (const type of categoryConfig.googleTypes) {
      if (searchResults.length >= TARGET_POOL) break

      // NEW API: POST request with JSON body
      const searchUrl = 'https://places.googleapis.com/v1/places:searchNearby'
      
      const searchBody = {
        includedTypes: [type],
        maxResultCount: 20, // Always request 20 (Google's max per call) to build a larger pool
        rankPreference: 'DISTANCE', // Prioritize geographic coverage over popularity (reduces chain/hotel dominance)
        locationRestriction: {
          circle: {
            center: {
              latitude: latNum,
              longitude: lngNum
            },
            radius: radiusMeters
          }
        }
        // NOTE: searchNearby doesn't support includedRegionCodes
        // Country constraint comes from the normalized/geocoded center point
        // (e.g., "Bournemouth, United Kingdom" geocodes to UK coordinates)
      }

      requestsMade++ // Increment before fetch for accurate tracking
      const searchResponse = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.location,places.types,places.businessStatus,places.formattedAddress,places.photos'
        },
        body: JSON.stringify(searchBody)
      })

      const searchData = await searchResponse.json()

      if (!searchResponse.ok) {
        console.error(`❌ Places API error for type ${type}:`, JSON.stringify(searchData, null, 2))
      }

      if (searchData.places && searchData.places.length > 0) {
        searchResults.push(...searchData.places)
        console.log(`📊 Found ${searchData.places.length} results for type: ${type}`)
      } else {
        console.warn(`⚠️ Search failed for type ${type}:`, searchData.error?.message || 'No results')
      }
    }

    console.log(`📊 Total raw results: ${searchResults.length}`)

    // Step 3: Filter and validate results
    const rejectedBusinesses: Array<{ name: string; reason: string }> = []
    
    const validBusinesses = searchResults
      .filter((place, index, self) => {
        // Deduplication by place id
        if (self.findIndex(p => p.id === place.id) !== index) {
          return false
        }

        // Must have required fields
        if (!place.displayName?.text || !place.id) {
          console.log(`❌ Skipping: Missing name or id`)
          return false
        }

        // Filter out hotels/lodging (they contaminate restaurant searches)
        const types = new Set(place.types ?? [])
        if (types.has('lodging')) {
          console.log(`❌ Skipping lodging: ${place.displayName.text}`)
          rejectedBusinesses.push({ name: place.displayName.text, reason: 'Lodging (not a business)' })
          return false
        }

        // Must meet minimum rating (if rating exists)
        if (place.rating && place.rating < minRating) {
          console.log(`❌ Skipping ${place.displayName.text}: Rating ${place.rating} < ${minRating}`)
          rejectedBusinesses.push({ name: place.displayName.text, reason: `Rating ${place.rating} < ${minRating}` })
          return false
        }

        // Must be operational (not permanently or temporarily closed)
        // Temporarily closed businesses can reopen, but we exclude them by default to keep imports clean
        if (place.businessStatus === 'CLOSED_PERMANENTLY' || place.businessStatus === 'CLOSED_TEMPORARILY') {
          console.log(`❌ Skipping ${place.displayName.text}: ${place.businessStatus}`)
          rejectedBusinesses.push({ name: place.displayName.text, reason: place.businessStatus })
          return false
        }

        // Must have at least 10 reviews (avoid fake/new businesses)
        if (!place.userRatingCount || place.userRatingCount < 10) {
          console.log(`❌ Skipping ${place.displayName.text}: Only ${place.userRatingCount || 0} reviews`)
          rejectedBusinesses.push({ name: place.displayName.text, reason: `Only ${place.userRatingCount || 0} reviews` })
          return false
        }

        // Calculate distance from center (if location exists)
        if (place.location) {
          const distance = calculateDistance(
            latNum, 
            lngNum, 
            place.location.latitude, 
            place.location.longitude
          )
          if (distance > radiusMeters) {
            console.log(`❌ Skipping ${place.displayName.text}: ${distance}m > ${radiusMeters}m`)
            rejectedBusinesses.push({ name: place.displayName.text, reason: `${Math.round(distance)}m > ${radiusMeters}m radius` })
            return false
          }
        }

        // 🔒 TWO-STAGE CATEGORY FILTERING (CRITICAL QUALITY CHECK)
        // Stage 1: Google search (broad, keeps costs predictable)
        // Stage 2: Hard filter (precise, prevents category pollution)
        const categoryKey = categoryConfig.categoryKey
        const categoryValidation = validateCategoryMatch(
          {
            name: place.displayName.text,
            types: place.types,
            primary_type: place.types?.[0], // Google returns primary type first
          },
          categoryKey
        )

        if (!categoryValidation.valid) {
          console.log(`❌ CATEGORY MISMATCH: ${place.displayName.text} - ${categoryValidation.reason}`)
          rejectedBusinesses.push({ 
            name: place.displayName.text, 
            reason: `Category mismatch: ${categoryValidation.reason}` 
          })
          return false
        }

        return true
      })
      .slice(0, maxResults) // Limit to max results

    console.log(`✅ Valid businesses after filtering: ${validBusinesses.length}`)

    // Step 4: Format for frontend
    const previewResults = validBusinesses.map(place => {
      const distance = place.location 
        ? calculateDistance(latNum, lngNum, place.location.latitude, place.location.longitude)
        : 0
      
      return {
        placeId: place.id,
        name: place.displayName.text,
        rating: place.rating || 0,
        reviewCount: place.userRatingCount || 0,
        address: place.formattedAddress || 'Address not available',
        category: categoryConfig.displayName, // Display label (consistent for all results in this search)
        systemCategory: category, // The stable enum value for reference
        distance: Math.round(distance),
        status: place.businessStatus || 'OPERATIONAL',
        hasPhoto: !!place.photos?.[0]?.name,
        photoName: place.photos?.[0]?.name || null
      }
    })

    // Calculate costs with clear separation
    // Preview cost = Nearby Search requests made during this preview (ACTUAL, not planned)
    const previewCost = (requestsMade * GOOGLE_PLACES_NEARBY_BASIC_GBP).toFixed(2)
    
    // Import cost = Place Details call per selected business
    const estimatedImportCost = (validBusinesses.length * GOOGLE_PLACES_DETAILS_BASIC_GBP).toFixed(2)

    return NextResponse.json({
      success: true,
      results: previewResults,
      totalRaw: searchResults.length, // Total raw results from Google (before filtering)
      totalFound: validBusinesses.length, // Valid businesses after all filters
      totalRejected: rejectedBusinesses.length, // Businesses rejected by filters
      rejected: rejectedBusinesses, // Array of rejected businesses with reasons
      costs: {
        preview: {
          amount: previewCost,
          description: `Preview search cost (${requestsMade} API requests made)`,
          alreadyCharged: true
        },
        import: {
          amount: estimatedImportCost,
          perBusiness: GOOGLE_PLACES_DETAILS_BASIC_GBP.toFixed(3),
          description: `Place Details call per selected business (gets phone, website, hours)`,
          alreadyCharged: false
        }
      },
      center: { lat: latNum, lng: lngNum },
      message: `Found ${validBusinesses.length} valid businesses from ${searchResults.length} raw results (${rejectedBusinesses.length} rejected by quality filters)`
    })

  } catch (error: any) {
    console.error('❌ Preview search error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to search businesses'
    }, { status: 500 })
  }
}

// Simple Haversine distance calculation (in meters)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

