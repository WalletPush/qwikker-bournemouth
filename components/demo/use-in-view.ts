'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Flips to `true` once the element scrolls into view, then disconnects.
 * Used by the demo charts / loyalty stamps to animate from zero -> target the
 * first time they're seen. Respects prefers-reduced-motion (reveals instantly,
 * no growth) and degrades gracefully where IntersectionObserver is unavailable.
 */
export function useInView<T extends HTMLElement>(
  threshold = 0.25,
  // Negative bottom margin shrinks the viewport's trigger line, so an element
  // must scroll further UP into view before it counts as visible — this stops
  // the animations firing "too early" while barely peeking in from the bottom.
  rootMargin = '0px 0px -18% 0px'
) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold, rootMargin }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold, rootMargin])

  return { ref, inView }
}
