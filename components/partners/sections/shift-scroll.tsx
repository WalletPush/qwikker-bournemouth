'use client'

import { PartnersReveal } from '@/components/partners/sections/reveal'
import { PARTNERS_IMG } from '@/components/partners/sections/visual-assets'

/**
 * Page-break “Shift” section — centered typography first.
 * (Scroll-layered eras can come back once this lands cleanly.)
 */
export function PartnersShiftScroll() {
  return (
    <section
      id="shift"
      className="relative flex min-h-[90svh] items-center justify-center overflow-hidden border-t border-[var(--p-border)] px-5 py-24 sm:px-6 sm:py-32"
    >
      <div className="absolute inset-0">
        <img
          src={PARTNERS_IMG.skylineNight}
          alt=""
          className="h-full w-full object-cover opacity-30"
          aria-hidden
        />
        <div className="absolute inset-0 bg-[#050505]/75" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,196,106,0.1),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <PartnersReveal>
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--p-accent)]">
            The shift
          </p>
          <h2
            className="mb-10 text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            The shift has already started.
          </h2>
        </PartnersReveal>

        <PartnersReveal delayMs={80} className="mx-auto max-w-xl space-y-5 text-lg leading-relaxed text-[var(--p-muted)] sm:text-xl">
          <p>Businesses rushed to build websites.</p>
          <p>Then they fought to appear on Google.</p>
          <p>Discovery fragmented across apps and ads.</p>
          <p className="pt-2 font-medium text-white">Now people are asking AI.</p>
        </PartnersReveal>

        <PartnersReveal delayMs={140} className="mx-auto mt-12 max-w-lg space-y-3">
          {[
            'Where should we eat tonight?',
            'Who can I trust nearby?',
            'What’s happening this weekend?',
          ].map((q) => (
            <p
              key={q}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3.5 text-base text-white/90 sm:text-lg"
            >
              <span className="text-[var(--p-accent)]">“</span>
              {q}
              <span className="text-[var(--p-accent)]">”</span>
            </p>
          ))}
        </PartnersReveal>

        <PartnersReveal delayMs={200} className="mt-14">
          <p
            className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            Someone has to build that future.
          </p>
          <p
            className="mt-3 text-xl font-semibold text-[var(--p-accent)] sm:text-2xl"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            Will it be you?
          </p>
        </PartnersReveal>
      </div>
    </section>
  )
}
