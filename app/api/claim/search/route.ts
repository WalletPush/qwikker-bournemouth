import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Search for unclaimed businesses
 * POST /api/claim/search
 * Body: { query: string, city?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { query, city = 'bournemouth' } = await request.json()

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        success: false, 
        error: 'Search query must be at least 2 characters' 
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Search for unclaimed businesses matching the query
    const { data: businesses, error } = await supabase
      .from('business_profiles')
      .select('id, business_name, business_address, business_town, business_postcode, business_type, business_category, business_tagline, logo_url, hero_image_url, google_place_id, status')
      .eq('city', city)
      .eq('status', 'unclaimed')
      .or(`business_name.ilike.%${query}%,business_category.ilike.%${query}%,business_type.ilike.%${query}%`)
      .order('business_name')
      .limit(10)

    if (error) {
      console.error('Error searching businesses:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to search businesses' 
      }, { status: 500 })
    }

    // Format results for the UI
    const results = (businesses || []).map(business => ({
      id: business.id,
      name: business.business_name,
      address: `${business.business_address}, ${business.business_town}${business.business_postcode ? ', ' + business.business_postcode : ''}`,
      category: business.business_category || business.business_type,
      tagline: business.business_tagline,
      image: business.hero_image_url || business.logo_url || '/placeholder-business.jpg',
      status: business.status,
      // Note: Google ratings will be added when we implement Google Places API integration
      rating: null,
      reviewCount: null
    }))

    return NextResponse.json({
      success: true,
      results,
      count: results.length
    })

  } catch (error: any) {
    console.error('Claim search error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}

