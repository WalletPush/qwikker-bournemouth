import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'

/**
 * GET /api/loyalty/members
 *
 * Member list for business CRM-lite. Supports filters and CSV export.
 * ?status=active  ?since=30d  ?format=csv
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

    const { data: program } = await supabase
      .from('loyalty_programs')
      .select('id')
      .eq('business_id', business.id)
      .single()

    if (!program) {
      return NextResponse.json({ error: 'No loyalty program found' }, { status: 404 })
    }

    const serviceRole = createServiceRoleClient()
    let query = serviceRole
      .from('loyalty_memberships')
      .select(`
        id, user_wallet_pass_id, stamps_balance, points_balance,
        total_earned, total_redeemed, joined_at, last_active_at, status
      `)
      .eq('program_id', program.id)
      .order('joined_at', { ascending: false })

    const statusFilter = params.get('status')
    if (statusFilter === 'active' || statusFilter === 'inactive') {
      query = query.eq('status', statusFilter)
    }

    const sinceParam = params.get('since')
    if (sinceParam) {
      const days = parseInt(sinceParam.replace('d', ''), 10)
      if (!isNaN(days) && days > 0) {
        const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('last_active_at', sinceDate)
      }
    }

    const { data: members, error: membersError } = await query

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    // No FK between loyalty_memberships.user_wallet_pass_id and app_users,
    // so batch-fetch app_users separately and merge in application code.
    const walletPassIds = [...new Set((members || []).map((m: any) => m.user_wallet_pass_id).filter(Boolean))]
    let appUsersMap: Record<string, { first_name: string | null; last_name: string | null; email: string | null }> = {}

    if (walletPassIds.length > 0) {
      const { data: appUsers } = await serviceRole
        .from('app_users')
        .select('wallet_pass_id, first_name, last_name, email')
        .in('wallet_pass_id', walletPassIds)

      for (const u of appUsers || []) {
        appUsersMap[u.wallet_pass_id] = u
      }
    }

    const rows = (members || []).map((m: any) => {
      const appUser = appUsersMap[m.user_wallet_pass_id] || null
      const wpid = m.user_wallet_pass_id
      return {
        id: m.id,
        display_name: appUser
          ? `${appUser.first_name || ''} ${appUser.last_name || ''}`.trim() || 'Anonymous'
          : 'Anonymous',
        wallet_pass_id_masked: wpid ? `...${wpid.slice(-4)}` : null,
        email: appUser?.email || null,
        joined_at: m.joined_at,
        last_active_at: m.last_active_at,
        total_earned: m.total_earned,
        stamps_balance: m.stamps_balance,
        total_redeemed: m.total_redeemed,
        status: m.status,
      }
    })

    if (params.get('format') === 'csv') {
      const today = new Date().toISOString().slice(0, 10)
      const header = 'Name,Email,Joined,Last Active,Total Earned,Balance,Redemptions,Status'
      const csvRows = rows.map((r: any) =>
        [
          `"${r.display_name}"`,
          `"${r.email || ''}"`,
          r.joined_at?.slice(0, 10) || '',
          r.last_active_at?.slice(0, 10) || '',
          r.total_earned,
          r.stamps_balance,
          r.total_redeemed,
          r.status,
        ].join(',')
      )
      const csv = [header, ...csvRows].join('\n')

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="loyalty-members-${today}.csv"`,
        },
      })
    }

    return NextResponse.json({ members: rows, total: rows.length })
  } catch (error) {
    console.error('[loyalty/members]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
