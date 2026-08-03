'use client'

import { Calendar, ListChecks, Megaphone, Users } from 'lucide-react'
import { PartnerIcon } from '@/components/partners/sections/visual-assets'

const WEEKS = [
  {
    week: 'Week 1',
    icon: Calendar,
    body: 'Territory setup, platform training and market review.',
  },
  {
    week: 'Week 2',
    icon: ListChecks,
    body: 'Imported businesses reviewed and priority prospect list prepared.',
  },
  {
    week: 'Week 3',
    icon: Megaphone,
    body: 'Outreach begins using presentations, demos and business packs.',
  },
  {
    week: 'Week 4',
    icon: Users,
    body: 'Move from outreach into meetings, onboarding opportunities and local launch activity.',
  },
]

export function PartnersFirst30() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-6 border-t border-[var(--p-border)]">
      <div className="mx-auto max-w-6xl">
        <h2
          className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3"
          style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
        >
          What your first 30 days look like
        </h2>
        <p className="text-[var(--p-muted)] mb-12 max-w-2xl text-lg">
          A clear path from setup to local activity — without implying guaranteed sales outcomes.
        </p>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WEEKS.map((w) => (
            <li
              key={w.week}
              className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] p-6 hover:border-white/15 transition-colors"
            >
              <PartnerIcon icon={w.icon} className="mb-5" />
              <p className="text-xs tracking-[0.12em] uppercase text-[var(--p-accent)] mb-3 font-medium">
                {w.week}
              </p>
              <p className="text-sm text-[var(--p-muted)] leading-relaxed">{w.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
