'use client'

import { PARTNERS_IMG } from '@/components/partners/sections/visual-assets'
import { stageOpacity, useStickyProgress } from '@/components/partners/use-sticky-progress'

interface Era {
  id: string
  title: string
  verb: string
  result: string
  range: [number, number]
}

const ERAS: Era[] = [
  {
    id: 'social',
    title: 'Social Media',
    verb: 'Created',
    result: 'Thousands of creators.',
    range: [0.12, 0.34],
  },
  {
    id: 'ecommerce',
    title: 'Ecommerce',
    verb: 'Created',
    result: 'Millions of online stores.',
    range: [0.32, 0.54],
  },
  {
    id: 'rides',
    title: 'Ride Sharing',
    verb: 'Created',
    result: 'Ride-sharing entrepreneurs.',
    range: [0.52, 0.74],
  },
  {
    id: 'ai',
    title: 'AI',
    verb: 'Creating',
    result: 'Local Intelligence Networks.',
    range: [0.72, 0.94],
  },
]

function EraVisual({ id, opacity }: { id: string; opacity: number }) {
  if (opacity <= 0.01) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 transition-opacity duration-300"
      style={{ opacity }}
      aria-hidden
    >
      {id === 'social' && <SocialVisual />}
      {id === 'ecommerce' && <EcommerceVisual />}
      {id === 'rides' && <RidesVisual />}
      {id === 'ai' && <CityNetworkVisual />}
    </div>
  )
}

function SocialVisual() {
  const nodes = [
    [20, 30],
    [40, 22],
    [58, 35],
    [72, 28],
    [30, 55],
    [50, 50],
    [68, 58],
    [45, 70],
  ]
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <g stroke="rgba(255,255,255,0.12)" strokeWidth="0.15">
        <line x1="20" y1="30" x2="40" y2="22" />
        <line x1="40" y1="22" x2="58" y2="35" />
        <line x1="58" y1="35" x2="72" y2="28" />
        <line x1="40" y1="22" x2="50" y2="50" />
        <line x1="50" y1="50" x2="30" y2="55" />
        <line x1="50" y1="50" x2="68" y2="58" />
        <line x1="50" y1="50" x2="45" y2="70" />
      </g>
      {nodes.map(([x, y], i) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={i === 5 ? 1.4 : 0.9}
          fill={i === 5 ? '#00C46A' : 'rgba(255,255,255,0.35)'}
        />
      ))}
    </svg>
  )
}

function EcommerceVisual() {
  const boxes = [
    { x: '18%', y: '28%' },
    { x: '42%', y: '22%' },
    { x: '68%', y: '32%' },
    { x: '30%', y: '58%' },
    { x: '58%', y: '62%' },
  ]
  return (
    <>
      {boxes.map((b) => (
        <div
          key={`${b.x}-${b.y}`}
          className="absolute h-10 w-10 rounded-md border border-white/15 bg-white/[0.04] shadow-[0_0_30px_rgba(0,196,106,0.08)] sm:h-12 sm:w-12"
          style={{ left: b.x, top: b.y }}
        >
          <div className="absolute inset-x-2 top-2 h-px bg-[var(--p-accent)]/50" />
          <div className="absolute inset-x-3 bottom-2.5 h-px bg-white/10" />
        </div>
      ))}
    </>
  )
}

function RidesVisual() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <path
        d="M10 70 C25 40, 40 55, 55 35 S80 25, 95 45"
        fill="none"
        stroke="rgba(0,196,106,0.35)"
        strokeWidth="0.35"
        strokeDasharray="1.2 1.2"
      />
      <path
        d="M5 50 C30 60, 45 30, 70 48 S90 70, 98 55"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.25"
      />
      {[
        [22, 52],
        [48, 40],
        [72, 42],
        [88, 50],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x - 1.2} y={y - 0.7} width="2.4" height="1.4" rx="0.35" fill="#00C46A" opacity="0.85" />
        </g>
      ))}
    </svg>
  )
}

