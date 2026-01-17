import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * GET /api/dashboard/atlas/metrics
 * 
 * Business owner analytics for Atlas (their business only)
 * Tier-gated: Featured gets basic, Spotlight gets advanced
 * 
 * Returns last 7/30 days business-specific metrics
 */

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }
    
    // Get business profile for this user
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('id, business_tier, status')
      .eq('user_id', user.id)
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json({
        ok: false,
        error: 'Business profile not found'
      }, { status: 404 })
    }
    
    // Check tier (Starter and below get nothing)
    const tier = profile.business_tier
    if (!tier || tier === 'free' || tier === 'starter' || tier === 'unclaimed') {
      return NextResponse.json({
        ok: true,
        enabled: false,
        tier,
        message: 'Upgrade to Featured tier to see Map Discovery analytics'
      })
    }
    
    // Use service role for metrics query
    const adminClient = createServiceRoleClient()
    
    // Query events for this business (last 7 days for Featured, 30 days for Spotlight)
    const daysBack = tier === 'spotlight' ? 30 : 7
    
    const { data: events, error } = await adminClient
      .from('atlas_analytics')
      .select('event_type, created_at, query')
      .eq('business_id', profile.id)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
    
    if (error) {
      console.error('[Business Atlas Metrics] Query error:', error)
      return NextResponse.json({
        ok: false,
        error: 'Failed to fetch metrics'
      }, { status: 500 })
    }
    
    // Basic metrics (Featured tier)
    const mapViews = events?.filter(e => e.event_type === 'atlas_business_selected').length || 0
    const directionsClicks = events?.filter(e => e.event_type === 'atlas_directions_clicked').length || 0
    const conversionRate = mapViews > 0
      ? Math.round((directionsClicks / mapViews) * 100 * 100) / 100
      : 0
    
    const basicMetrics = {
      mapViews,
      directionsClicks,
      conversionRate,
      period: `last_${daysBack}_days`
    }
    
    // Advanced metrics (Spotlight tier only)
    if (tier === 'spotlight') {
      // Top queries
      const queryCounts: Record<string, number> = {}
      events?.forEach(e => {
        if (e.query && e.event_type === 'atlas_business_selected') {
          queryCounts[e.query] = (queryCounts[e.query] || 0) + 1
        }
      })
      
      const topQueries = Object.entries(queryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([query, count]) => ({ query, count }))
      
      // Peak hours
      const hourCounts: Record<number, number> = {}
      events?.forEach(e => {
        if (e.event_type === 'atlas_business_selected') {
          const hour = new Date(e.created_at).getHours()
          hourCounts[hour] = (hourCounts[hour] || 0) + 1
        }
      })
      
      const peakHours = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour, count]) => ({
          hour: parseInt(hour),
          hourLabel: `${hour}:00`,
          views: count
        }))
      
      return NextResponse.json({
        ok: true,
        enabled: true,
        tier,
        ...basicMetrics,
        advanced: {
          topQueries,
          peakHours
        }
      })
    }
    
    // Featured tier: basic metrics only
    return NextResponse.json({
      ok: true,
      enabled: true,
      tier,
      ...basicMetrics
    })
    
  } catch (error) {
    console.error('[Business Atlas Metrics] Error:', error)
    return NextResponse.json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
