'use client'

import { ArrowRight } from 'lucide-react'
import { commercialCopy } from '@/lib/partners/commercial-copy'
import type { FoundingMeta } from '@/components/partners/partners-opportunity-page'
import { PARTNERS_IMG } from '@/components/partners/sections/visual-assets'
import { PartnersReveal } from '@/components/partners/sections/reveal'

export function PartnersFinalCta({
  founding,
  onReserve,
}: {
  founding: FoundingMeta
  onReserve: () => void
}) {
  return (
    <section className="relative py-28 sm:py-40 px-5 sm:px-6 border-t border-[var(--p-border)] overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={PARTNERS_IMG.beacon}
          alt=""
          className="h-full w-full object-cover opacity-45"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/88 to-[#050505]/65" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,196,106,0.28),transparent_50%)]" />
      </div>

      <PartnersReveal className="relative mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-[var(--p-accent)] mb-5">
          Your move
        </p>
        <h2
          className="text-3xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-tight mb-6 leading-[1.06]"
          style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
        >
          {commercialCopy.finalHeadline}
        </h2>
        <p className="text-[var(--p-muted)] mb-2 leading-relaxed text-lg sm:text-xl">
          {commercialCopy.finalBody}
        </p>
        <p
          className="text-xl sm:text-2xl font-semibold text-white mb-4 leading-snug"
          style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
        >
          {commercialCopy.finalQuestion}
        </p>
        <p className="text-sm text-[var(--p-faint)] mb-10">
          {founding.open
            ? commercialCopy.foundingCounterLabel(founding.secured, founding.total)
            : commercialCopy.foundingCapMessaging}
        </p>
        <button
          type="button"
          onClick={onReserve}
          className="group inline-flex items-center gap-2 rounded-xl bg-[var(--p-accent)] px-10 py-4 text-sm font-semibold text-[#050505] hover:brightness-110 active:scale-[0.98] transition-[filter,transform] shadow-[0_0_50px_-10px_rgba(0,196,106,0.65)]"
        >
          Reserve Your Territory
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </PartnersReveal>
    </section>
  )
}
