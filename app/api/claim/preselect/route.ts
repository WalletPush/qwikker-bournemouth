import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'

/**
 * GET /api/claim/preselect?business_id=<uuid>
 * 
 * Server-side validation for claim preselection.
 * Only returns business data if it's eligible to be claimed in the current city.
 * 
 * SECURITY:
 * - City derived from hostname (no client input)
 * - Validates business_id is a valid UUID
 * - Validates status='unclaimed' AND owner_user_id IS NULL
 * - Returns minimal fields only (no sensitive data)
 */
export async function GET(request: NextRequest) {
  try {
    // Extract business_id from query params
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('business_id')

    if (!businessId) {
      return NextResponse.json(
        { error: 'Invalid business_id' },
        { status: 400 }
      )
    }

    // Validate UUID format (strict)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(businessId)) {
      return NextResponse.json(
        { error: 'Invalid business_id' },
        { status: 400 }
      )
    }

    // SECURITY: Derive city from hostname (server-side, no client trust)
    const hostname = request.headers.get('host') || ''
    let requestCity: string
    try {
      requestCity = await getCityFromHostname(hostname)
    } catch (error) {
      console.error('City detection failed:', error)
      return NextResponse.json(
        { error: 'Invalid franchise city' },
        { status: 403 }
      )
    }

    // Use admin client for read (bypasses RLS for franchise-level queries)
    const supabase = createAdminClient()

    // Query business_profiles with strict eligibility checks
    const { data: business, error } = await supabase
      .from('business_profiles')
      .select('id, business_name, system_category, business_address, city')
      .eq('id', businessId)
      .eq('city', requestCity)
      .eq('status', 'unclaimed')
      .is('owner_user_id', null)
      .single()

    if (error || !business) {
      // Business not found or not eligible
      return NextResponse.json(
        { error: 'Not eligible' },
        { status: 404 }
      )
    }

    // Return minimal fields needed for UI
    return NextResponse.json({
      business: {
        id: business.id,
        name: business.business_name,
        address: business.business_address,
        city: business.city,
        category: business.system_category
      }
    })

  } catch (error) {
    console.error('Preselect API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

