import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { hasWalletPushCredentials } from '@/lib/loyalty/loyalty-types'
import {
  getDisplayExpiresAt,
  CONSUME_RATE_LIMIT_MINUTES,
} from '@/lib/loyalty/loyalty-utils'
import { updateLoyaltyPassField } from '@/lib/loyalty/walletpush-loyalty'

/**
 * POST /api/loyalty/redemption/consume
 *
 * Atomic reward consumption. Inserts redemption, deducts stamps,
 * increments total_redeemed. Returns display window for live screen.
 *
 * Body: { membershipId, walletPassId }
 */
export async function POST(request: NextRequest) {
  try {
    const city = await getSafeCurrentCity()
    const { membershipId, walletPassId } = await request.json()

    if (!membershipId || !walletPassId) {
      return NextResponse.json(
        { error: 'membershipId and walletPassId are required' },
        { status: 400 }
      )
    }

    const serviceRole = createServiceRoleClient()

    // Fetch membership with program
    const { data: membership } = await serviceRole
      .from('loyalty_memberships')
      .select(`
        *,
        loyalty_programs!inner(
          *, business_profiles!inner(business_name)
        )
      `)
      .eq('id', membershipId)
      .eq('user_wallet_pass_id', walletPassId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
    }

    const program = (membership as any).loyalty_programs

    // City match
    if (program.city !== city) {
      return NextResponse.json({ error: 'City mismatch' }, { status: 403 })
    }

    // Program must be active
    if (program.status !== 'active') {
      return NextResponse.json({ error: 'Program is not active' }, { status: 400 })
    }

    // Balance check
    if (membership.stamps_balance < program.reward_threshold) {
      return NextResponse.json(
        {
          error: 'Not enough stamps to redeem',
          balance: membership.stamps_balance,
          threshold: program.reward_threshold,
        },
        { status: 400 }
      )
    }

    // Rate limit: 1 consume per 5 minutes per user
    const rateLimitSince = new Date(
      Date.now() - CONSUME_RATE_LIMIT_MINUTES * 60 * 1000
    ).toISOString()

    const { count: recentConsumes } = await serviceRole
      .from('loyalty_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_wallet_pass_id', walletPassId)
      .gte('consumed_at', rateLimitSince)

    if ((recentConsumes ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Please wait before redeeming again' },
        { status: 429 }
      )
    }

    // Atomic: insert redemption + deduct stamps
    const consumedAt = new Date().toISOString()
    const displayExpiresAt = getDisplayExpiresAt()
    const newBalance = Math.max(0, membership.stamps_balance - program.reward_threshold)

    const { data: redemption, error: redeemError } = await serviceRole
      .from('loyalty_redemptions')
      .insert({
        membership_id: membershipId,
        business_id: program.business_id,
        user_wallet_pass_id: walletPassId,
        reward_description: program.reward_description,
        status: 'consumed',
        consumed_at: consumedAt,
        display_expires_at: displayExpiresAt,
        stamps_deducted: program.reward_threshold,
      })
      .select()
      .single()

    if (redeemError) {
      return NextResponse.json({ error: redeemError.message }, { status: 500 })
    }

    // Deduct stamps + increment total_redeemed
    await serviceRole
      .from('loyalty_memberships')
      .update({
        stamps_balance: newBalance,
        total_redeemed: membership.total_redeemed + 1,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', membershipId)

    // WalletPush: update pass fields (fire-and-forget, push only on last call)
    if (hasWalletPushCredentials(program) && membership.walletpush_serial) {
      const serial = membership.walletpush_serial
      updateLoyaltyPassField(program, serial, 'Points', String(newBalance), false)
      updateLoyaltyPassField(program, serial, 'Status', 'Reward Redeemed!', false)
      updateLoyaltyPassField(
        program,
        serial,
        'Last_Message',
        `You redeemed ${program.reward_description}!`,
        true
      )
    }

    return NextResponse.json({
      redemptionId: redemption.id,
      rewardDescription: program.reward_description,
      consumedAt,
      displayExpiresAt,
      newBalance,
      threshold: program.reward_threshold,
    })
  } catch (error) {
    console.error('[loyalty/redemption/consume]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
