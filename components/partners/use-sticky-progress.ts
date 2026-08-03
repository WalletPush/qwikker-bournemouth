'use client'

import { useEffect, useRef, useState } from 'react'

/** Scroll progress 0→1 through a tall sticky section (window scroll). */
export function useStickyProgress() {
  const ref = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let raf = 0
    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const total = Math.max(el.offsetHeight - window.innerHeight, 1)
      setProgress(Math.min(1, Math.max(0, -rect.top / total)))
    }

    const onScrollOrResize = () => {
      if (raf) return
      raf = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [])

  return { ref, progress }
}

export function stageOpacity(progress: number, start: number, end: number) {
  if (progress < start) return 0
  if (progress > end) return 0
  const fade = Math.min(0.08, (end - start) * 0.25)
  if (progress < start + fade) return (progress - start) / fade
  if (progress > end - fade) return (end - progress) / fade
  return 1
}
