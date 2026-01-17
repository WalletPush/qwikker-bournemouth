import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'

/**
 * GET /api/admin/atlas/metrics
 * 
 * City Admin analytics for Atlas (their city only)
 * Returns last 7 days aggregated events
 */

export async function GET(request: NextRequest) {
  try {
    // Get current city (validates admin access)
    const city = await getSafeCurrentCity()
    
    // Verify user is admin for this city
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }
    
    // Use service role for metrics query
    const adminClient = createServiceRoleClient()
    
    const { data: events, error } = await adminClient
      .from('atlas_analytics')
      .select('event_type, created_at, business_id, query, results_count')
      .eq('city', city)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[City Admin Atlas Metrics] Query error:', error)
      return NextResponse.json({
        ok: false,
        error: 'Failed to fetch metrics'
      }, { status: 500 })
    }
    
    // Aggregate metrics
    const metrics = {
      opens: events?.filter(e => e.event_type === 'atlas_opened').length || 0,
      searches: events?.filter(e => e.event_type === 'atlas_search_performed').length || 0,
      resultClicks: events?.filter(e => e.event_type === 'atlas_business_selected').length || 0,
      directionsClicks: events?.filter(e => e.event_type === 'atlas_directions_clicked').length || 0,
      returned: events?.filter(e => e.event_type === 'atlas_returned_to_chat').length || 0
    }
    
    // Calculate rates
    const conversionRate = metrics.opens > 0
      ? Math.round((metrics.directionsClicks / metrics.opens) * 100 * 100) / 100
      : 0
    
    const engagementRate = metrics.opens > 0
      ? Math.round((metrics.searches / metrics.opens) * 100 * 100) / 100
      : 0
    
    // Top queries
    const queryCounts: Record<string, number> = {}
    events?.forEach(e => {
      if (e.query && e.event_type === 'atlas_search_performed') {
        queryCounts[e.query] = (queryCounts[e.query] || 0) + 1
      }
    })
    
    const topQueries = Object.entries(queryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }))
    
    return NextResponse.json({
      ok: true,
      period: 'last_7_days',
      city,
      metrics,
      rates: {
        conversionRate,
        engagementRate
      },
      topQueries
    })
    
  } catch (error) {
    console.error('[City Admin Atlas Metrics] Error:', error)
    return NextResponse.json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