function CityNetworkVisual() {
  const labels = [
    { t: 'Restaurants', x: '14%', y: '30%' },
    { t: 'Events', x: '42%', y: '22%' },
    { t: 'Hotels', x: '70%', y: '28%' },
    { t: 'Offers', x: '22%', y: '58%' },
    { t: 'Businesses', x: '58%', y: '62%' },
  ]
  return (
    <>
      <img
        src={PARTNERS_IMG.networkGrid}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-[#050505]/55" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,196,106,0.2),transparent_55%)]" />
      {labels.map((l) => (
        <div
          key={l.t}
          className="absolute rounded-full border border-[var(--p-accent)]/35 bg-[#050505]/70 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm sm:text-xs"
          style={{ left: l.x, top: l.y }}
        >
          {l.t}
        </div>
      ))}
    </>
  )
}

/** Apple-keynote style eras: technology shifts → new businesses → local AI networks. */
export function PartnersErasLock() {
  const { ref, progress } = useStickyProgress()

  const introOp = stageOpacity(progress, 0, 0.16)
  // Hold through the end of the pin
  const closeOp =
    progress < 0.88 ? 0 : Math.min(1, (progress - 0.88) / 0.06)

  return (
    <section
      id="industry"
      ref={ref}
      className="relative border-t border-[var(--p-border)]"
      style={{ height: '340vh' }}
    >
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden bg-[#050505]">
        {/* Soft era visuals behind type */}
        {ERAS.map((era) => (
          <EraVisual
            key={era.id}
            id={era.id}
            opacity={stageOpacity(progress, era.range[0], era.range[1])}
          />
        ))}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050505]/80 via-transparent to-[#050505]/85" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050505]/70 via-transparent to-[#050505]/70" />

        <div className="relative z-10 mx-auto w-full max-w-4xl px-5 text-center sm:px-8">
          {/* Intro */}
          <div
            className="absolute inset-x-5 top-1/2 -translate-y-1/2 transition-opacity duration-300 sm:inset-x-8"
            style={{ opacity: introOp, pointerEvents: introOp > 0.05 ? 'auto' : 'none' }}
          >
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--p-accent)]">
              The pattern
            </p>
            <h2
              className="text-3xl font-semibold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]"
              style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
            >
              Every major technology shift
              <br />
              creates a new type of business.
            </h2>
          </div>

          {/* Eras */}
          {ERAS.map((era) => {
            const op = stageOpacity(progress, era.range[0], era.range[1])
            return (
              <div
                key={era.id}
                className="absolute inset-x-5 top-1/2 -translate-y-1/2 transition-opacity duration-300 sm:inset-x-8"
                style={{ opacity: op, pointerEvents: op > 0.05 ? 'auto' : 'none' }}
              >
                <p
                  className="mb-4 text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-[4.5rem]"
                  style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
                >
                  {era.title}
                </p>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">
                  {era.verb}
                </p>
                <p
                  className={`text-2xl font-semibold tracking-tight sm:text-3xl ${
                    era.id === 'ai' ? 'text-[var(--p-accent)]' : 'text-white/85'
                  }`}
                  style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
                >
                  {era.result}
                </p>
              </div>
            )
          })}

          {/* Close */}
          <div
            className="absolute inset-x-5 top-1/2 -translate-y-1/2 transition-opacity duration-300 sm:inset-x-8"
            style={{ opacity: closeOp, pointerEvents: closeOp > 0.05 ? 'auto' : 'none' }}
          >
            <p
              className="text-2xl font-semibold leading-snug tracking-tight text-white sm:text-4xl"
              style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
            >
              Qwikker gives you the opportunity
              <br />
              to build one.
            </p>
          </div>
        </div>

        {/* Progress ticks */}
        <div className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {ERAS.map((era) => {
            const active = progress >= era.range[0] && progress < era.range[1]
            return (
              <span
                key={era.id}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: active ? 28 : 8,
                  background: active ? '#00C46A' : 'rgba(255,255,255,0.2)',
                }}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
