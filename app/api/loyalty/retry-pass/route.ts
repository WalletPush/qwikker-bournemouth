import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { hasWalletPushCredentials } from '@/lib/loyalty/loyalty-types'
import { getLoyaltyPassFieldValues } from '@/lib/loyalty/loyalty-utils'
import { issueLoyaltyPass } from '@/lib/loyalty/walletpush-loyalty'

/**
 * POST /api/loyalty/retry-pass
 *
 * Retries WalletPush pass creation for an existing membership
 * that failed to get a pass on initial join.
 */
export async function POST(request: NextRequest) {
  try {
    const city = await getSafeCurrentCity()
    const { publicId, walletPassId } = await request.json()

    if (!publicId || !walletPassId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const serviceRole = createServiceRoleClient()

    const { data: program } = await serviceRole
      .from('loyalty_programs')
      .select('*')
      .eq('public_id', publicId)
      .eq('city', city)
      .single()

    if (!program || !program.walletpush_template_id || !program.walletpush_api_key) {
      return NextResponse.json({ error: 'Program not found or no wallet credentials' }, { status: 404 })
    }

    const { data: membership } = await serviceRole
      .from('loyalty_memberships')
      .select('*')
      .eq('program_id', program.id)
      .eq('user_wallet_pass_id', walletPassId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
    }

    if (membership.walletpush_serial) {
      return NextResponse.json({ error: 'Pass already issued', serial: membership.walletpush_serial }, { status: 200 })
    }

    const { data: appUser } = await serviceRole
      .from('app_users')
      .select('first_name, last_name, email')
      .eq('wallet_pass_id', walletPassId)
      .single()

    const initialFields = getLoyaltyPassFieldValues(program, membership, program.type)

    const result = await issueLoyaltyPass(
      program as any,
      {
        firstName: appUser?.first_name || 'Qwikker',
        lastName: appUser?.last_name || 'Member',
        email: appUser?.email || `${walletPassId}@pass.qwikker.com`,
      },
      initialFields
    )

    if (!result) {
      return NextResponse.json({ error: 'Pass creation failed. Please try again.' }, { status: 500 })
    }

    await serviceRole
      .from('loyalty_memberships')
      .update({ walletpush_serial: result.serial })
      .eq('id', membership.id)

    return NextResponse.json({
      success: true,
      serial: result.serial,
      appleUrl: result.appleUrl || null,
      googleUrl: result.googleUrl || null,
    })
  } catch (error) {
    console.error('[loyalty/retry-pass]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
