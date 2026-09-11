import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getFranchiseConfig } from '@/lib/utils/franchise-config'
import { getLoyaltyPassFieldValues } from '@/lib/loyalty/loyalty-utils'
import {
  buildLoyaltyPassInstallUrls,
  updateLoyaltyPassField,
} from '@/lib/loyalty/walletpush-loyalty'

/**
 * POST /api/loyalty/wallet-links
 *
 * Returns Apple + Google re-install URLs for an existing loyalty pass serial.
 * Same serial → stamps preserved. Syncs balance in the background (do not block
 * the install links on WalletPush latency).
 *
 * Body: { publicId, walletPassId }
 */
export async function POST(request: NextRequest) {
  try {
    const city = await getSafeCurrentCity()
    const { publicId, walletPassId } = await request.json()

    if (!publicId || !walletPassId) {
      return NextResponse.json({ error: 'publicId and walletPassId are required' }, { status: 400 })
    }

    const serviceRole = createServiceRoleClient()

    const { data: program } = await serviceRole
      .from('loyalty_programs')
      .select('*')
      .eq('public_id', publicId)
      .eq('city', city)
      .single()

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const { data: membership } = await serviceRole
      .from('loyalty_memberships')
      .select('*')
      .eq('program_id', program.id)
      .eq('user_wallet_pass_id', walletPassId)
      .single()

    if (!membership?.walletpush_serial) {
      return NextResponse.json(
        { error: 'No wallet pass issued for this membership yet' },
        { status: 404 }
      )
    }

    const franchise = await getFranchiseConfig(city)
    const dashboardUrl =
      (program as { walletpush_dashboard_url?: string }).walletpush_dashboard_url ||
      franchise?.walletpush_dashboard_url ||
      'https://loyalty.qwikker.com'

    const urls = buildLoyaltyPassInstallUrls(membership.walletpush_serial, dashboardUrl)

    // Sync live balance onto the pass without blocking the response
    if (program.walletpush_api_key && program.walletpush_pass_type_id) {
      const fields = getLoyaltyPassFieldValues(program, membership, program.type)
      const entries = Object.entries(fields)
      void (async () => {
        try {
          for (let i = 0; i < entries.length; i++) {
            const [name, value] = entries[i]
            await updateLoyaltyPassField(
              {
                walletpush_api_key: program.walletpush_api_key,
                walletpush_pass_type_id: program.walletpush_pass_type_id,
                walletpush_dashboard_url: dashboardUrl,
              },
              membership.walletpush_serial,
              name,
              value,
              i === entries.length - 1
            )
          }
        } catch (err) {
          console.warn('[loyalty/wallet-links] background sync failed', err)
        }
      })()
    }

    return NextResponse.json({
      serial: membership.walletpush_serial,
      stamps_balance: membership.stamps_balance,
      points_balance: membership.points_balance,
      ...urls,
    })
  } catch (error) {
    console.error('[loyalty/wallet-links]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
