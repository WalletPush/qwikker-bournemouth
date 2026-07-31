import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'

/**
 * Admin-only API route to set (or clear) a custom placeholder image for an
 * UNCLAIMED business.
 *
 * Safety rules:
 * - Franchise-scoped (admin can only modify businesses in their city)
 * - Only unclaimed businesses can have placeholder overrides
 * - Pass `url: null` to remove the custom image and fall back to the pool
 */
export async function POST(req: Request) {
  try {
    const { businessId, url } = await req.json()

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
    }

    // url must be an http(s) URL or explicitly null (to clear)
    const clearing = url === null
    if (!clearing && (typeof url !== 'string' || !/^https?:\/\//i.test(url))) {
      return NextResponse.json(
        { error: 'url must be an http(s) URL, or null to clear' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const city = await getFranchiseCityFromRequest()

    const { data: business, error: bErr } = await supabase
      .from('business_profiles')
      .select('id, city, status, business_name')
      .eq('id', businessId)
      .eq('city', city) // 🔒 Franchise scope
      .single()

    if (bErr || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (business.status !== 'unclaimed') {
      return NextResponse.json(
        { error: 'Only unclaimed listings can use custom placeholders. Claimed businesses upload real images.' },
        { status: 400 }
      )
    }

    const { error: uErr } = await supabase
      .from('business_profiles')
      .update({ placeholder_custom_url: clearing ? null : url })
      .eq('id', businessId)

    if (uErr) {
      console.error('Failed to update placeholder_custom_url:', uErr)
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    console.log(
      `✅ ${clearing ? 'Cleared' : 'Set'} custom placeholder for ${business.business_name} (${businessId})`
    )

    return NextResponse.json({ success: true, businessId, url: clearing ? null : url })
  } catch (error: any) {
    console.error('Error updating placeholder_custom_url:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
