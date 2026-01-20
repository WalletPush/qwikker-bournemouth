import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/kb-eligible
 * 
 * Fetch KB-eligible businesses from business_profiles_kb_eligible view
 * 
 * This ensures the "Select Target for Knowledge Base" dropdown ONLY shows
 * businesses eligible for paid AI exposure:
 * - status='approved'
 * - Has valid subscription (paid active OR trial active)
 * - NOT auto_imported (unless claimed and approved)
 * - Trial NOT expired
 * 
 * Query params:
 * - city: filter by city (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for admin access
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Get city from query params
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')

    console.log('📋 Fetching KB-eligible businesses', { city })

    // Fetch from business_profiles_kb_eligible view
    let query = supabase
      .from('business_profiles_kb_eligible')
      .select('*')
      .order('tier_priority', { ascending: true }) // Spotlight first, then featured/trial, then starter
      .order('business_name', { ascending: true }) // Within tier, alphabetical

    if (city) {
      query = query.eq('city', city)
    }

    const { data: businesses, error } = await query

    if (error) {
      console.error('❌ Error fetching KB-eligible businesses:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch KB-eligible businesses',
          details: error.message 
        },
        { status: 500 }
      )
    }

    console.log(`✅ Found ${businesses?.length || 0} KB-eligible businesses`)
    
    // Log tier distribution for debugging
    if (businesses && businesses.length > 0) {
      const tierCounts = businesses.reduce((acc: any, b: any) => {
        const tier = b.effective_tier || 'unknown'
        acc[tier] = (acc[tier] || 0) + 1
        return acc
      }, {})
      console.log('📊 KB-eligible tier distribution:', tierCounts)
    }

    return NextResponse.json({
      success: true,
      businesses: businesses || [],
      count: businesses?.length || 0
    })
  } catch (error: any) {
    console.error('❌ Unexpected error in kb-eligible API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
