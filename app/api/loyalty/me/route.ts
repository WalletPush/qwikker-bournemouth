import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getProximityMessage, calculateProgress } from '@/lib/loyalty/loyalty-utils'

/**
 * GET /api/loyalty/me?walletPassId=...
 *
 * Returns all loyalty memberships for a user with program details,
 * progress, and proximity messages. City-filtered via program join.
 */
export async function GET(request: NextRequest) {
  try {
    const city = await getSafeCurrentCity()
    const walletPassId = request.nextUrl.searchParams.get('walletPassId')

    if (!walletPassId) {
      return NextResponse.json({ error: 'walletPassId is required' }, { status: 400 })
    }

    const serviceRole = createServiceRoleClient()

    const { data: memberships, error } = await serviceRole
      .from('loyalty_memberships')
      .select(`
        *,
        loyalty_programs!inner(
          public_id, program_name, type, reward_threshold, reward_description,
          stamp_label, stamp_icon, status, primary_color,
          walletpush_template_id, city,
          business_profiles!inner(business_name, slug, logo)
        )
      `)
      .eq('user_wallet_pass_id', walletPassId)
      .eq('loyalty_programs.city', city)
      .eq('status', 'active')
      .order('last_active_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const enriched = (memberships || []).map((m: any) => {
      const program = m.loyalty_programs
      const balance = program.type === 'stamps' ? m.stamps_balance : m.points_balance
      return {
        ...m,
        loyalty_programs: undefined,
        program: {
          public_id: program.public_id,
          program_name: program.program_name,
          type: program.type,
          reward_threshold: program.reward_threshold,
          reward_description: program.reward_description,
          stamp_label: program.stamp_label,
          stamp_icon: program.stamp_icon,
          status: program.status,
          primary_color: program.primary_color,
          walletpush_template_id: program.walletpush_template_id,
          business: {
            business_name: program.business_profiles.business_name,
            slug: program.business_profiles.slug,
            logo: program.business_profiles.logo,
          },
        },
        progress: calculateProgress(balance, program.reward_threshold),
        proximityMessage: getProximityMessage(balance, program.reward_threshold),
        rewardAvailable: balance >= program.reward_threshold,
      }
    })

    return NextResponse.json({ memberships: enriched })
  } catch (error) {
    console.error('[loyalty/me]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
