'use client'

import { PartnersReveal } from '@/components/partners/sections/reveal'

interface DayPhase {
  label: string
  title: string
  detail: string
  steps: string[]
}

const PHASES: DayPhase[] = [
  {
    label: 'Week 1',
    title: 'Your city lights up',
    detail: 'Territory locked. Local businesses pulled in. AI profiles built before you make a single call.',
    steps: ['Territory assigned', 'Businesses imported', 'AI profiles generated'],
  },
  {
    label: 'Weeks 2–4',
    title: 'You start conversations',
    detail: 'Materials ready. You meet owners with something real to show — not a pitch deck fantasy.',
    steps: ['Marketing kit ready', 'First business meetings'],
  },
  {
    label: 'Month 1+',
    title: 'Revenue starts compounding',
    detail: 'Subscribers land. Recurring income begins. Pace depends on your city and how hard you push.',
    steps: ['First subscribers', 'First recurring revenue'],
  },
]

/** Bridges vision → execution without promising outcomes. */
export function PartnersDayOne() {
  return (
    <section
      id="day-one"
      className="relative border-t border-[var(--p-border)] bg-black px-5 py-20 sm:px-6 sm:py-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(0,196,106,0.08),transparent_50%)]" />

      <div className="relative mx-auto max-w-6xl">
        <PartnersReveal className="mb-14 max-w-2xl">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--p-accent)]">
            Day one
          </p>
          <h2
            className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            What starting actually{' '}
            <span className="text-[var(--p-accent)]">looks like.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--p-muted)] sm:text-lg">
            Not a 90-day fantasy roadmap. The real sequence from assignment to activity —
            speed varies by territory and effort.
          </p>
        </PartnersReveal>

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-5">
          {PHASES.map((phase, i) => (
            <PartnersReveal key={phase.label} delayMs={i * 70}>
              <div className="relative h-full border-t border-[var(--p-accent)]/40 pt-6">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--p-accent)]">
                  {phase.label}
                </p>
                <h3
                  className="mb-3 text-xl font-semibold tracking-tight text-white sm:text-2xl"
                  style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
                >
                  {phase.title}
                </h3>
                <p className="mb-6 text-sm leading-relaxed text-[var(--p-muted)] sm:text-base">
                  {phase.detail}
                </p>
                <ul className="space-y-2.5">
                  {phase.steps.map((step) => (
                    <li key={step} className="flex items-center gap-2.5 text-sm text-white/85">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--p-accent)]"
                        aria-hidden
                      />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </PartnersReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
