import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/hq/franchises/[id]/geocode-center
 * 
 * Geocodes a franchise city center using Google Geocoding API.
 * Returns coordinates that can be saved as city_center_lat/lng.
 * 
 * Security:
 * - HQ admin authentication required
 * - Fetches franchise data from DB (no arbitrary address input)
 * - Uses API key from request only (not stored/returned)
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔒 SECURITY: Require HQ admin authentication
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json(
        { error: 'Invalid admin session' },
        { status: 401 }
      )
    }

    // Get franchise ID from params
    const { id: franchiseId } = await params
    
    // Get API key from request body (temporary, not stored)
    const body = await request.json()
    const { apiKey } = body
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'apiKey is required' },
        { status: 400 }
      )
    }
    
    // 🔒 SECURITY: Fetch franchise data from DB (don't accept arbitrary address)
    const supabase = createAdminClient()
    const { data: franchise, error: franchiseError } = await supabase
      .from('franchise_crm_configs')
      .select('id, display_name, country_name, city')
      .eq('id', franchiseId)
      .single()
    
    if (franchiseError || !franchise) {
      return NextResponse.json(
        { error: 'Franchise not found' },
        { status: 404 }
      )
    }
    
    // Build query from DB data only
    const query = `${franchise.display_name || franchise.city}, ${franchise.country_name || 'United Kingdom'}`
    
    // Call Google Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
    
    const response = await fetch(geocodeUrl)
    const data = await response.json()
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: `Geocoding failed: ${data.status}. ${data.error_message || 'No results found.'}` },
        { status: 400 }
      )
    }
    
    const location = data.results[0].geometry.location
    
    // Return only coordinates (don't auto-save, don't return keys)
    return NextResponse.json({
      ok: true,
      lat: location.lat,
      lng: location.lng,
      formatted_address: data.results[0].formatted_address
    })
    
  } catch (error) {
    console.error('[Geocode Center] Error:', error)
    return NextResponse.json(
      { error: 'Failed to geocode city center' },
      { status: 500 }
    )
  }
}
