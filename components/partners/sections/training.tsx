'use client'

import { Play, Check } from 'lucide-react'
import { PARTNERS_TRAINING_IMG } from '@/components/partners/sections/visual-assets'

const INCLUDED = [
  'Structured onboarding course',
  'Live territory launch session',
  'Weekly group partner call',
  'Private partner community',
  'Sales presentation walkthrough',
  'Product update training',
  'Updated templates and playbooks',
  'Support replies within one business day',
]

export function PartnersTraining() {
  return (
    <section id="training" className="py-20 sm:py-28 px-5 sm:px-6 border-t border-[var(--p-border)]">
      <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <h2
            className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            Full training.
            <br />
            <span className="text-[var(--p-muted)]">Ongoing support.</span>
          </h2>
          <p className="text-[var(--p-muted)] mb-8 leading-relaxed text-lg">
            We&apos;re with you every step — clear inclusions, not vague promises.
          </p>
          <ul className="space-y-3.5">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-[var(--p-muted)]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--p-accent-dim)]">
                  <Check className="h-3 w-3 text-[var(--p-accent)]" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/5] sm:aspect-[5/4] rounded-3xl overflow-hidden border border-white/10 shadow-[0_30px_80px_-40px_rgba(0,196,106,0.4)]">
            <img
              src={PARTNERS_TRAINING_IMG}
              alt="Partner training and coaching"
              className="absolute inset-0 h-full w-full object-cover"
              width={900}
              height={720}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
            <button
              type="button"
              onClick={() => {
                document.getElementById('product-proof')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="absolute inset-0 flex items-center justify-center group"
              aria-label="Play overview video"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--p-accent)] text-[#050505] shadow-[0_0_40px_rgba(0,196,106,0.45)] transition-transform group-hover:scale-105">
                <Play className="h-6 w-6 fill-current ml-0.5" />
              </span>
            </button>
            <p className="absolute bottom-5 left-5 right-5 text-sm text-white/80">
              Watch the platform overview — or book a live walkthrough after you enquire.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl mt-14">
        <div className="rounded-2xl bg-[var(--p-accent)] px-6 py-8 text-center shadow-[0_0_60px_-20px_rgba(0,196,106,0.5)]">
          <p className="text-[#050505] text-lg sm:text-xl font-semibold">
            We don&apos;t just give you software. We help you build a business.
          </p>
        </div>
      </div>
    </section>
  )
}
