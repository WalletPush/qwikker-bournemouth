'use client'

import { Card, CardContent } from '@/components/ui/card'

export function ReferralsComingSoon() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="bg-slate-800/50 border-slate-700 max-w-2xl w-full">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-xl mx-auto mb-6 flex items-center justify-center border border-emerald-500/30">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-white mb-4">
            Referral Program Coming Soon
          </h2>

          <p className="text-lg text-slate-300 mb-6 leading-relaxed">
            We're building something exciting! Soon you'll be able to earn Qwikker credits for referring businesses to the platform.
          </p>

          <div className="bg-slate-700/30 rounded-lg p-6 border border-slate-600/50">
            <h3 className="text-white font-semibold mb-3 flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              What's Coming
            </h3>
            <ul className="text-slate-300 space-y-2 text-left max-w-md mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>Earn Qwikker credits for every business you refer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>Track your referrals and rewards in real-time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>Share via custom referral links</span>
              </li>
            </ul>
          </div>

          <p className="text-sm text-slate-400 mt-6">
            Stay tuned for updates — we'll notify you when the referral program goes live!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
