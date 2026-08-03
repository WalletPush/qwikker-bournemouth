'use client'

import {
  MapPinned,
  Cpu,
  Database,
  Handshake,
  GraduationCap,
  Presentation,
  Megaphone,
  QrCode,
  Rocket,
  HeadphonesIcon,
  RefreshCw,
  LineChart,
  Wallet,
  Stamp,
  Lock,
  Bell,
  Sparkles,
} from 'lucide-react'
import { commercialCopy } from '@/lib/partners/commercial-copy'
import { PartnerIcon } from '@/components/partners/sections/visual-assets'

const FEATURES = [
  { icon: MapPinned, title: 'Assigned territory' },
  { icon: Cpu, title: 'Complete local ecosystem' },
  { icon: Database, title: 'Enriched business profiles' },
  { icon: Handshake, title: 'Ready-to-sell opportunities' },
  { icon: GraduationCap, title: 'Training' },
  { icon: Presentation, title: 'Sales materials' },
  { icon: Megaphone, title: 'Marketing assets' },
  { icon: QrCode, title: 'QR acquisition' },
  { icon: Rocket, title: 'Launch system' },
  { icon: HeadphonesIcon, title: 'Ongoing support' },
  { icon: RefreshCw, title: 'Continuous updates' },
  { icon: LineChart, title: 'Recurring revenue model' },
]

const PRODUCT = [
  { icon: Wallet, title: 'Wallet offers', text: 'Apple & Google Wallet' },
  { icon: Stamp, title: 'Loyalty cards', text: 'Digital stamp cards' },
  { icon: Lock, title: 'Secret menus', text: 'Pass-holder exclusives' },
  { icon: Bell, title: 'Push notifications', text: 'No app download required' },
  { icon: Sparkles, title: 'AI discovery', text: 'Local search & recommendations' },
]

const YOU_DO = [
  'Onboard local businesses',
  'Drive adoption and build relationships',
  'Execute local growth strategies',
]

const YOU_GET = [
  'Your own branded subdomain',
  'Business import and CRM tools',
  'AI knowledge base',
  'QR marketing system',
  'Loyalty programme builder',
  'Push notification engine',
  'Real-time analytics dashboard',
  'Central product updates and support',
]

export function PartnersWhatYouGet() {
  return (
    <section id="what-you-get" className="py-20 sm:py-28 px-5 sm:px-6 border-t border-[var(--p-border)]">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2
            className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight mb-5 leading-[1.1]"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            You don&apos;t need to build anything.
            <br />
            <span className="text-[var(--p-muted)]">We&apos;ve already done it for you.</span>
          </h2>
          <p className="text-[var(--p-muted)] text-lg leading-relaxed">
            <span className="text-white font-medium">{commercialCopy.ecosystemLabel}</span>
            {' — '}
            AI discovery, business profiles, loyalty, wallet passes, offers, events, QR acquisition,
            analytics and partnership tooling.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-4 rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] px-5 py-4 hover:border-white/15 transition-colors"
            >
              <PartnerIcon icon={f.icon} />
              <p className="text-sm font-medium text-white">{f.title}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-14">
          {PRODUCT.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] p-5 text-center hover:border-white/15 transition-colors"
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--p-accent-dim)] border border-[var(--p-border)]">
                <f.icon className="h-5 w-5 text-[var(--p-accent)]" strokeWidth={1.75} />
              </div>
              <p className="text-sm font-semibold text-white mb-1">{f.title}</p>
              <p className="text-xs text-[var(--p-faint)]">{f.text}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-[var(--p-faint)] mb-14 max-w-2xl mx-auto leading-relaxed">
          {commercialCopy.importedProfilesCopy}
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] p-8">
            <h3 className="text-xs font-semibold tracking-[0.12em] uppercase text-[var(--p-faint)] mb-6">
              You do
            </h3>
            <ul className="space-y-4">
              {YOU_DO.map((item) => (
                <li key={item} className="flex gap-3 text-[var(--p-muted)]">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--p-accent)] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--p-accent)]/25 bg-[var(--p-accent-dim)] p-8">
            <h3 className="text-xs font-semibold tracking-[0.12em] uppercase text-[var(--p-accent)] mb-6">
              You get
            </h3>
            <ul className="space-y-3">
              {YOU_GET.map((item) => (
                <li key={item} className="flex gap-3 text-[var(--p-muted)] text-sm">
                  <svg className="w-4 h-4 text-[var(--p-accent)] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--p-accent)] px-6 py-10 text-center shadow-[0_0_60px_-20px_rgba(0,196,106,0.5)]">
          <p className="text-[#050505] text-xl sm:text-2xl font-semibold leading-snug max-w-3xl mx-auto">
            Years of work. Thousands of hours. A platform ready to operate — so you can focus on the
            city.
          </p>
        </div>
      </div>
    </section>
  )
}
