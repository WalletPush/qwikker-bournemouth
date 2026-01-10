import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Google Photo Proxy - Server-Side Only
 * 
 * This endpoint fetches Google Places photos server-side so we NEVER
 * expose the API key to the frontend.
 * 
 * Usage: /api/google-photo?placeId=places/ChIJ...&maxWidth=600
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const photoName = searchParams.get('photoName')
    const placeId = searchParams.get('placeId')
    const maxWidth = parseInt(searchParams.get('maxWidth') || '600')
    const city = searchParams.get('city') || 'bournemouth'

    if (!photoName && !placeId) {
      return NextResponse.json({
        error: 'Either photoName or placeId required'
      }, { status: 400 })
    }

    // Get API key from franchise config (server-side only!)
    const supabase = createServiceRoleClient()
    const { data: config } = await supabase
      .from('franchise_crm_configs')
      .select('google_places_api_key')
      .eq('city', city.toLowerCase())
      .single()

    if (!config?.google_places_api_key) {
      return NextResponse.json({
        error: 'Google Places API key not configured'
      }, { status: 500 })
    }

    const apiKey = config.google_places_api_key
    let actualPhotoName = photoName

    // If only placeId provided, fetch the latest photo name
    // (Photo names can expire, so we fetch fresh when needed)
    if (!photoName && placeId) {
      const detailsUrl = `https://places.googleapis.com/v1/${placeId}`
      const detailsResponse = await fetch(detailsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'photos'
        }
      })

      const placeData = await detailsResponse.json()
      actualPhotoName = placeData.photos?.[0]?.name

      if (!actualPhotoName) {
        return NextResponse.json({
          error: 'No photos available for this place'
        }, { status: 404 })
      }
    }

    // Fetch the photo using Places API (New)
    const photoUrl = `https://places.googleapis.com/v1/${actualPhotoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`
    
    const photoResponse = await fetch(photoUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*'
      }
    })

    if (!photoResponse.ok) {
      console.error('Failed to fetch photo:', photoResponse.statusText)
      return NextResponse.json({
        error: 'Failed to fetch photo from Google'
      }, { status: photoResponse.status })
    }

    // Stream the image back to the client
    const imageBuffer = await photoResponse.arrayBuffer()
    const contentType = photoResponse.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800', // Cache for 1 day (client), 7 days (CDN)
        'CDN-Cache-Control': 'max-age=604800', // Vercel Edge cache
      },
    })

  } catch (error: any) {
    console.error('❌ Photo proxy error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to load photo'
    }, { status: 500 })
  }
}

