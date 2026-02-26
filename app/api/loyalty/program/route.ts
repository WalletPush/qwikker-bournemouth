import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'

/**
 * GET /api/loyalty/program
 *
 * Two modes:
 * 1. No params: Returns full config for authenticated business owner's dashboard.
 * 2. ?businessId=...: Returns public program data for any visitor (user-facing pages).
 */
export async function GET(request: NextRequest) {
  try {
    const city = await getSafeCurrentCity()
    const businessIdParam = request.nextUrl.searchParams.get('businessId')

    // Public lookup by businessId (for business detail pages)
    if (businessIdParam) {
      const serviceRole = createServiceRoleClient()

      const { data: program } = await serviceRole
        .from('loyalty_programs')
        .select(
          'public_id, program_name, type, reward_threshold, reward_description, stamp_label, stamp_icon, status, primary_color, earn_instructions'
        )
        .eq('business_id', businessIdParam)
        .eq('city', city)
        .eq('status', 'active')
        .single()

      return NextResponse.json({ program: program || null })
    }

    // Owner lookup (business dashboard)
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: business } = await supabase
      .from('business_profiles')
      .select('id, city')
      .eq('user_id', user.id)
      .single()

    if (!business || business.city !== city) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: program } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('business_id', business.id)
      .single()

    return NextResponse.json({ program: program || null })
  } catch (error) {
    console.error('[loyalty/program GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
