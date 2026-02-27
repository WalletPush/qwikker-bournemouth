import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { hasWalletPushCredentials } from '@/lib/loyalty/loyalty-types'
import { getLoyaltyPassFieldValues } from '@/lib/loyalty/loyalty-utils'
import { updateLoyaltyPassField } from '@/lib/loyalty/walletpush-loyalty'

/**
 * POST /api/admin/loyalty/force-push
 *
 * Force-pushes the current correct field values to a loyalty pass.
 * Useful when template changes need to propagate, or when pass
 * values get out of sync.
 *
 * Body: { membershipId }
 */
export async function POST(request: NextRequest) {
  try {
    const { membershipId } = await request.json()

    if (!membershipId) {
      return NextResponse.json({ error: 'membershipId is required' }, { status: 400 })
    }

    const serviceRole = createServiceRoleClient()

    const { data: membership } = await serviceRole
      .from('loyalty_memberships')
      .select('*, loyalty_programs!inner(*)')
      .eq('id', membershipId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
    }

    const program = (membership as any).loyalty_programs

    if (!hasWalletPushCredentials(program) || !membership.walletpush_serial) {
      return NextResponse.json({ error: 'No WalletPush credentials or serial' }, { status: 400 })
    }

    const serial = membership.walletpush_serial
    const fieldValues = getLoyaltyPassFieldValues(program, membership, program.type)

    // Update all fields, push on the last one to trigger a single APNs notification
    await updateLoyaltyPassField(program, serial, 'Points', fieldValues.Points, false)
    await updateLoyaltyPassField(program, serial, 'Threshold', fieldValues.Threshold, false)
    await updateLoyaltyPassField(program, serial, 'Status', fieldValues.Status, false)
    await updateLoyaltyPassField(program, serial, 'Reward', fieldValues.Reward, true)

    return NextResponse.json({
      ok: true,
      serial,
      fieldValues,
      message: 'Force-pushed all field values with APNs push',
    })
  } catch (error) {
    console.error('[admin/loyalty/force-push]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
