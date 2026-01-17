import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireHQAdmin } from '@/lib/auth/hq'

/**
 * GET /api/hqadmin/atlas/metrics
 * 
 * HQ Admin analytics for Atlas
 * Query params:
 * - ?city=xxx (optional) - Filter to specific city
 * 
 * Returns last 7 days aggregated events
 */

export async function GET(request: NextRequest) {
  // Verify HQ admin auth
  const auth = await requireHQAdmin()
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const city = url.searchParams.get('city')

  try {
    const supabase = createServiceRoleClient()
    
    // Build query
    let query = supabase
      .from('atlas_analytics')
      .select('event_type, city, created_at, business_id, query, results_count')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
    
    // Filter by city if provided
    if (city) {
      query = query.eq('city', city)
    }
    
    const { data: events, error } = await query
    
    if (error) {
      console.error('[HQ Atlas Metrics] Query error:', error)
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
      returned: events?.filter(e => e.event_type === 'atlas_returned_to_chat').length || 0,
      errors: events?.filter(e => e.event_type === 'error').length || 0
    }
    
    // Calculate rates
    const conversionRate = metrics.opens > 0
      ? Math.round((metrics.directionsClicks / metrics.opens) * 100 * 100) / 100
      : 0
    
    const engagementRate = metrics.opens > 0
      ? Math.round((metrics.searches / metrics.opens) * 100 * 100) / 100
      : 0
    
    const returnRate = metrics.opens > 0
      ? Math.round((metrics.returned / metrics.opens) * 100 * 100) / 100
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
    
    // Per-city breakdown if no city filter
    let cityBreakdown: any[] = []
    if (!city) {
      const cityCounts: Record<string, any> = {}
      events?.forEach(e => {
        if (!cityCounts[e.city]) {
          cityCounts[e.city] = {
            city: e.city,
            opens: 0,
            searches: 0,
            resultClicks: 0,
            directionsClicks: 0
          }
        }
        if (e.event_type === 'atlas_opened') cityCounts[e.city].opens++
        if (e.event_type === 'atlas_search_performed') cityCounts[e.city].searches++
        if (e.event_type === 'atlas_business_selected') cityCounts[e.city].resultClicks++
        if (e.event_type === 'atlas_directions_clicked') cityCounts[e.city].directionsClicks++
      })
      
      cityBreakdown = Object.values(cityCounts)
        .sort((a, b) => b.opens - a.opens)
    }
    
    return NextResponse.json({
      ok: true,
      period: 'last_7_days',
      city: city || 'all',
      metrics,
      rates: {
        conversionRate,
        engagementRate,
        returnRate
      },
      topQueries,
      cityBreakdown: city ? undefined : cityBreakdown
    })
    
  } catch (error) {
    console.error('[HQ Atlas Metrics] Error:', error)
    return NextResponse.json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
