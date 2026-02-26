'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ElegantModal } from '@/components/ui/elegant-modal'
import { LoyaltySpecsForm } from '@/components/dashboard/loyalty-specs-form'
import { LoyaltyStatsDashboard } from '@/components/dashboard/loyalty-stats-dashboard'
import { CheckCircle2, Clock, Loader2, Pause, ArrowRight, Users, TrendingUp, Gift, Trophy } from 'lucide-react'
import { LoyaltyCardPreview, toLoyaltyCardPreviewProps } from '@/components/loyalty/loyalty-card-preview'
import type { LoyaltyProgram } from '@/lib/loyalty/loyalty-types'

interface LoyaltyPageClientProps {
  profile: any
  program: LoyaltyProgram | null
}

export function LoyaltyPageClient({ profile, program: initialProgram }: LoyaltyPageClientProps) {
  const [program, setProgram] = useState<LoyaltyProgram | null>(initialProgram)
  const [showUpgradeModal, setShowUpgradeModal] = useState(true)

  const hasAccess =
    profile?.features?.loyalty_cards === true ||
    profile?.subscription?.subscription_tiers?.tier_name === 'spotlight' ||
    profile?.plan === 'spotlight' ||
    profile?.plan === 'pro'

  // No Spotlight access -- show upgrade prompt
  if (!hasAccess) {
    return (
      <div className="space-y-8">
        <ElegantModal
          isOpen={showUpgradeModal}
          onClose={() => { window.location.href = '/dashboard' }}
          title="Qwikker Loyalty"
          description="Create a digital loyalty program to build repeat customers and increase revenue."
          type="info"
          size="md"
          actions={[
            {
              label: 'Upgrade to Spotlight',
              onClick: () => { window.location.href = '/dashboard/settings' },
              variant: 'default',
              className: 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold',
            },
          ]}
        >
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
              <h4 className="font-medium text-emerald-400 mb-3 text-sm">What you get with Spotlight</h4>
              <div className="space-y-2 text-sm text-zinc-400">
                {[
                  'Custom branded loyalty cards in Apple & Google Wallet',
                  'QR-based earn system -- zero hardware needed',
                  'Push notifications to loyalty members',
                  'Real-time member analytics and stats',
                  'Tap-to-redeem rewards -- no staff app required',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-emerald-500 rounded-full flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ElegantModal>
      </div>
    )
  }

  const status = program?.status || 'none'

  // No program or draft -- show the setup form
  if (status === 'none' || status === 'draft') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Qwikker Loyalty</h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Set up your loyalty program in a few minutes. Your customers will love it.
          </p>
        </div>
        <LoyaltySpecsForm
          profile={profile}
          existingProgram={program}
          onProgramUpdate={setProgram}
        />
      </div>
    )
  }

  const cardDisclaimer = 'This is how your card appears to users in the Qwikker app. Your Apple/Google Wallet pass design may differ slightly.'

  // Submitted -- show under review state
  if (status === 'submitted') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Qwikker Loyalty</h1>
          <p className="text-zinc-400 mt-1 text-sm">Your loyalty card is being set up.</p>
        </div>
        {program && (
          <LoyaltyCardPreview
            {...toLoyaltyCardPreviewProps({ ...program, business_name: profile?.business_name })}
            disclaimer={cardDisclaimer}
          />
        )}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-white font-medium">Specs submitted</p>
                  <p className="text-zinc-500">Your loyalty card details have been received</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10">
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                </div>
                <div>
                  <p className="text-white font-medium">Building your card</p>
                  <p className="text-zinc-500">Our team is creating your Apple & Google Wallet loyalty card</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800">
                  <Clock className="w-4 h-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-zinc-400 font-medium">Going live</p>
                  <p className="text-zinc-600">Usually within 24 hours</p>
                </div>
              </div>
            </div>
            <div className="mt-8 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
              <p className="text-sm text-zinc-400">
                While you wait, you can update your business profile, create offers, or explore other Qwikker features.
              </p>
              <div className="flex gap-3 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Paused -- show paused state with resume option
  if (status === 'paused') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Qwikker Loyalty</h1>
          <p className="text-zinc-400 mt-1 text-sm">Your loyalty program is currently paused.</p>
        </div>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 flex-shrink-0">
                <Pause className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">Program Paused</h3>
                <p className="text-zinc-400 text-sm mt-1">
                  Your customers can&apos;t earn or redeem while paused. Existing memberships are preserved.
                </p>
                <Button
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/loyalty/program/resume', { method: 'POST' })
                      if (res.ok) {
                        setProgram((prev) => prev ? { ...prev, status: 'active' } : prev)
                      }
                    } catch {}
                  }}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Resume Program
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {program && (
          <>
            <LoyaltyCardPreview
              {...toLoyaltyCardPreviewProps({ ...program, business_name: profile?.business_name })}
              disclaimer={cardDisclaimer}
            />
            <LoyaltyStatsDashboard program={program} profile={profile} />
          </>
        )}
      </div>
    )
  }

  // Active -- show full dashboard
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Qwikker Loyalty</h1>
        <p className="text-zinc-400 mt-1 text-sm">
          {program?.program_name || 'Your loyalty program'} is live.
        </p>
      </div>
      {program && (
        <>
          {/* Card preview + program info: stacked on mobile, side-by-side on desktop */}
          <div className="flex flex-col md:flex-row gap-5 items-start">
            <LoyaltyCardPreview
              {...toLoyaltyCardPreviewProps({ ...program, business_name: profile?.business_name })}
              className="md:mx-0 md:shrink-0"
            />
            <div className="w-full md:flex-1 md:min-w-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-3">
                  <p className="text-zinc-500 text-[11px] uppercase tracking-wide mb-1">Reward</p>
                  <p className="text-white text-sm font-semibold truncate">{program.reward_description}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-3">
                  <p className="text-zinc-500 text-[11px] uppercase tracking-wide mb-1">Threshold</p>
                  <p className="text-white text-lg font-semibold">{program.reward_threshold} <span className="text-sm font-normal text-zinc-400">{program.stamp_label?.toLowerCase()}</span></p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-3">
                  <p className="text-zinc-500 text-[11px] uppercase tracking-wide mb-1">Type</p>
                  <p className="text-white text-lg font-semibold capitalize">{program.type}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-3">
                  <p className="text-zinc-500 text-[11px] uppercase tracking-wide mb-1">Earn Mode</p>
                  <p className="text-white text-sm font-semibold capitalize">{program.earn_mode?.replace('_', ' ') || 'QR Scan'}</p>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                {cardDisclaimer}
              </p>
            </div>
          </div>

          <LoyaltyStatsDashboard
            program={program}
            profile={profile}
            onProgramUpdate={setProgram}
          />
        </>
      )}
    </div>
  )
}
