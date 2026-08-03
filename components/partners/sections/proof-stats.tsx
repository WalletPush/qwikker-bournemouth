'use client'

import { PartnersReveal } from '@/components/partners/sections/reveal'

export interface PartnersProofStats {
  live_territories: number
  reserved_territories: number
  /** Distinct countries with at least one live franchise */
  countries: number
  founding_secured: number
  founding_total: number
  /** Platform-wide business_profiles count (all locations) */
  business_profiles: number | null
  imported_profiles?: number | null
  wallet_passes?: number | null
}

function formatCount(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

/** Real platform / territory counts — no invented marketing numbers. */
export function PartnersProof({ proof }: { proof: PartnersProofStats | null }) {
  if (!proof) return null

  const items: Array<{ value: string; label: string }> = [
    {
      value: formatCount(proof.founding_secured),
      label: `of ${proof.founding_total} founding territories secured`,
    },
  ]

  if (proof.countries > 0) {
    items.push({
      value: formatCount(proof.countries),
      label: 'countries with live territories',
    })
  }

  // Platform-wide count from business_profiles — all locations, refreshes each page load
  if (proof.business_profiles != null && proof.business_profiles > 0) {
    items.push({
      value: formatCount(proof.business_profiles),
      label: 'businesses live on the platform',
    })
  }

  if (proof.reserved_territories > 0) {
    items.push({
      value: formatCount(proof.reserved_territories),
      label: 'territories currently reserved',
    })
  }

  return (
    <section
      id="proof"
      className="relative border-t border-[var(--p-border)] bg-[#050505] px-5 py-20 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <PartnersReveal className="mb-12 text-center">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--p-accent)]">
            The platform today
          </p>
          <h2
            className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            Real numbers. Not projections.
          </h2>
        </PartnersReveal>

        <div
          className={`mx-auto grid gap-4 ${
            items.length <= 3
              ? 'max-w-4xl sm:grid-cols-3'
              : 'sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {items.map((item, i) => (
            <PartnersReveal key={item.label} delayMs={i * 40}>
              <div className="rounded-2xl border border-white/10 bg-[var(--p-surface)] px-6 py-7 text-center">
                <p
                  className="text-3xl font-semibold tabular-nums tracking-tight text-[var(--p-accent)] sm:text-4xl"
                  style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
                >
                  {item.value}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--p-muted)]">{item.label}</p>
              </div>
            </PartnersReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
