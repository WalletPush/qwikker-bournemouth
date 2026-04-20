'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Mail, CheckCircle2, Sparkles } from 'lucide-react'

interface PendingApprovalProps {
  businessName: string
  email: string
  franchiseCity: string // e.g. "Bournemouth", "Calgary"
  supportEmail: string  // e.g. "bournemouth@qwikker.com"
}

export function PendingApproval({ 
  businessName, 
  email, 
  franchiseCity,
  supportEmail 
}: PendingApprovalProps) {
  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-[#00d083]/10 border border-[#00d083]/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-[#00d083]" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-white">Claim Submitted!</h1>
        <p className="text-neutral-400">
          We&apos;re reviewing your claim for <strong className="text-white">{businessName}</strong>
        </p>
      </div>

      <div className="relative">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-[#00d083]/20 via-white/[0.06] to-transparent" />
        <Card className="relative bg-[#111315]/80 backdrop-blur-xl border-0 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-white">
                  <Clock className="w-5 h-5 text-[#00d083]" />
                  What Happens Next
                </h2>
                <p className="text-sm text-neutral-500">
                  Your claim is under review by the {franchiseCity} team
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    num: 1,
                    active: true,
                    title: 'Review (24-48 hours)',
                    desc: `The ${franchiseCity} team will verify ownership of ${businessName} by checking your email, website, and business details.`
                  },
                  {
                    num: 2,
                    active: false,
                    title: 'Approval Notification',
                    desc: `You'll receive an email at ${email} when your claim is approved.`
                  },
                  {
                    num: 3,
                    active: false,
                    title: 'Dashboard Access',
                    desc: 'Once approved, you can log in to update your profile and manage your listing.'
                  }
                ].map((step) => (
                  <div key={step.num} className="flex gap-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step.active
                        ? 'bg-[#00d083]/10 text-[#00d083] border border-[#00d083]/20'
                        : 'bg-white/[0.04] text-neutral-500 border border-white/[0.06]'
                    }`}>
                      {step.num}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="font-medium mb-1 text-neutral-200">{step.title}</h3>
                      <p className="text-sm text-neutral-500">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.06] pt-6">
                <div className="flex items-start gap-3 text-sm">
                  <Mail className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-neutral-500 mb-1">Confirmation email sent to:</p>
                    <p className="font-medium text-white">{email}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-6 text-center">
                <p className="text-sm text-neutral-500 mb-3">Questions about your claim?</p>
                <a 
                  href={`mailto:${supportEmail}?subject=Claim Question - ${businessName}`}
                  className="inline-flex items-center px-5 py-2.5 border border-white/[0.1] hover:border-white/[0.2] text-neutral-300 hover:text-white rounded-xl font-medium transition-all hover:bg-white/[0.04] text-sm"
                >
                  Email {franchiseCity} Team
                </a>
                <p className="text-xs text-neutral-600 mt-2">{supportEmail}</p>
              </div>

              <div className="border-t border-white/[0.06] pt-6 text-center space-y-3">
                <a 
                  href="/"
                  className="inline-flex items-center justify-center h-12 px-8 bg-[#00d083] hover:bg-[#00b86f] text-[#0a0a0a] rounded-xl font-semibold transition-all hover:shadow-[0_0_20px_rgba(0,208,131,0.3)] active:scale-[0.98]"
                >
                  All Done — We&apos;ll Be in Touch!
                </a>
                <p className="text-xs text-neutral-600">
                  You&apos;ll be able to sign in once your claim is approved
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-sm text-neutral-600">
        <p>
          Most claims are reviewed within 24 hours during business hours 
          (Monday-Friday, 9am-5pm {franchiseCity} time)
        </p>
      </div>
    </div>
  )
}

