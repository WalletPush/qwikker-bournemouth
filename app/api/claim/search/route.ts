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

    console.log(`🔍 [CLAIM SEARCH] Query: "${query}", City: ${city}`)

    // Search for unclaimed businesses matching the query
    const { data: businesses, error } = await supabase
      .from('business_profiles')
      .select('id, business_name, business_address, business_town, business_postcode, business_type, business_category, business_tagline, email, phone, website, business_images, rating, review_count, years_on_google, google_place_id, status')
      .eq('city', city)
      .eq('status', 'unclaimed')
      .or(`business_name.ilike.%${query}%,business_category.ilike.%${query}%,business_type.ilike.%${query}%`)
      .order('business_name')
      .limit(10)

    console.log(`🔍 [CLAIM SEARCH] Found ${businesses?.length || 0} results`)
    if (businesses && businesses.length > 0) {
      console.log(`🔍 [CLAIM SEARCH] Results:`, businesses.map(b => b.business_name).join(', '))
    }

    if (error) {
      console.error('❌ [CLAIM SEARCH] Database error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to search businesses' 
      }, { status: 500 })
    }

    if (!businesses || businesses.length === 0) {
      console.log(`⚠️ [CLAIM SEARCH] No unclaimed businesses found for query: "${query}"`)
    }

    // Format results for the UI
    const results = (businesses || []).map(business => {
      // Get first business image from array
      const firstImage = business.business_images?.[0] || '/placeholder-business.jpg'
      
      return {
        id: business.id,
        name: business.business_name,
        address: `${business.business_address}, ${business.business_town}${business.business_postcode ? ', ' + business.business_postcode : ''}`,
        category: business.business_category || business.business_type,
        tagline: business.business_tagline,
        image: firstImage,
        email: business.email,
        phone: business.phone,
        website: business.website,
        rating: business.rating,
        reviewCount: business.review_count,
        yearsOnGoogle: business.years_on_google,
        status: business.status
      }
    })

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

