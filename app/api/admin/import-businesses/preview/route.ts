import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveRequestCity } from '@/lib/utils/tenant-city'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import type { FranchiseCity } from '@/lib/utils/city-detection'
import { CATEGORY_MAPPING } from '@/lib/constants/category-mapping'
import { validatePlace } from '@/lib/import/validate-place'
import {
  type SystemCategory,
  isValidSystemCategory,
} from '@/lib/constants/system-categories'

// Guardrails
const MAX_GRID_POINTS = 25
const MAX_TYPES_PER_CATEGORY = 15
const MAX_REQUESTS_PER_PREVIEW = 400
const TARGET_VALID_UNIQUES = 150
const GRID_CELL_RADIUS = 3000
const GRID_CELL_SPACING = GRID_CELL_RADIUS * 1.2

// Grid activation thresholds by category type count
const GRID_RADIUS_THRESHOLD_MANY_TYPES = 3000  // Categories with 5+ types
const GRID_RADIUS_THRESHOLD_FEW_TYPES = 5000   // Categories with <5 types

interface PreviewRequest {
  city?: string
  location: string
  category: SystemCategory
  minRating: number
  radius: number
  maxResults: number
  skipDuplicates?: boolean
}

interface PlaceResult {
  id: string
  displayName: { text: string }
  rating?: number
  userRatingCount?: number
  location?: { latitude: number; longitude: number }
  types?: string[]
  primaryType?: string
  businessStatus?: string
  formattedAddress?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  photos?: Array<{ name: string; widthPx: number; heightPx: number }>
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      return NextResponse.json({ success: false, error: 'Admin authentication required' }, { status: 401 })
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid admin session' }, { status: 401 })
    }

    const cityRes = await resolveRequestCity(request, { allowQueryOverride: true })
    if (!cityRes.ok) {
      return NextResponse.json({ success: false, error: cityRes.error, hostname: request.headers.get('host') || '' }, { status: cityRes.status })
    }
    const requestCity = cityRes.city

    const admin = await getAdminById(adminSession.adminId)
    if (!admin || !await isAdminForCity(adminSession.adminId, requestCity as FranchiseCity)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions for this city' }, { status: 403 })
    }

    const body: PreviewRequest = await request.json()
    const { location, category, minRating, radius, maxResults } = body
    const city = requestCity

    if (!category || minRating < 1 || radius < 100 || maxResults < 1) {
      return NextResponse.json({ success: false, error: 'Invalid search parameters' }, { status: 400 })
    }
    if (!isValidSystemCategory(category)) {
      return NextResponse.json({ success: false, error: `Invalid category: ${category}` }, { status: 400 })
    }
    if (minRating < 4.4) {
      return NextResponse.json({ success: false, error: 'Minimum rating must be at least 4.4 stars' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { data: franchiseConfig, error: configError } = await supabase
      .from('franchise_crm_configs')
      .select('google_places_api_key, lat, lng, display_name, country_code, country_name')
      .eq('city', city.toLowerCase())
      .single()

    if (configError || !franchiseConfig) {
      return NextResponse.json({ success: false, error: `Franchise configuration not found for ${city}` }, { status: 400 })
    }
    if (!franchiseConfig.google_places_api_key) {
      return NextResponse.json({ success: false, error: `Google Places API key not configured for ${city}. Please add it in Admin > Franchise Setup.` }, { status: 400 })
    }

    const apiKey = franchiseConfig.google_places_api_key
    const categoryConfig = CATEGORY_MAPPING[category]
    if (!categoryConfig) {
      return NextResponse.json({ success: false, error: 'Invalid category selected' }, { status: 400 })
    }

    // ====================================================================
    // PHASE 1: Resolve coordinates from the admin's location input
    // ====================================================================
    const normalizedLocation = (location || '').replace(/\s+/g, ' ').trim()
    const franchiseDisplayNorm = (franchiseConfig.display_name || '').replace(/\s+/g, ' ').trim().toLowerCase()

    let latNum: number
    let lngNum: number
    let resolutionMethod: string

    const coordsRegex = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/
    const coordsMatch = normalizedLocation.match(coordsRegex)

    if (!normalizedLocation) {
      // Empty location -> franchise cached coords
      const cachedLat = typeof franchiseConfig.lat === 'string' ? parseFloat(franchiseConfig.lat) : franchiseConfig.lat
      const cachedLng = typeof franchiseConfig.lng === 'string' ? parseFloat(franchiseConfig.lng) : franchiseConfig.lng
      if (!Number.isFinite(cachedLat) || !Number.isFinite(cachedLng)) {
        return NextResponse.json({ success: false, error: 'No location provided and no cached coordinates for this franchise.' }, { status: 400 })
      }
      latNum = cachedLat
      lngNum = cachedLng
      resolutionMethod = 'franchise_cached'
      console.log(`📍 Empty location, using franchise cached coords: ${latNum}, ${lngNum}`)

    } else if (coordsMatch) {
      // Raw coordinates
      latNum = parseFloat(coordsMatch[1])
      lngNum = parseFloat(coordsMatch[2])
      resolutionMethod = 'raw_coords'
      console.log(`📍 Parsed raw coordinates: ${latNum}, ${lngNum}`)

    } else if (normalizedLocation.toLowerCase() === franchiseDisplayNorm && franchiseConfig.lat && franchiseConfig.lng) {
      // Matches franchise display name -> use cached
      latNum = typeof franchiseConfig.lat === 'string' ? parseFloat(franchiseConfig.lat) : franchiseConfig.lat
      lngNum = typeof franchiseConfig.lng === 'string' ? parseFloat(franchiseConfig.lng) : franchiseConfig.lng
      resolutionMethod = 'franchise_name_match'
      console.log(`📍 Location matches franchise "${franchiseConfig.display_name}", using cached coords: ${latNum}, ${lngNum}`)

    } else {
      // Different location -> geocode with country hint
      const geocodeQuery = `${normalizedLocation}, ${franchiseConfig.country_name}`
      const countryCode = (franchiseConfig.country_code || 'GB').toLowerCase()
      const languageCode = franchiseConfig.country_code === 'AE' ? 'ar' : `en-${franchiseConfig.country_code}`
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(geocodeQuery)}&region=${countryCode}&language=${languageCode}&key=${apiKey}`

      console.log(`📍 Geocoding "${geocodeQuery}" (region=${countryCode})`)
      const geocodeResponse = await fetch(geocodeUrl)
      const geocodeData = await geocodeResponse.json()

      if (geocodeData.status !== 'OK' || !geocodeData.results?.[0]) {
        let errorMessage = `Could not find location: "${normalizedLocation}".`
        if (geocodeData.status === 'REQUEST_DENIED') {
          errorMessage = `Google Maps API error: ${geocodeData.error_message || 'REQUEST_DENIED'}. Check Geocoding API is enabled and billing is active.`
        } else if (geocodeData.status === 'ZERO_RESULTS') {
          errorMessage = `Location not found: "${geocodeQuery}". Please refine the location name.`
        }
        return NextResponse.json({ success: false, error: errorMessage }, { status: 400 })
      }

      const result = geocodeData.results[0]
      const coords = result.geometry.location

      // Country validation: check resolved country matches franchise
      const addressComponents = result.address_components || []
      const resolvedCountry = addressComponents.find((c: { types?: string[] }) => c.types?.includes('country'))
      if (resolvedCountry && franchiseConfig.country_code) {
        const resolvedCode = resolvedCountry.short_name?.toUpperCase()
        const expectedCode = franchiseConfig.country_code.toUpperCase()
        if (resolvedCode && resolvedCode !== expectedCode) {
          return NextResponse.json({
            success: false,
            error: `Location resolved outside ${franchiseConfig.country_name} (got ${resolvedCountry.long_name}). Please add more detail (e.g., "${normalizedLocation}, ${franchiseConfig.country_name}").`
          }, { status: 400 })
        }
      }

      latNum = coords.lat
      lngNum = coords.lng
      resolutionMethod = 'geocoded'
      console.log(`📍 Geocoded "${normalizedLocation}" -> ${latNum}, ${lngNum} (${resolutionMethod})`)
    }

    // Validate coordinates
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return NextResponse.json({ success: false, error: `Invalid coordinates resolved: ${latNum}, ${lngNum}` }, { status: 400 })
    }

    const radiusMeters = Math.max(500, Math.min(radius, 50000))
    console.log(`🔍 Search: "${normalizedLocation}" (${resolutionMethod}) | Center: ${latNum}, ${lngNum} | Radius: ${radiusMeters}m | Category: ${category}`)

    // ====================================================================
    // PHASE 3: Generate search grid
    // ====================================================================
    const typesToSearch = categoryConfig.googleTypes.slice(0, MAX_TYPES_PER_CATEGORY)
    const isManyTypes = typesToSearch.length >= 5
    const gridThreshold = isManyTypes ? GRID_RADIUS_THRESHOLD_MANY_TYPES : GRID_RADIUS_THRESHOLD_FEW_TYPES

    let searchPoints: Array<{ lat: number; lng: number; cellRadius: number }>

    if (radiusMeters <= gridThreshold) {
      searchPoints = [{ lat: latNum, lng: lngNum, cellRadius: radiusMeters }]
    } else {
      // Adaptive spacing: scale so MAX_GRID_POINTS covers the full radius
      // With a grid diameter of sqrt(MAX_GRID_POINTS) ≈ 5, we want spacing = 2*radius / sqrt(MAX_GRID_POINTS)
      const gridDiameter = Math.floor(Math.sqrt(MAX_GRID_POINTS))
      const adaptiveSpacing = Math.max(GRID_CELL_SPACING, Math.ceil((2 * radiusMeters) / (gridDiameter + 1)))
      // Each cell searches a radius that covers the gap between points (with some overlap)
      const adaptiveCellRadius = Math.min(Math.ceil(adaptiveSpacing * 0.75), 50000)

      console.log(`📐 Adaptive grid: radius=${radiusMeters}m, spacing=${adaptiveSpacing}m, cellRadius=${adaptiveCellRadius}m`)

      searchPoints = generateSearchGrid(latNum, lngNum, radiusMeters, adaptiveSpacing, adaptiveCellRadius)
      if (searchPoints.length > MAX_GRID_POINTS) {
        // Evenly sample from the full set rather than taking the first N
        const step = searchPoints.length / MAX_GRID_POINTS
        const sampled: typeof searchPoints = [searchPoints[0]] // Always keep center
        for (let i = 1; i < MAX_GRID_POINTS; i++) {
          const idx = Math.min(Math.round(i * step), searchPoints.length - 1)
          sampled.push(searchPoints[idx])
        }
        searchPoints = sampled
      }
    }

    // Check estimated requests against guardrail
    const estimatedRequests = searchPoints.length * typesToSearch.length
    if (estimatedRequests > MAX_REQUESTS_PER_PREVIEW) {
      const targetPoints = Math.floor(MAX_REQUESTS_PER_PREVIEW / typesToSearch.length)
      const step = searchPoints.length / targetPoints
      const reduced: typeof searchPoints = [searchPoints[0]]
      for (let i = 1; i < targetPoints; i++) {
        const idx = Math.min(Math.round(i * step), searchPoints.length - 1)
        reduced.push(searchPoints[idx])
      }
      searchPoints = reduced
      console.warn(`⚠️ Reduced grid to ${searchPoints.length} points (would exceed ${MAX_REQUESTS_PER_PREVIEW} request limit)`)
    }

    const actualEstimatedRequests = searchPoints.length * typesToSearch.length
    console.log(`📊 Grid: ${searchPoints.length} points × ${typesToSearch.length} types = ~${actualEstimatedRequests} requests`)

    // ====================================================================
    // Search execution with early stops
    // ====================================================================
    const allResults: PlaceResult[] = []
    let requestsMade = 0
    const seenPlaceIds = new Set<string>()

    // Ensure geographic coverage: search at least this many points before allowing early stop
    const minPointsBeforeEarlyStop = Math.min(searchPoints.length, Math.max(5, Math.ceil(searchPoints.length * 0.6)))
    // Scale target to user's maxResults (never stop before we'd have enough to fill their request)
    const effectiveTarget = Math.max(TARGET_VALID_UNIQUES, maxResults * 2)

    console.log(`🎯 Early stop config: minPoints=${minPointsBeforeEarlyStop}, target=${effectiveTarget}`)

    for (let pointIdx = 0; pointIdx < searchPoints.length; pointIdx++) {
      // Only allow global early stop AFTER minimum points have been searched
      if (pointIdx >= minPointsBeforeEarlyStop && seenPlaceIds.size >= effectiveTarget) {
        console.log(`✅ Global early stop: ${seenPlaceIds.size} unique results >= ${effectiveTarget} target (after ${pointIdx} points)`)
        break
      }

      const point = searchPoints[pointIdx]
      let consecutiveEmpty = 0
      let pointSkipped = false

      for (let typeIdx = 0; typeIdx < typesToSearch.length; typeIdx++) {
        // Within a point, allow early stop only after minimum points requirement is met
        if (pointIdx >= minPointsBeforeEarlyStop && seenPlaceIds.size >= effectiveTarget) break

        const type = typesToSearch[typeIdx]

        const searchBody = {
          includedTypes: [type],
          maxResultCount: 20,
          rankPreference: 'DISTANCE',
          locationRestriction: {
            circle: {
              center: { latitude: point.lat, longitude: point.lng },
              radius: point.cellRadius,
            },
          },
        }

        requestsMade++
        const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.location,places.types,places.primaryType,places.businessStatus,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.photos',
          },
          body: JSON.stringify(searchBody),
        })

        const searchData = await searchResponse.json()

        if (searchData.places && searchData.places.length > 0) {
          consecutiveEmpty = 0
          for (const place of searchData.places) {
            if (!seenPlaceIds.has(place.id)) {
              seenPlaceIds.add(place.id)
              allResults.push(place)
            }
          }
          console.log(`📊 Point ${pointIdx + 1}/${searchPoints.length}, type ${type}: ${searchData.places.length} results (${seenPlaceIds.size} unique total)`)
        } else {
          consecutiveEmpty++
          // Sparse-area skip: only skip if 3+ consecutive types return nothing
          if (consecutiveEmpty >= 3) {
            console.log(`⏭️ Point ${pointIdx + 1}: 3 consecutive empty types, skipping remaining types for this point`)
            pointSkipped = true
            break
          }
        }
      }

      if (pointSkipped) continue
    }

    console.log(`📊 Total unique raw results: ${allResults.length} (${requestsMade} API requests)`)

    // ====================================================================
    // Filter and validate results (shared pipeline)
    // ====================================================================
    const rejectedBusinesses: Array<{ name: string; reason: string }> = []

    const validBusinesses = allResults
      .filter((place) => {
        if (!place.displayName?.text || !place.id) return false

        const result = validatePlace(
          {
            name: place.displayName.text,
            types: place.types,
            primaryType: place.primaryType,
            rating: place.rating,
            reviewCount: place.userRatingCount,
            businessStatus: place.businessStatus,
            lat: place.location?.latitude,
            lng: place.location?.longitude,
          },
          {
            minRating: minRating,
            minReviews: 10,
            excludeLodging: category !== 'hotel',
            categoryConfig,
            distanceCheck: { centerLat: latNum, centerLng: lngNum, radiusMeters },
          }
        )

        if (!result.valid) {
          console.log(`❌ Rejected ${place.displayName.text}: ${result.rejectReason}`)
          rejectedBusinesses.push({ name: place.displayName.text, reason: result.rejectReason || 'unknown' })
          return false
        }

        return true
      })
      .slice(0, maxResults)

    console.log(`✅ Valid businesses after filtering: ${validBusinesses.length}`)

    // Format for frontend
    const previewResults = validBusinesses.map(place => {
      const distance = place.location
        ? calculateDistance(latNum, lngNum, place.location.latitude, place.location.longitude)
        : 0

      const validation = validatePlace(
        { name: place.displayName.text, types: place.types, primaryType: place.primaryType },
        { categoryConfig }
      )

      return {
        placeId: place.id,
        name: place.displayName.text,
        rating: place.rating || 0,
        reviewCount: place.userRatingCount || 0,
        address: place.formattedAddress || 'Address not available',
        category: categoryConfig.displayName,
        systemCategory: category,
        googleTypes: place.types || [],
        googlePrimaryType: place.primaryType || place.types?.[0] || null,
        matchReason: validation.matchReason || null,
        distance: Math.round(distance),
        lat: place.location?.latitude ?? null,
        lng: place.location?.longitude ?? null,
        phone: place.nationalPhoneNumber || null,
        website: place.websiteUri || null,
        status: place.businessStatus || 'OPERATIONAL',
        hasPhoto: !!place.photos?.[0]?.name,
        photoName: place.photos?.[0]?.name || null,
      }
    })

    return NextResponse.json({
      success: true,
      results: previewResults,
      totalRaw: allResults.length,
      totalFound: validBusinesses.length,
      totalRejected: rejectedBusinesses.length,
      rejected: rejectedBusinesses,
      search: {
        center: { lat: latNum, lng: lngNum },
        resolvedLocation: normalizedLocation || franchiseConfig.display_name,
        resolutionMethod,
        gridPoints: searchPoints.length,
        typesSearched: typesToSearch.length,
        requestsMade,
      },
      message: `Found ${validBusinesses.length} businesses from ${allResults.length} raw results (${rejectedBusinesses.length} rejected). Searched ${searchPoints.length} point${searchPoints.length > 1 ? 's' : ''} with ${typesToSearch.length} types.`,
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to search businesses'
    console.error('❌ Preview search error:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ====================================================================
// Grid generation
// ====================================================================
function generateSearchGrid(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  cellSpacing: number,
  cellRadius: number
): Array<{ lat: number; lng: number; cellRadius: number }> {
  const points: Array<{ lat: number; lng: number; cellRadius: number }> = []

  // Always include center
  points.push({ lat: centerLat, lng: centerLng, cellRadius })

  // Convert spacing to approximate degrees
  const latDegPerMeter = 1 / 111320
  const lngDegPerMeter = 1 / (111320 * Math.cos(centerLat * Math.PI / 180))

  const latStep = cellSpacing * latDegPerMeter
  const lngStep = cellSpacing * lngDegPerMeter

  const stepsNeeded = Math.ceil(radiusMeters / cellSpacing)

  for (let i = -stepsNeeded; i <= stepsNeeded; i++) {
    for (let j = -stepsNeeded; j <= stepsNeeded; j++) {
      if (i === 0 && j === 0) continue // Already added center

      const pointLat = centerLat + (i * latStep)
      const pointLng = centerLng + (j * lngStep)

      // Only include points inside the search circle
      const dist = calculateDistance(centerLat, centerLng, pointLat, pointLng)
      if (dist <= radiusMeters) {
        points.push({ lat: pointLat, lng: pointLng, cellRadius })
      }
    }
  }

  return points
}

// ====================================================================
// Haversine distance (meters)
// ====================================================================
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const p1 = lat1 * Math.PI / 180
  const p2 = lat2 * Math.PI / 180
  const dp = (lat2 - lat1) * Math.PI / 180
  const dl = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}
