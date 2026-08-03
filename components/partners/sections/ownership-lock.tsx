'use client'

import { useStickyProgress } from '@/components/partners/use-sticky-progress'

/**
 * Sticky bridge between Infrastructure → Exclusive.
 * Manual scroll progress — Framer useScroll was unreliable here, and
 * html/body overflow-x:hidden was breaking position:sticky (fixed via clip).
 */
const LINES = [
  { text: 'Infrastructure without ownership', tone: 'muted' as const },
  { text: 'is just another job.', tone: 'white' as const },
  { text: 'Ownership without exclusivity', tone: 'muted' as const },
  { text: 'is just more competition.', tone: 'white' as const },
  { text: 'One city. One partner.', tone: 'accent' as const },
  { text: 'That’s the difference.', tone: 'white' as const },
]

function toneClass(tone: 'muted' | 'white' | 'accent') {
  if (tone === 'accent') return 'text-[var(--p-accent)]'
  if (tone === 'muted') return 'text-[var(--p-muted)]'
  return 'text-white'
}

export function PartnersOwnershipLock() {
  const { ref, progress } = useStickyProgress()

  return (
    <section
      id="ownership"
      ref={ref}
      className="relative border-t border-[var(--p-border)]"
      style={{ height: '200vh' }}
    >
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden bg-[#050505]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,196,106,0.1),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#050505] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#050505] to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-2xl px-5 text-center sm:px-6">
          <p className="mb-8 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--p-accent)]">
            The difference
          </p>

          <div className="flex flex-col items-center gap-2.5 sm:gap-3">
            {LINES.map((line, i) => {
              // First two lines visible as soon as the lock engages;
              // remaining lines reveal as you scroll through the pin.
              const appearAt = i <= 1 ? 0 : 0.08 + (i - 1) * 0.16
              const fadeIn = i <= 1 ? 0.01 : 0.1
              const t = Math.min(1, Math.max(0, (progress - appearAt) / fadeIn))
              const shown = progress >= appearAt - 0.001

              return (
                <p
                  key={line.text}
                  className={`text-2xl font-semibold leading-snug tracking-tight transition-[opacity,transform] duration-500 ease-out sm:text-3xl lg:text-[2.4rem] ${toneClass(line.tone)}`}
                  style={{
                    fontFamily: 'var(--font-partners-display), sans-serif',
                    opacity: shown ? 0.4 + t * 0.6 : 0,
                    transform: shown ? 'translateY(0)' : 'translateY(1rem)',
                  }}
                >
                  {line.text}
                </p>
              )
            })}
          </div>

          <div className="mx-auto mt-12 h-px max-w-[10rem] overflow-hidden bg-white/10">
            <div
              className="h-full bg-[var(--p-accent)] transition-[width] duration-150 ease-out"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
