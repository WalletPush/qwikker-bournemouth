import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'

/**
 * GET /api/loyalty/redemptions
 *
 * Paginated redemption log for business dashboard.
 * ?since=30d  ?flagged=true  ?page=1  ?limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const city = await getSafeCurrentCity()
    const supabase = await createClient()
    const params = request.nextUrl.searchParams

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

    const page = Math.max(1, parseInt(params.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    const serviceRole = createServiceRoleClient()
    let query = serviceRole
      .from('loyalty_redemptions')
      .select(`
        id, user_wallet_pass_id, reward_description, status,
        consumed_at, stamps_deducted, flagged_at, flagged_reason
      `, { count: 'exact' })
      .eq('business_id', business.id)
      .order('consumed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const sinceParam = params.get('since')
    if (sinceParam) {
      const days = parseInt(sinceParam.replace('d', ''), 10)
      if (!isNaN(days) && days > 0) {
        const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('consumed_at', sinceDate)
      }
    }

    if (params.get('flagged') === 'true') {
      query = query.not('flagged_at', 'is', null)
    }

    const { data: redemptions, count, error: queryError } = await query

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    // No FK between loyalty tables and app_users, so batch-fetch separately
    const walletPassIds = [...new Set((redemptions || []).map((r: any) => r.user_wallet_pass_id).filter(Boolean))]
    let appUsersMap: Record<string, { first_name: string | null; last_name: string | null }> = {}

    if (walletPassIds.length > 0) {
      const { data: appUsers } = await serviceRole
        .from('app_users')
        .select('wallet_pass_id, first_name, last_name')
        .in('wallet_pass_id', walletPassIds)

      for (const u of appUsers || []) {
        appUsersMap[u.wallet_pass_id] = u
      }
    }

    const rows = (redemptions || []).map((r: any) => {
      const appUser = appUsersMap[r.user_wallet_pass_id] || null
      const wpid = r.user_wallet_pass_id
      return {
        id: r.id,
        display_name: appUser
          ? `${appUser.first_name || ''} ${appUser.last_name || ''}`.trim() || 'Anonymous'
          : 'Anonymous',
        wallet_pass_id_masked: wpid ? `...${wpid.slice(-4)}` : null,
        reward_description: r.reward_description,
        stamps_deducted: r.stamps_deducted,
        consumed_at: r.consumed_at,
        status: r.status,
        flagged_at: r.flagged_at,
        flagged_reason: r.flagged_reason,
      }
    })

    return NextResponse.json({
      redemptions: rows,
      total: count ?? rows.length,
      page,
      limit,
    })
  } catch (error) {
    console.error('[loyalty/redemptions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
