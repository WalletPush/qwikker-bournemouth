import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { hasWalletPushCredentials } from '@/lib/loyalty/loyalty-types'
import { getLoyaltyPassFieldValues } from '@/lib/loyalty/loyalty-utils'
import { updateLoyaltyPassField } from '@/lib/loyalty/walletpush-loyalty'

/**
 * POST /api/loyalty/redemption/reset-pass
 *
 * Called after the redemption display window expires.
 * Resets the WalletPush pass fields from "Reward Redeemed!" back
 * to the current balance (e.g. "0/3 Stamps").
 *
 * Body: { membershipId, walletPassId }
 */
export async function POST(request: NextRequest) {
  try {
    const { membershipId, walletPassId } = await request.json()

    if (!membershipId || !walletPassId) {
      return NextResponse.json(
        { error: 'membershipId and walletPassId are required' },
        { status: 400 }
      )
    }

    const serviceRole = createServiceRoleClient()

    const { data: membership } = await serviceRole
      .from('loyalty_memberships')
      .select(`
        *,
        loyalty_programs!inner(*)
      `)
      .eq('id', membershipId)
      .eq('user_wallet_pass_id', walletPassId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
    }

    const program = (membership as any).loyalty_programs

    if (!hasWalletPushCredentials(program) || !membership.walletpush_serial) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const serial = membership.walletpush_serial
    const fieldValues = getLoyaltyPassFieldValues(
      program,
      membership,
      program.type
    )

    updateLoyaltyPassField(program, serial, 'Points', fieldValues.Points, false)
    updateLoyaltyPassField(program, serial, 'Status', fieldValues.Status, false)
    updateLoyaltyPassField(
      program,
      serial,
      'Last_Message',
      membership.stamps_balance === 0
        ? `Reward redeemed! Start collecting again.`
        : `${fieldValues.Status} — keep going!`,
      true
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[loyalty/redemption/reset-pass]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
