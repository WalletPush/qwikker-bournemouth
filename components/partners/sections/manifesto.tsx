'use client'

import { PartnersReveal } from '@/components/partners/sections/reveal'

/** Quiet mission close — no founder photos, no corporate tone. */
export function PartnersManifesto() {
  return (
    <section
      id="manifesto"
      className="relative border-t border-[var(--p-border)] bg-[#050505] px-5 py-24 sm:px-6 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,196,106,0.07),transparent_55%)]" />
      <PartnersReveal className="relative mx-auto max-w-2xl">
        <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--p-accent)]">
          Why we’re building Qwikker
        </p>
        <div
          className="space-y-6 text-lg leading-relaxed text-[var(--p-muted)] sm:text-xl"
          style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
        >
          <p className="text-2xl font-semibold text-white sm:text-3xl">Search is changing.</p>
          <p>AI is becoming the front door to every local business.</p>
          <p>
            We believe every city deserves someone invested in helping local businesses thrive in
            that future.
          </p>
          <p className="text-white">
            Not another directory.
            <br />
            Not another agency.
          </p>
          <p>
            A local owner building something that becomes more valuable as the ecosystem grows.
          </p>
          <p className="pt-2 text-xl font-semibold text-[var(--p-accent)] sm:text-2xl">
            That’s why Qwikker exists.
          </p>
        </div>
      </PartnersReveal>
    </section>
  )
}
