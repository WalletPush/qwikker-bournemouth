import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { hasWalletPushCredentials } from '@/lib/loyalty/loyalty-types'
import { getLoyaltyPassFieldValues } from '@/lib/loyalty/loyalty-utils'
import { issueLoyaltyPass } from '@/lib/loyalty/walletpush-loyalty'

/**
 * POST /api/loyalty/join
 *
 * User joins a loyalty program. Creates membership via service role.
 * If WalletPush credentials exist, issues a loyalty pass.
 *
 * Body: { publicId, walletPassId, firstName, lastName, email, dateOfBirth? }
 */
export async function POST(request: NextRequest) {
  try {
    const city = await getSafeCurrentCity()
    const { publicId, walletPassId, firstName, lastName, email, dateOfBirth } =
      await request.json()

    if (!publicId || !walletPassId) {
      return NextResponse.json(
        { error: 'publicId and walletPassId are required' },
        { status: 400 }
      )
    }

    const serviceRole = createServiceRoleClient()

    const { data: program } = await serviceRole
      .from('loyalty_programs')
      .select('*')
      .eq('public_id', publicId)
      .eq('city', city)
      .in('status', ['active', 'submitted'])
      .single()

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // Check for existing membership
    const { data: existing } = await serviceRole
      .from('loyalty_memberships')
      .select('id')
      .eq('program_id', program.id)
      .eq('user_wallet_pass_id', walletPassId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already a member', membershipId: existing.id }, { status: 409 })
    }

    // Create membership
    const { data: membership, error: membershipError } = await serviceRole
      .from('loyalty_memberships')
      .insert({
        program_id: program.id,
        user_wallet_pass_id: walletPassId,
      })
      .select()
      .single()

    if (membershipError) {
      // Race condition: unique constraint violation -- re-fetch
      if (membershipError.code === '23505') {
        const { data: existingMembership } = await serviceRole
          .from('loyalty_memberships')
          .select('id')
          .eq('program_id', program.id)
          .eq('user_wallet_pass_id', walletPassId)
          .single()

        return NextResponse.json({
          success: true,
          membershipId: existingMembership?.id,
          alreadyMember: true,
        })
      }
      return NextResponse.json({ error: membershipError.message }, { status: 500 })
    }

    // Store date of birth if provided and user doesn't already have one
    if (dateOfBirth) {
      await serviceRole
        .from('app_users')
        .update({ date_of_birth: dateOfBirth })
        .eq('wallet_pass_id', walletPassId)
        .is('date_of_birth', null)
    }

    // Issue WalletPush loyalty pass if credentials exist
    let walletpushSerial: string | null = null
    let appleUrl: string | undefined
    let googleUrl: string | undefined

    if (hasWalletPushCredentials(program)) {
      const initialFields = getLoyaltyPassFieldValues(program, membership, program.type)

      const result = await issueLoyaltyPass(
        program,
        {
          firstName: firstName || 'Qwikker',
          lastName: lastName || 'Member',
          email: email || `${walletPassId}@pass.qwikker.com`,
        },
        initialFields
      )

      if (result) {
        walletpushSerial = result.serial
        appleUrl = result.appleUrl
        googleUrl = result.googleUrl

        await serviceRole
          .from('loyalty_memberships')
          .update({ walletpush_serial: result.serial })
          .eq('id', membership.id)
      }
    }

    return NextResponse.json({
      success: true,
      membershipId: membership.id,
      walletpushSerial,
      appleUrl: appleUrl || null,
      googleUrl: googleUrl || null,
      hasWalletPass: !!walletpushSerial,
    }, { status: 201 })
  } catch (error) {
    console.error('[loyalty/join]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
