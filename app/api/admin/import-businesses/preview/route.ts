import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { CATEGORY_MAPPING } from '@/lib/constants/category-mapping'

interface PreviewRequest {
  city: string
  location: string // e.g., "Bournemouth, UK"
  category: keyof typeof CATEGORY_MAPPING
  minRating: number
  radius: number // in meters (5000 = 5km)
  maxResults: number
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
    const body: PreviewRequest = await request.json()
    const { city, location, category, minRating, radius, maxResults } = body

    // Validate inputs
    if (!city || !location || !category || minRating < 1 || radius < 100 || maxResults < 1) {
      return NextResponse.json({
        success: false,
        error: 'Invalid search parameters'
      }, { status: 400 })
    }

    // Hard minimum rating of 4.4
    if (minRating < 4.4) {
      return NextResponse.json({
        success: false,
        error: 'Minimum rating must be at least 4.4 stars'
      }, { status: 400 })
    }

    // Get Google Places API key from franchise config
    const supabase = createServiceRoleClient()
    const { data: franchiseConfig, error: configError } = await supabase
      .from('franchise_crm_configs')
      .select('google_places_api_key')
      .eq('city', city.toLowerCase())
      .single()

    if (configError || !franchiseConfig?.google_places_api_key) {
      return NextResponse.json({
        success: false,
        error: 'Google Places API key not configured for this franchise. Please add it in Franchise Setup.'
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

    // Step 1: Geocode the location to get lat/lng (still uses legacy Geocoding API)
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`
    const geocodeResponse = await fetch(geocodeUrl)
    const geocodeData = await geocodeResponse.json()

    if (geocodeData.status !== 'OK' || !geocodeData.results?.[0]) {
      return NextResponse.json({
        success: false,
        error: `Could not find location: ${location}`
      }, { status: 400 })
    }

    const { lat, lng } = geocodeData.results[0].geometry.location
    console.log(`📍 Location found: ${lat}, ${lng}`)

    // Step 2: Search using Places API (New) - Nearby Search
    const searchResults: PlaceResult[] = []
    
    for (const type of categoryConfig.googleTypes) {
      if (searchResults.length >= maxResults) break

      // NEW API: POST request with JSON body
      const searchUrl = 'https://places.googleapis.com/v1/places:searchNearby'
      
      const searchBody = {
        includedTypes: [type],
        maxResultCount: Math.min(20, maxResults - searchResults.length),
        locationRestriction: {
          circle: {
            center: {
              latitude: lat,
              longitude: lng
            },
            radius: radius
          }
        }
      }

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

      if (searchData.places && searchData.places.length > 0) {
        searchResults.push(...searchData.places)
        console.log(`📊 Found ${searchData.places.length} results for type: ${type}`)
      } else {
        console.warn(`⚠️ Search failed for type ${type}:`, searchData.error?.message || 'No results')
      }
    }

    console.log(`📊 Total raw results: ${searchResults.length}`)

    // Step 3: Filter and validate results
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

        // Must meet minimum rating (if rating exists)
        if (place.rating && place.rating < minRating) {
          console.log(`❌ Skipping ${place.displayName.text}: Rating ${place.rating} < ${minRating}`)
          return false
        }

        // Must be operational (not permanently closed)
        if (place.businessStatus === 'CLOSED_PERMANENTLY') {
          console.log(`❌ Skipping ${place.displayName.text}: Permanently closed`)
          return false
        }

        // Must have at least 10 reviews (avoid fake/new businesses)
        if (!place.userRatingCount || place.userRatingCount < 10) {
          console.log(`❌ Skipping ${place.displayName.text}: Only ${place.userRatingCount || 0} reviews`)
          return false
        }

        // Calculate distance from center (if location exists)
        if (place.location) {
          const distance = calculateDistance(
            lat, 
            lng, 
            place.location.latitude, 
            place.location.longitude
          )
          if (distance > radius) {
            console.log(`❌ Skipping ${place.displayName.text}: ${distance}m > ${radius}m`)
            return false
          }
        }

        return true
      })
      .slice(0, maxResults) // Limit to max results

    console.log(`✅ Valid businesses after filtering: ${validBusinesses.length}`)

    // Step 4: Format for frontend
    const previewResults = validBusinesses.map(place => {
      const distance = place.location 
        ? calculateDistance(lat, lng, place.location.latitude, place.location.longitude)
        : 0
      
      return {
        placeId: place.id,
        name: place.displayName.text,
        rating: place.rating || 0,
        reviewCount: place.userRatingCount || 0,
        address: place.formattedAddress || 'Address not available',
        category: categoryConfig.displayName,
        businessType: categoryConfig.businessType,
        distance: Math.round(distance),
        status: place.businessStatus || 'OPERATIONAL',
        hasPhoto: !!place.photos?.[0]?.name,
        photoName: place.photos?.[0]?.name || null
      }
    })

    // Calculate estimated cost
    // NEW API costs (2024 pricing - estimates):
    // - Nearby Search: Basic fields ~$0.024 (£0.019) per request
    // - Place Details: ~$0.017 (£0.014) per business
    const searchCost = (categoryConfig.googleTypes.length * 0.019).toFixed(2)
    const importCostPerBusiness = 0.014
    const totalImportCost = (validBusinesses.length * importCostPerBusiness).toFixed(2)

    return NextResponse.json({
      success: true,
      results: previewResults,
      totalFound: validBusinesses.length,
      searchCost: searchCost,
      estimatedImportCost: totalImportCost,
      center: { lat, lng },
      message: `Found ${validBusinesses.length} businesses matching your criteria`
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

