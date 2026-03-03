import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/kb-eligible
 * 
 * Fetch AI-eligible businesses from business_profiles_ai_eligible view
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
    const cookieStore = await cookies()
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

    console.log('📋 Fetching AI-eligible businesses', { city })

    // Fetch from business_profiles_ai_eligible view (Tier 1: Paid/Trial only)
    let query = supabase
      .from('business_profiles_ai_eligible')
      .select('*')
      .order('business_name', { ascending: true })

    if (city) {
      query = query.eq('city', city)
    }

    const { data: businesses, error } = await query

    if (error) {
      console.error('❌ Error fetching AI-eligible businesses:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch AI-eligible businesses',
          details: error.message 
        },
        { status: 500 }
      )
    }

    const viewBusinesses = businesses || []
    console.log(`📊 View returned ${viewBusinesses.length} businesses`)

    // The view excludes free_tier, so fetch claimed free businesses separately
    let claimedFreeQuery = supabase
      .from('business_profiles')
      .select('*')
      .eq('business_tier', 'free_tier')
      .not('owner_user_id', 'is', null)

    if (city) {
      claimedFreeQuery = claimedFreeQuery.eq('city', city)
    }

    const { data: claimedFree } = await claimedFreeQuery
    const claimedFreeList = claimedFree || []
    console.log(`📊 Found ${claimedFreeList.length} claimed free businesses`)

    // Merge and deduplicate
    const seen = new Set<string>()
    const merged: any[] = []
    for (const b of [...viewBusinesses, ...claimedFreeList]) {
      if (!seen.has(b.id)) {
        seen.add(b.id)
        merged.push(b)
      }
    }

    // Filter 1: drop incomplete listings
    const EXCLUDED_STATUSES = ['incomplete', 'pending', 'rejected', 'deleted']
    const afterStatusFilter = merged.filter(
      (b: any) => !b.status || !EXCLUDED_STATUSES.includes(b.status)
    )

    // Filter 2: exclude businesses with expired trial subscriptions
    // (business_tier can be 'featured' while the subscription is actually an expired trial)
    const businessIds = afterStatusFilter.map((b: any) => b.id)
    const expiredTrialIds = new Set<string>()

    if (businessIds.length > 0) {
      const { data: subs } = await supabase
        .from('business_subscriptions')
        .select('business_id, status, free_trial_end_date, is_in_free_trial')
        .in('business_id', businessIds)

      if (subs) {
        for (const sub of subs) {
          if (sub.is_in_free_trial === true) {
            const isExpired =
              sub.status === 'cancelled' ||
              (sub.free_trial_end_date && new Date(sub.free_trial_end_date) < new Date())

            if (isExpired) {
              expiredTrialIds.add(sub.business_id)
            }
          }
        }
      }
    }

    const eligible = afterStatusFilter.filter(
      (b: any) => !expiredTrialIds.has(b.id)
    )

    eligible.sort((a: any, b: any) =>
      (a.business_name || '').localeCompare(b.business_name || '')
    )

    console.log(
      `✅ ${eligible.length} eligible (from ${merged.length} merged, ` +
      `${merged.length - afterStatusFilter.length} incomplete removed, ` +
      `${expiredTrialIds.size} expired trials removed)`
    )

    return NextResponse.json({
      success: true,
      businesses: eligible,
      count: eligible.length
    })
  } catch (error: any) {
    console.error('❌ Unexpected error in ai-eligible API:', error)
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
