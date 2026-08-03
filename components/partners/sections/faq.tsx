'use client'

import { useState } from 'react'

const FAQ = [
  {
    q: 'What does reserving a territory mean?',
    a: 'You send an enquiry, confirm your email, and we take a look. Usually we’ll get back within a couple of business days. If we approve you, we hold the territory for 30 days while onboarding wraps up — so nobody else can grab it while you’re getting set.',
  },
  {
    q: 'What is included?',
    a: 'You get the full local platform — discovery, profiles, loyalty, wallet passes, offers, events, QR tools, analytics — plus training, sales materials, a ready prospect base of enriched businesses, and ongoing product updates. The partner agreement spells out the details.',
  },
  {
    q: 'Are territories exclusive?',
    a: 'Yes — one partner per territory. We don’t put another Qwikker partner down the road in your market. Exact exclusivity language lives in your agreement.',
  },
  {
    q: 'What are founding partner terms?',
    a: 'Founding terms are for the first 100 founding territories secured. Once those are gone, you can still enquire — you’d just come in under standard partner terms.',
  },
  {
    q: 'Do imported businesses already pay or partner with Qwikker?',
    a: 'No. Those profiles give your city depth and a list of people to talk to. Paying customers and claimed listings come later, when you onboard them.',
  },
  {
    q: 'Who owns the brand and data?',
    a: 'Qwikker keeps the brand and the platform. You operate your territory under the partner agreement — that’s your lane.',
  },
  {
    q: 'Can I transfer my territory?',
    a: 'Sometimes, yes — but transfers follow the rules in your partner agreement. We’ll walk you through it if it comes up.',
  },
  {
    q: 'Is pricing the same in every country?',
    a: 'We show recommended launch pricing in USD. Local pricing can be adjusted with HQ approval when it makes sense for the market.',
  },
]

export function PartnersFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="border-t border-[var(--p-border)] px-5 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <h2
          className="mb-3 text-center text-3xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
        >
          Questions people actually ask
        </h2>
        <p className="mb-8 text-center text-sm text-[var(--p-muted)]">
          Straight answers — the legal detail still lives in your agreement.
        </p>
        <div className="space-y-2">
          {FAQ.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q} className="rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 rounded-xl px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--p-accent)]"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="text-sm font-medium text-white sm:text-base">{item.q}</span>
                  <span className="text-lg leading-none text-[var(--p-faint)]" aria-hidden>
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm leading-relaxed text-[var(--p-muted)]">{item.a}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
