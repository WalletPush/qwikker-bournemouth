'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Clock, Mail, CheckCircle2, ArrowRight } from 'lucide-react'

interface ClaimPendingDashboardProps {
  firstName: string
  businessName: string
  city: string
  claimDate: string
}

export function ClaimPendingDashboard({ firstName, businessName, city, claimDate }: ClaimPendingDashboardProps) {
  const submitted = new Date(claimDate)
  const now = new Date()
  const hoursAgo = Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60))
  const daysAgo = Math.floor(hoursAgo / 24)

  const timeLabel = daysAgo > 0
    ? `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`
    : hoursAgo > 0
      ? `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`
      : 'just now'

  const cityDisplay = city.charAt(0).toUpperCase() + city.slice(1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
          backgroundSize: '30px 30px'
        }} />
      </div>

      <div className="relative w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img src="/qwikker-logo-web.svg" alt="QWIKKER" className="h-8 w-auto opacity-60" />
          </div>
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Hey {firstName}, we&apos;re on it!
          </h1>
          <p className="text-neutral-400">
            Your claim for <strong className="text-white">{businessName}</strong> is being reviewed
          </p>
        </div>

        <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-sm text-amber-300">
                Claim submitted {timeLabel} — the {cityDisplay} team is reviewing it
              </p>
            </div>

            <div className="space-y-3">
              {[
                { done: true, text: 'Account created' },
                { done: true, text: 'Claim submitted for review' },
                { done: false, text: `${cityDisplay} team verifies ownership` },
                { done: false, text: 'You receive an approval email' },
                { done: false, text: 'Full dashboard access unlocked' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00d083] flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${step.done ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-neutral-500">
                  We&apos;ll email you the moment your claim is approved. Most claims are reviewed within 24 hours during business hours.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Explore {cityDisplay} while you wait
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
