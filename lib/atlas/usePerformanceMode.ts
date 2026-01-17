/**
 * usePerformanceMode Hook
 * 
 * Automatically detects if device needs performance optimizations:
 * - Reduced motion preference
 * - Low memory
 * - Mobile device
 * 
 * Returns performance settings for Mapbox
 */

import { useState, useEffect } from 'react'

export interface PerformanceModeSettings {
  enabled: boolean
  pitch: number
  fog: boolean
  maxMarkers: number
  animationDuration: number
  reason?: string
}

export function usePerformanceMode(): PerformanceModeSettings {
  const [settings, setSettings] = useState<PerformanceModeSettings>({
    enabled: false,
    pitch: 45,
    fog: true,
    maxMarkers: 50,
    animationDuration: 2000
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    let performanceMode = false
    let reason: string | undefined

    // Check 1: Reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      performanceMode = true
      reason = 'reduced-motion-preference'
    }

    // Check 2: Low memory device (Chrome/Edge only)
    // @ts-ignore
    if (navigator.deviceMemory && navigator.deviceMemory < 4) {
      performanceMode = true
      reason = 'low-memory'
    }

    // Check 3: Mobile device (always use performance mode on mobile)
    const isMobile = /mobile|android|iphone|ipod/i.test(navigator.userAgent)
    if (isMobile) {
      performanceMode = true
      reason = reason || 'mobile-device'
    }

    // Check 4: Connection speed (if available)
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection && connection.effectiveType && ['slow-2g', '2g'].includes(connection.effectiveType)) {
      performanceMode = true
      reason = 'slow-connection'
    }

    if (performanceMode) {
      setSettings({
        enabled: true,
        pitch: 15, // Flatter view (less 3D rendering)
        fog: false, // Disable atmospheric fog
        maxMarkers: 8, // Fewer markers at once
        animationDuration: 1000, // Faster animations
        reason
      })

      console.log('🎯 Performance Mode: ENABLED', { reason })
    } else {
      console.log('✨ Performance Mode: DISABLED (full experience)')
    }
  }, [])

  return settings
}
