'use client'

import { useEffect, useState } from 'react'

/**
 * Mobile detection hook
 * 
 * Checks for:
 * - Screen width < 768px (primary signal)
 * - Touch capability
 * - Mobile user agent
 */
export function useMobile() {
  // Initialize with immediate check if possible
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  useEffect(() => {
    const checkMobile = () => {
      const isSmallScreen = window.innerWidth < 768
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )

      // More lenient: small screen OR (touch + mobile UA)
      setIsMobile(isSmallScreen || (hasTouchScreen && isMobileUserAgent))
    }

    checkMobile()

    // Re-check on resize
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}
