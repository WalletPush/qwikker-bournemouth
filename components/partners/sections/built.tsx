'use client'

import { Check } from 'lucide-react'
import { commercialCopy } from '@/lib/partners/commercial-copy'

const CAPABILITIES = [
  'Multi-tenant partner system',
  'Business import engine',
  'AI search & chat',
  'Digital wallet passes',
  'Loyalty & rewards',
  'Offers & redemptions',
  'QR acquisition',
  'Analytics dashboards',
  'Claim & acquisition pipeline',
  'Present-mode demos',
  'Email & SMS tooling',
  'HQ operations console',
]

export function PartnersBuilt() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-6 border-t border-[var(--p-border)]">
      <div className="mx-auto max-w-6xl">
        <h2
          className="text-3xl sm:text-5xl font-semibold tracking-tight max-w-4xl mb-4 leading-[1.08]"
          style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
        >
          What we&apos;ve already built
          <span className="text-[var(--p-muted)]"> so you don&apos;t have to.</span>
        </h2>
        <p className="text-[var(--p-muted)] text-lg mb-14 max-w-2xl">
          Years of work. Thousands of hours. A continually evolving platform.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mb-14">
          {[
            { value: 'Ready', label: 'Complete local ecosystem' },
            { value: 'Depth', label: 'Enriched business profiles' },
            { value: 'Hours', label: 'Thousands invested in product' },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-3xl border border-white/10 bg-[var(--p-surface)] p-8 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,196,106,0.1),transparent_55%)]" />
              <p
                className="relative text-4xl sm:text-5xl font-semibold text-[var(--p-accent)] mb-3 tracking-tight"
                style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
              >
                {m.value}
              </p>
              <p className="relative text-sm text-[var(--p-muted)]">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-[var(--p-border)] bg-[var(--p-surface)] p-8 sm:p-10 mb-10">
          <p className="text-xs tracking-[0.14em] uppercase text-[var(--p-faint)] mb-6">
            {commercialCopy.platformBuiltCopy}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-4">
            {CAPABILITIES.map((c) => (
              <div key={c} className="flex items-start gap-3 text-sm text-[var(--p-muted)]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--p-accent-dim)]">
                  <Check className="h-3 w-3 text-[var(--p-accent)]" strokeWidth={3} />
                </span>
                {c}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xl sm:text-2xl text-white font-semibold tracking-tight">
          You build the business. We keep building the platform.
        </p>
      </div>
    </section>
  )
}
