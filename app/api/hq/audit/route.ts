import { NextRequest, NextResponse } from 'next/server'
import { requireHQAdmin } from '@/lib/auth/hq'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Verify HQ admin (session-based)
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    // Use service role for reads (HQ operates above RLS)
    const supabase = createServiceRoleClient()

    // Parse query params
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query - NO JOINS (actor_email is already stored)
    let query = supabase
      .from('hq_audit_logs')
      .select('id, actor_user_id, actor_email, actor_type, action, resource_type, resource_id, city, metadata, ip_address, user_agent, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (city) {
      query = query.eq('city', city)
    }

    if (action) {
      query = query.eq('action', action)
    }

    const { data: logs, error: logsError, count } = await query

    if (logsError) {
      console.error('Error fetching audit logs:', logsError)
      return NextResponse.json({ error: 'Failed to fetch audit logs', details: logsError.message }, { status: 500 })
    }

    // Get unique cities and actions for filters
    const { data: cities } = await supabase
      .from('franchise_crm_configs')
      .select('city')
      .order('city')

    const { data: actions } = await supabase
      .from('hq_audit_logs')
      .select('action')
      .order('action')

    const uniqueActions = [...new Set(actions?.map(a => a.action) || [])]

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      filters: {
        cities: cities?.map(c => c.city) || [],
        actions: uniqueActions
      }
    })

  } catch (error) {
    console.error('Audit logs API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
