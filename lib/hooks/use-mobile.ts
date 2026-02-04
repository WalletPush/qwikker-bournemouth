'use client'

import { useEffect, useState } from 'react'

/**
 * Mobile detection hook
 * 
 * Checks for:
 * - Touch capability
 * - Screen width < 768px
 * - Mobile user agent
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth < 768
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )

      setIsMobile(hasTouchScreen && (isSmallScreen || isMobileUserAgent))
    }

    checkMobile()

    // Re-check on resize
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}
