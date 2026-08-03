'use client'

import {
  Rocket,
  MapPinned,
  Package,
  Wallet,
  Shield,
  Crown,
} from 'lucide-react'
import { PartnerIcon } from '@/components/partners/sections/visual-assets'

const PILLARS = [
  { icon: Rocket, title: 'Growing category', text: 'Local discovery is moving into AI-assisted answers and retention loops.' },
  { icon: MapPinned, title: 'Territory model', text: 'Build and operate Qwikker in your assigned market.' },
  { icon: Package, title: 'Don’t start from zero', text: 'Platform, data import, sales materials and launch system included.' },
  { icon: Wallet, title: 'Multiple revenue streams', text: 'Subscriptions, setup fees and ongoing local growth.' },
  { icon: Shield, title: 'Future-proof distribution', text: 'Wallet passes, QR, AI chat and loyalty — not another dead app.' },
  { icon: Crown, title: 'First-mover in your market', text: 'Be the operator who connects local businesses before competitors do.' },
]

export function PartnersWhy() {
  return (
    <section className="py-20 sm:py-28 px-5 sm:px-6 border-t border-[var(--p-border)]">
      <div className="mx-auto max-w-6xl">
        <h2
          className="text-3xl sm:text-4xl font-semibold tracking-tight text-center mb-4"
          style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
        >
          Why partners choose Qwikker
        </h2>
        <p className="text-center text-[var(--p-muted)] mb-14 max-w-xl mx-auto">
          A complete local ecosystem — not another SaaS login.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] p-6 hover:border-white/15 transition-colors"
            >
              <PartnerIcon icon={p.icon} className="mb-5" />
              <h3 className="font-semibold text-white mb-2 text-lg">{p.title}</h3>
              <p className="text-sm text-[var(--p-muted)] leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
