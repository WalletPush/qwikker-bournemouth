'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * True when the page is being rendered for PDF/print (`?pdf=1`). In that mode
 * every scroll-triggered reveal must show its FINAL state immediately (and all
 * looping animations are frozen via CSS) so a headless/browser capture is never
 * blank or mid-animation. Safe on the server (returns false).
 */
export function isPdfMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return new URLSearchParams(window.location.search).get('pdf') === '1'
  } catch {
    return false
  }
}

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
    if (reduced || isPdfMode() || typeof IntersectionObserver === 'undefined') {
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
