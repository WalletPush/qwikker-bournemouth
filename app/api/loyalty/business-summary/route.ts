import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { DEFAULT_AVG_REWARD_VALUE } from '@/lib/loyalty/loyalty-utils'

/**
 * GET /api/loyalty/business-summary
 *
 * Aggregated stats for the business loyalty dashboard.
 */
export async function GET() {
  try {
    const city = await getSafeCurrentCity()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: business } = await supabase
      .from('business_profiles')
      .select('id, city')
      .eq('user_id', user.id)
      .single()

    if (!business || business.city !== city) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: program } = await supabase
      .from('loyalty_programs')
      .select('id, reward_threshold')
      .eq('business_id', business.id)
      .single()

    if (!program) {
      return NextResponse.json({ error: 'No loyalty program found' }, { status: 404 })
    }

    const serviceRole = createServiceRoleClient()
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthStartIso = monthStart.toISOString()

    const [
      membersResult,
      visitsResult,
      redemptionsResult,
      nearRewardResult,
      flaggedResult,
      totalEarnsResult,
    ] = await Promise.all([
      serviceRole
        .from('loyalty_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('program_id', program.id)
        .eq('status', 'active'),
      serviceRole
        .from('loyalty_earn_events')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('valid', true)
        .gte('earned_at', monthStartIso),
      serviceRole
        .from('loyalty_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('consumed_at', monthStartIso),
      serviceRole
        .from('loyalty_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('program_id', program.id)
        .eq('status', 'active')
        .gte('stamps_balance', program.reward_threshold - 2),
      serviceRole
        .from('loyalty_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .not('flagged_at', 'is', null),
      serviceRole
        .from('loyalty_earn_events')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('valid', true),
    ])

    const activeMembers = membersResult.count ?? 0
    const visitsThisMonth = visitsResult.count ?? 0
    const rewardsRedeemedThisMonth = redemptionsResult.count ?? 0
    const totalValidEarns = totalEarnsResult.count ?? 0

    return NextResponse.json({
      summary: {
        activeMembers,
        visitsThisMonth,
        rewardsRedeemedThisMonth,
        estimatedValueGivenAway: rewardsRedeemedThisMonth * DEFAULT_AVG_REWARD_VALUE,
        avgVisitsPerMember: activeMembers > 0
          ? Math.round((totalValidEarns / activeMembers) * 10) / 10
          : 0,
        membersNearReward: nearRewardResult.count ?? 0,
        flaggedRedemptions: flaggedResult.count ?? 0,
      },
    })
  } catch (error) {
    console.error('[loyalty/business-summary]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
