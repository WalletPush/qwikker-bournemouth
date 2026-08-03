'use client'

import { Check } from 'lucide-react'
import { commercialCopy } from '@/lib/partners/commercial-copy'
import { formatMoney } from '@/lib/partners/format-money'

const TIERS = [
  {
    name: 'Starter',
    price: 19.99,
    accent: '#00C46A',
    points: ['Core visibility', 'Profile in discovery', 'Basic analytics'],
  },
  {
    name: 'Featured',
    price: 49.99,
    accent: '#F5A524',
    featured: true,
    points: ['Higher placement', 'Stronger AI prominence', 'Expanded analytics'],
  },
  {
    name: 'Spotlight',
    price: 99.99,
    accent: '#E5484D',
    points: ['Priority visibility', 'Top AI prominence', 'Full analytics suite'],
  },
]

export function PartnersBusinessTiers() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-6 border-t border-[var(--p-border)]">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            Recommended business pricing
          </h2>
          <p className="text-sm text-[var(--p-faint)]">{commercialCopy.recommendedPricingNote}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 items-stretch">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-3xl border bg-[var(--p-surface)] p-7 flex flex-col ${
                t.featured
                  ? 'border-white/20 md:-translate-y-2 shadow-[0_20px_60px_-30px_rgba(245,165,36,0.35)]'
                  : 'border-[var(--p-border)]'
              }`}
            >
              {t.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#F5A524] px-3 py-0.5 text-[10px] font-semibold tracking-wide uppercase text-[#050505]">
                  Most popular
                </span>
              )}
              <div
                className="mb-5 h-1 w-12 rounded-full"
                style={{ background: t.accent, boxShadow: `0 0 16px ${t.accent}` }}
              />
              <p className="text-sm text-[var(--p-muted)] mb-1">{t.name}</p>
              <p className="text-3xl font-semibold text-white mb-6">
                {formatMoney(t.price)}
                <span className="text-sm font-normal text-[var(--p-faint)]">/mo</span>
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {t.points.map((p) => (
                  <li key={p} className="flex gap-2 text-sm text-[var(--p-muted)]">
                    <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: t.accent }} strokeWidth={2.5} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
