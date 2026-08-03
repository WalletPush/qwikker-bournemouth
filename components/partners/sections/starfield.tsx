'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  a: number
  twinkle: number
  speed: number
  tint: 'white' | 'green' | 'cool'
}

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Full-bleed deep space for the centered globe hero.
 */
export function PartnersStarfield({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedRef = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedRef.current = mq.matches
    const onChange = () => {
      reducedRef.current = mq.matches
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let stars: Star[] = []
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const build = () => {
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.min(260, Math.floor((w * h) / 5500))
      stars = Array.from({ length: count }, (_, i) => {
        const t = hash(i + 1)
        return {
          x: hash(i * 3.1) * w,
          y: hash(i * 7.7) * h,
          r: t > 0.93 ? 1.5 + hash(i * 2) * 1.4 : 0.35 + t * 1.0,
          a: 0.2 + hash(i * 5.5) * 0.7,
          twinkle: hash(i * 9.2) * Math.PI * 2,
          speed: 0.35 + hash(i * 4.4) * 1.1,
          tint: t > 0.9 ? 'green' : t > 0.72 ? 'cool' : 'white',
        }
      })
    }

    build()
    const ro = new ResizeObserver(build)
    ro.observe(canvas)

    const colorFor = (s: Star, alpha: number) => {
      if (s.tint === 'green') return `rgba(0, 196, 106, ${alpha})`
      if (s.tint === 'cool') return `rgba(170, 210, 255, ${alpha})`
      return `rgba(255, 255, 255, ${alpha})`
    }

    const draw = (now: number) => {
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      ctx.clearRect(0, 0, w, h)

      for (const s of stars) {
        const pulse = reducedRef.current
          ? 1
          : 0.55 + 0.45 * Math.sin(now * 0.001 * s.speed + s.twinkle)
        const alpha = s.a * pulse
        ctx.beginPath()
        ctx.fillStyle = colorFor(s, alpha)
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()

        if (s.r > 1.15) {
          ctx.beginPath()
          ctx.fillStyle = colorFor(s, alpha * 0.22)
          ctx.arc(s.x, s.y, s.r * 3.4, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="partners-nebula absolute inset-0" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Readability on the copy column + fade into page */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/45 to-transparent lg:via-[#050505]/25" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#050505] to-transparent" />
    </div>
  )
}
