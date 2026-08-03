'use client'

import { Clock, Shield, TrendingUp, Rocket } from 'lucide-react'
import { PartnersReveal } from '@/components/partners/sections/reveal'
import { PARTNERS_IMG } from '@/components/partners/sections/visual-assets'

const POINTS = [
  {
    icon: Clock,
    text: 'The opportunity is real. AI-driven discovery is still early. Most territories are still open.',
  },
  {
    icon: Shield,
    text: 'Territory is everything. Once a city is claimed, it’s protected.',
  },
  {
    icon: TrendingUp,
    text: 'The value compounds. The more businesses you connect, the harder you are to compete with.',
  },
]

/** Early movers / timing — hourglass visual + keynote copy. */
export function PartnersEarlyMovers() {
  return (
    <section
      id="timing"
      className="relative overflow-hidden border-t border-[var(--p-border)] bg-black px-5 py-20 sm:px-6 sm:py-28"
    >
      {/* Soft glow only under the glass — not a hard panel behind the PNG */}
      <div className="pointer-events-none absolute right-0 top-1/2 hidden h-[70%] w-[45%] -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,196,106,0.16),transparent_65%)] blur-3xl lg:block" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-10">
        <PartnersReveal className="order-2 lg:order-1">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--p-accent)]">
            Early movers
          </p>
          <h2
            className="mb-4 text-3xl font-semibold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            The window won&apos;t stay open.
          </h2>
          <p className="mb-6 max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
            Early movers shape the ecosystem. The rest are left adapting to it.
          </p>

          <div className="mb-8 h-px w-16 bg-[var(--p-accent)]" />

          <ul className="mb-8 space-y-5">
            {POINTS.map((p) => (
              <li key={p.text} className="flex gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--p-accent)]/25 bg-[var(--p-accent-dim)]">
                  <p.icon className="h-4 w-4 text-[var(--p-accent)]" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="text-sm leading-relaxed text-white/80 sm:text-base">{p.text}</p>
              </li>
            ))}
          </ul>

          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--p-accent)]/30 bg-[var(--p-accent-dim)]">
              <Rocket className="h-4 w-4 text-[var(--p-accent)]" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="text-sm leading-relaxed text-white/85 sm:text-base">
              Move early. Build the ecosystem while the window is still open.
            </p>
          </div>
        </PartnersReveal>

        <PartnersReveal delayMs={80} className="order-1 lg:order-2">
          <div className="relative mx-auto max-w-md lg:max-w-none">
            {/* screen blend drops the PNG’s flat black so only the glow remains */}
            <img
              src={PARTNERS_IMG.hourglass}
              alt="Hourglass turning opportunity into a connected city"
              className="relative z-10 mx-auto w-full max-w-lg mix-blend-screen"
              style={{
                WebkitMaskImage:
                  'radial-gradient(ellipse 72% 78% at 50% 48%, #000 55%, transparent 100%)',
                maskImage:
                  'radial-gradient(ellipse 72% 78% at 50% 48%, #000 55%, transparent 100%)',
              }}
              loading="lazy"
            />
          </div>
        </PartnersReveal>
      </div>
    </section>
  )
}
