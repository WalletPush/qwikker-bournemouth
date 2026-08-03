'use client'

import { useStickyProgress } from '@/components/partners/use-sticky-progress'

/**
 * One unforgettable midway close — almost empty, atmosphere only.
 * Leads into the territory map / reserve section.
 */
export function PartnersCinematicLock() {
  const { ref, progress } = useStickyProgress()

  const line1 = progress < 0.08 ? 0 : Math.min(1, (progress - 0.08) / 0.12)
  const line1Hold = progress > 0.42 ? Math.max(0, 1 - (progress - 0.42) / 0.1) : line1
  const line2 = progress < 0.48 ? 0 : Math.min(1, (progress - 0.48) / 0.12)
  const line2Hold = progress > 0.72 ? Math.max(0, 1 - (progress - 0.72) / 0.08) : line2
  const line3 = progress < 0.78 ? 0 : Math.min(1, (progress - 0.78) / 0.1)

  return (
    <section
      id="cinematic"
      ref={ref}
      className="relative border-t border-[var(--p-border)]"
      style={{ height: '220vh' }}
    >
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden bg-black">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,196,106,0.08),transparent_50%)]" />

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <p
            className="text-3xl font-semibold leading-snug tracking-tight text-white transition-opacity duration-500 sm:text-5xl lg:text-[3.5rem]"
            style={{
              opacity: line1Hold,
              fontFamily: 'var(--font-partners-display), sans-serif',
            }}
          >
            Every city will eventually have one.
          </p>

          <p
            className="mt-10 text-xl font-medium text-white/55 transition-opacity duration-500 sm:text-2xl"
            style={{
              opacity: line2Hold,
              fontFamily: 'var(--font-partners-display), sans-serif',
            }}
          >
            The only question is…
          </p>

          <p
            className="mt-8 text-3xl font-semibold tracking-tight text-[var(--p-accent)] transition-opacity duration-500 sm:text-5xl"
            style={{
              opacity: line3,
              fontFamily: 'var(--font-partners-display), sans-serif',
            }}
          >
            Will it be yours?
          </p>
        </div>
      </div>
    </section>
  )
}
