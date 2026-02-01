import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveRequestCity } from '@/lib/utils/tenant-city'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'

interface TextSearchRequest {
  textQuery: string // e.g., "Bollywood Indian Cuisine"
  location: string // e.g., "Bali, Indonesia"
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Require admin authentication
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      console.log('❌ No admin session cookie found')
      return NextResponse.json({
        success: false,
        error: 'Admin authentication required'
      }, { status: 401 })
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      console.log('❌ Invalid admin session cookie')
      return NextResponse.json({
        success: false,
        error: 'Invalid admin session'
      }, { status: 401 })
    }

    // 🌍 TENANT CONTEXT: Derive city from hostname
    const requestCity = await resolveRequestCity(request)
    
    // Verify admin has access to this city
    const admin = await getAdminById(adminSession.adminId)
    if (!admin || !(await isAdminForCity(adminSession.adminId, requestCity))) {
      console.log('❌ Admin lacks permission for city:', requestCity)
      return NextResponse.json({
        success: false,
        error: `You don't have admin access to ${requestCity}`
      }, { status: 403 })
    }

    const body: TextSearchRequest = await request.json()
    const { textQuery, location } = body

    if (!textQuery || !location) {
      return NextResponse.json({
        success: false,
        error: 'Missing textQuery or location'
      }, { status: 400 })
    }

    // Get Google Places API key from franchise config
    const { data: franchiseConfig, error: configError } = await supabase
      .from('franchise_crm_configs')
      .select('google_places_api_key, display_name, country_code')
      .eq('city', requestCity.toLowerCase())
      .single()

    if (configError || !franchiseConfig) {
      return NextResponse.json({
        success: false,
        error: `Franchise configuration not found for ${requestCity}`
      }, { status: 400 })
    }

    if (!franchiseConfig.google_places_api_key) {
      return NextResponse.json({
        success: false,
        error: `Google Places API key not configured for ${requestCity}`
      }, { status: 400 })
    }

    const apiKey = franchiseConfig.google_places_api_key

    console.log(`🔍 Text search for: "${textQuery}" in ${location}`)
    console.log(`📍 Location bias: lat=${franchiseConfig.lat}, lng=${franchiseConfig.lng}`)

    // Google Places API - Text Search
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText'
    
    const requestBody: any = {
      textQuery: `${textQuery} in ${location}`
    }
    
    // Only add locationBias if we have coordinates
    if (franchiseConfig.lat && franchiseConfig.lng) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: franchiseConfig.lat,
            longitude: franchiseConfig.lng
          },
          radius: 50000 // 50km radius
        }
      }
    }
    
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2))
    
    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.primaryType,places.location'
      },
      body: JSON.stringify(requestBody)
    })

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error('❌ Google Places Text Search error:', errorText)
      console.error('Status:', searchResponse.status, searchResponse.statusText)
      return NextResponse.json({
        success: false,
        error: `Google Places API error: ${searchResponse.status} ${searchResponse.statusText}`
      }, { status: 500 })
    }

    const searchData = await searchResponse.json()
    console.log('📦 Raw response:', JSON.stringify(searchData, null, 2))
    const places = searchData.places || []

    console.log(`✅ Found ${places.length} businesses matching "${textQuery}"`)

    // Format results
    const results = places.map((place: any) => ({
      placeId: place.id.replace('places/', ''),
      name: place.displayName?.text || 'Unknown',
      rating: place.rating || 0,
      reviewCount: place.userRatingCount || 0,
      address: place.formattedAddress || '',
      category: place.primaryType || 'business',
      googleTypes: place.types || [],
      googlePrimaryType: place.primaryType,
      distance: 0, // Not calculated for text search
      status: 'ready',
      hasPhoto: false,
      photoName: null
    }))

    return NextResponse.json({
      success: true,
      results,
      totalFound: results.length,
      costs: {
        preview: {
          amount: '£0.025', // Text Search cost
          requests: 1,
          description: '1 Text Search request'
        },
        import: {
          estimatedPerBusiness: '£0.017',
          estimatedTotal: `£${(results.length * 0.017).toFixed(2)}`,
          businessCount: results.length,
          description: 'Place Details requests'
        }
      }
    })

  } catch (error: any) {
    console.error('Text search error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to search businesses'
    }, { status: 500 })
  }
}
