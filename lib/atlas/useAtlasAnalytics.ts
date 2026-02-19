/**
 * useAtlasAnalytics Hook
 * 
 * Tracks Atlas engagement and conversions
 * Stores events in atlas_analytics table
 * 
 * SECURITY: City is derived server-side from hostname.
 * The client should NOT pass city to this hook.
 */

import { useRef, useCallback } from 'react'

export type AtlasEventType =
  | 'atlas_opened'
  | 'atlas_search_performed'
  | 'atlas_business_selected'
  | 'atlas_directions_clicked'
  | 'atlas_returned_to_chat'
  | 'atlas_closed'
  | 'atlas_vibe_setup_completed'
  | 'atlas_vibe_setup_skipped'
  | 'atlas_search_refined'
  | 'atlas_flyto_failed'
  | 'atlas_hydration_timing'
  | 'atlas_area_search'
  | 'atlas_save_business'
  | 'atlas_chip_tap'
  | 'atlas_tell_me_more'
  | 'atlas_legend_opened'

interface TrackEventParams {
  eventType: AtlasEventType
  query?: string
  resultsCount?: number
  businessId?: string
  performanceMode?: boolean
}

export function useAtlasAnalytics(userId?: string) {
  const sessionId = useRef<string>(`atlas-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const startTime = useRef<number>(Date.now())
  const events = useRef<AtlasEventType[]>([])

  const trackEvent = useCallback(async (params: TrackEventParams) => {
    const { eventType, query, resultsCount, businessId, performanceMode } = params
    
    // Track event locally
    events.current.push(eventType)
    
    // Calculate time in Atlas
    const timeInAtlasSeconds = Math.floor((Date.now() - startTime.current) / 1000)
    
    // Detect device type
    const deviceType = /mobile|android|iphone|ipad|ipod/i.test(navigator.userAgent)
      ? 'mobile'
      : /tablet|ipad/i.test(navigator.userAgent)
      ? 'tablet'
      : 'desktop'
    
    try {
      await fetch('/api/atlas/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          // City derived server-side from hostname (SECURITY)
          userId: userId || 'anonymous',
          sessionId: sessionId.current,
          query,
          queryLength: query?.length,
          resultsCount,
          businessId,
          deviceType,
          userAgent: navigator.userAgent,
          performanceMode,
          timeInAtlasSeconds
        })
      })
      
      console.log(`📊 Atlas Analytics: ${eventType}`, {
        timeInAtlas: `${timeInAtlasSeconds}s`,
        deviceType,
        performanceMode
      })
    } catch (error) {
      // Don't break the experience if analytics fail
      console.warn('Atlas analytics tracking failed:', error)
    }
  }, [userId])

  return {
    trackEvent,
    sessionId: sessionId.current
  }
}
