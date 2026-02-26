import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTimeRemainingMs, isDisplayWindowActive } from '@/lib/loyalty/loyalty-utils'

/**
 * GET /api/loyalty/redemption/status?redemptionId=...&walletPassId=...
 *
 * Recover redemption UI state after page refresh.
 * Returns current status + time remaining on display window.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const redemptionId = params.get('redemptionId')
    const walletPassId = params.get('walletPassId')

    if (!redemptionId || !walletPassId) {
      return NextResponse.json(
        { error: 'redemptionId and walletPassId are required' },
        { status: 400 }
      )
    }

    const serviceRole = createServiceRoleClient()

    const { data: redemption } = await serviceRole
      .from('loyalty_redemptions')
      .select('id, status, reward_description, consumed_at, display_expires_at')
      .eq('id', redemptionId)
      .eq('user_wallet_pass_id', walletPassId)
      .single()

    if (!redemption) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 })
    }

    const isActive = isDisplayWindowActive(redemption.display_expires_at)
    const timeRemainingMs = getTimeRemainingMs(redemption.display_expires_at)

    return NextResponse.json({
      id: redemption.id,
      status: isActive ? redemption.status : 'expired_display',
      rewardDescription: redemption.reward_description,
      consumedAt: redemption.consumed_at,
      displayExpiresAt: redemption.display_expires_at,
      timeRemainingMs,
      isActive,
    })
  } catch (error) {
    console.error('[loyalty/redemption/status]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
