'use client'

import { useEffect, useRef } from 'react'
import { ArrowRight, ShieldCheck, CalendarDays, Gauge } from 'lucide-react'
import { commercialCopy } from '@/lib/partners/commercial-copy'
import { trackPartnersEvent } from '@/lib/partners/analytics'
import { formatMoney } from '@/lib/partners/format-money'

export function PartnersPricing({
  foundingOpen,
  onReserve,
}: {
  foundingOpen: boolean
  onReserve: () => void
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          trackPartnersEvent('partners_pricing_viewed')
          io.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section ref={ref} id="pricing" className="py-20 sm:py-28 px-5 sm:px-6 border-t border-[var(--p-border)]">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <h2
            className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            Start building in your city
          </h2>
          <p className="text-[var(--p-muted)]">
            {foundingOpen
              ? commercialCopy.foundingTermsSummary
              : commercialCopy.foundingCapMessaging}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto mb-12">
          <div className="relative rounded-3xl border border-[var(--p-accent)]/40 bg-[var(--p-surface)] p-8 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,196,106,0.12),transparent_60%)]" />
            <div className="relative">
              <p className="text-xs tracking-[0.14em] uppercase text-[var(--p-accent)] mb-3 font-medium">
                Territory fee
              </p>
              <p className="text-4xl font-semibold text-white mb-1">{formatMoney(997)}</p>
              <p className="text-sm text-[var(--p-muted)] mb-2">One-time</p>
              <p className="text-sm text-[var(--p-accent)] font-medium mb-8">
                Pay nothing more for your first 6 months
              </p>
              <ul className="space-y-3">
                {[
                  'Assigned territory',
                  'Platform access',
                  'Business import',
                  'Training',
                  'Sales materials',
                  'Marketing assets',
                  '6 months Qwikker monthly included',
                ].map((i) => (
                  <li key={i} className="flex gap-2 text-sm text-[var(--p-muted)]">
                    <svg className="w-4 h-4 text-[var(--p-accent)] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--p-border)] bg-[var(--p-surface)] p-8">
            <p className="text-xs tracking-[0.14em] uppercase text-[var(--p-faint)] mb-3 font-medium">
              {commercialCopy.monthlyPriceLabel}
            </p>
            <p className="text-4xl font-semibold text-white mb-1">{formatMoney(249)}</p>
            <p className="text-sm text-[var(--p-muted)] mb-8">/ month after 6 months</p>
            <ul className="space-y-3">
              {['Hosting', 'Support', 'Updates', 'Training access', 'Resources'].map((i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--p-muted)]">
                  <svg className="w-4 h-4 text-[var(--p-accent)] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {i}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
          {[
            { icon: ShieldCheck, label: 'Low risk to start' },
            { icon: CalendarDays, label: '6 months included' },
            { icon: Gauge, label: 'Scale at your pace' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] py-4 px-3"
            >
              <item.icon className="h-4 w-4 text-[var(--p-accent)]" strokeWidth={1.75} />
              <span className="text-sm text-[var(--p-muted)]">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={onReserve}
            className="group inline-flex items-center gap-2 rounded-xl bg-[var(--p-accent)] px-8 py-3.5 text-sm font-semibold text-[#050505] hover:brightness-110 active:scale-[0.98] transition-[filter,transform] shadow-[0_0_40px_-12px_rgba(0,196,106,0.55)]"
          >
            Reserve Your Territory
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="text-xs text-[var(--p-faint)] text-center max-w-md">USD pricing shown</p>
        </div>
      </div>
    </section>
  )
}
