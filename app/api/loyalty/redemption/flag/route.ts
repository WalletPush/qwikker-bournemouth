import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'

/**
 * POST /api/loyalty/redemption/flag
 *
 * Business owner flags a redemption for review.
 * Does NOT reverse the redemption or affect balances.
 */
export async function POST(request: NextRequest) {
  try {
    const city = await getSafeCurrentCity()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { redemptionId, reason } = await request.json()

    if (!redemptionId) {
      return NextResponse.json({ error: 'redemptionId is required' }, { status: 400 })
    }

    const { data: business } = await supabase
      .from('business_profiles')
      .select('id, city')
      .eq('user_id', user.id)
      .single()

    if (!business || business.city !== city) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // RLS ensures business can only update their own redemptions
    const { data: updated, error } = await supabase
      .from('loyalty_redemptions')
      .update({
        flagged_at: new Date().toISOString(),
        flagged_reason: reason || null,
      })
      .eq('id', redemptionId)
      .eq('business_id', business.id)
      .select('id, flagged_at')
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: 'Redemption not found or not owned by you' }, { status: 404 })
    }

    return NextResponse.json({ success: true, flaggedAt: updated.flagged_at })
  } catch (error) {
    console.error('[loyalty/redemption/flag]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
