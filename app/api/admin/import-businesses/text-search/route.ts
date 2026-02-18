import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveRequestCity } from '@/lib/utils/tenant-city'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import type { FranchiseCity } from '@/lib/utils/city-detection'
import { validatePlace } from '@/lib/import/validate-place'

interface TextSearchRequest {
  textQuery: string
  location: string
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

    // Derive city from hostname (tenant isolation)
    const cityRes = await resolveRequestCity(request, { allowQueryOverride: true })
    if (!cityRes.ok) {
      return NextResponse.json({ success: false, error: cityRes.error }, { status: cityRes.status })
    }
    const requestCity = cityRes.city

    const admin = await getAdminById(adminSession.adminId)
    if (!admin || !(await isAdminForCity(adminSession.adminId, requestCity as FranchiseCity))) {
      return NextResponse.json({ success: false, error: `No admin access for ${requestCity}` }, { status: 403 })
    }

    const body: TextSearchRequest = await request.json()
    const { textQuery, location } = body

    if (!textQuery || !location) {
      return NextResponse.json({ success: false, error: 'Missing textQuery or location' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { data: franchiseConfig, error: configError } = await supabase
      .from('franchise_crm_configs')
      .select('google_places_api_key, lat, lng, display_name, country_code')
      .eq('city', requestCity.toLowerCase())
      .single()

    if (configError || !franchiseConfig) {
      return NextResponse.json({ success: false, error: `Franchise config not found for ${requestCity}` }, { status: 400 })
    }
    if (!franchiseConfig.google_places_api_key) {
      return NextResponse.json({ success: false, error: `Google Places API key not configured for ${requestCity}` }, { status: 400 })
    }

    const apiKey = franchiseConfig.google_places_api_key
    const lat = typeof franchiseConfig.lat === 'string' ? parseFloat(franchiseConfig.lat) : franchiseConfig.lat
    const lng = typeof franchiseConfig.lng === 'string' ? parseFloat(franchiseConfig.lng) : franchiseConfig.lng

    console.log(`🔍 Text search: "${textQuery}" in ${location} (franchise: ${requestCity})`)

    // Build request -- use locationRestriction.rectangle (hard boundary)
    // Text Search API only supports rectangle, not circle
    const requestBody: Record<string, unknown> = {
      textQuery: `${textQuery} in ${location}`,
    }

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const radiusKm = 50
      const latDelta = radiusKm / 111.32
      const lngDelta = radiusKm / (111.32 * Math.cos((lat as number) * Math.PI / 180))
      requestBody.locationRestriction = {
        rectangle: {
          low: { latitude: (lat as number) - latDelta, longitude: (lng as number) - lngDelta },
          high: { latitude: (lat as number) + latDelta, longitude: (lng as number) + lngDelta },
        },
      }
    }

    const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.primaryType,places.location',
      },
      body: JSON.stringify(requestBody),
    })

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error('❌ Text Search error:', searchResponse.status, errorText)
      return NextResponse.json({
        success: false,
        error: `Google Places API error: ${searchResponse.status} ${searchResponse.statusText}`,
      }, { status: 500 })
    }

    const searchData = await searchResponse.json()
    const places = searchData.places || []

    console.log(`✅ Text search found ${places.length} raw results for "${textQuery}"`)

    // Light validation: global denylist + closed status (no rating/review/category gate
    // because the admin deliberately searched for this business by name)
    const results: Array<Record<string, unknown>> = []
    let rejected = 0

    for (const place of places) {
      const displayName = place.displayName as { text?: string } | undefined
      const placeLocation = place.location as { latitude?: number; longitude?: number } | undefined
      const name = displayName?.text || 'Unknown'

      const check = validatePlace(
        {
          name,
          types: (place.types as string[]) || [],
          primaryType: (place.primaryType as string) || undefined,
          businessStatus: (place.businessStatus as string) || undefined,
        },
        { excludeLodging: false }
      )

      if (!check.valid) {
        console.log(`❌ Text search rejected "${name}": ${check.rejectReason}`)
        rejected++
        continue
      }

      results.push({
        placeId: (place.id as string || '').replace('places/', ''),
        name,
        rating: (place.rating as number) || 0,
        reviewCount: (place.userRatingCount as number) || 0,
        address: (place.formattedAddress as string) || '',
        category: (place.primaryType as string) || 'business',
        googleTypes: (place.types as string[]) || [],
        googlePrimaryType: (place.primaryType as string) || null,
        distance: 0,
        status: 'ready',
        hasPhoto: false,
        photoName: null,
        lat: placeLocation?.latitude || null,
        lng: placeLocation?.longitude || null,
      })
    }

    console.log(`✅ Text search: ${results.length} valid, ${rejected} rejected`)

    return NextResponse.json({
      success: true,
      results,
      totalFound: results.length,
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to search businesses'
    console.error('Text search error:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
