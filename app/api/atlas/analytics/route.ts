import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveRequestCity } from '@/lib/utils/tenant-city'

/**
 * POST /api/atlas/analytics
 * 
 * Track Atlas engagement events
 * Uses service role to bypass RLS (analytics are sensitive)
 * 
 * SECURITY:
 * - City derived from hostname server-side (NEVER trust client)
 * - Client cannot poison analytics with fake city data
 */

export async function POST(request: NextRequest) {
  try {
    // Derive city from hostname server-side (SECURITY CRITICAL)
    const cityRes = await resolveRequestCity(request, { allowQueryOverride: true })
    
    if (!cityRes.ok) {
      return NextResponse.json({
        ok: false,
        error: 'Could not resolve tenant city'
      }, { status: 400 })
    }
    
    const city = cityRes.city
    
    const body = await request.json()
    
    const {
      eventType,
      userId,
      sessionId,
      query,
      queryLength,
      resultsCount,
      businessId,
      deviceType,
      userAgent,
      performanceMode,
      timeInAtlasSeconds
    } = body
    
    // Validate required fields
    if (!eventType) {
      return NextResponse.json({
        ok: false,
        error: 'Missing eventType'
      }, { status: 400 })
    }
    
    // Insert event
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('atlas_analytics')
      .insert({
        event_type: eventType,
        city,
        user_id: userId || 'anonymous',
        session_id: sessionId,
        query,
        query_length: queryLength,
        results_count: resultsCount,
        business_id: businessId,
        device_type: deviceType,
        user_agent: userAgent,
        performance_mode: performanceMode,
        time_in_atlas_seconds: timeInAtlasSeconds
      })
    
    if (error) {
      console.error('[Atlas Analytics] Insert error:', error)
      return NextResponse.json({
        ok: false,
        error: 'Failed to track event'
      }, { status: 500 })
    }
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('[Atlas Analytics] Error:', error)
    return NextResponse.json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
