'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface LockedFeaturePageProps {
  featureName: string
  description?: string
  benefits?: string[]
  icon?: React.ReactNode
}

export function LockedFeaturePage({ 
  featureName, 
  description,
  benefits,
  icon 
}: LockedFeaturePageProps) {
  const defaultDescription = `This feature is available with our paid plans. Upgrade to unlock ${featureName.toLowerCase()}, along with AI chat visibility, analytics, and more premium features.`
  
  const defaultBenefits = [
    'AI-powered discovery',
    'Full analytics & insights',
    'Unlimited offers & events',
    'Priority support'
  ]

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md mx-auto text-center space-y-6 p-8">
        {/* Lock Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center">
            {icon || (
              <svg className="w-10 h-10 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">
            {featureName} is Locked
          </h2>
          <p className="text-slate-400 leading-relaxed">
            {description || defaultDescription}
          </p>
        </div>

        {/* Benefits List */}
        <div className="bg-slate-800/30 rounded-xl p-6 space-y-3 text-left">
          <p className="text-sm font-semibold text-slate-300 mb-3">Unlock with any paid plan:</p>
          <div className="space-y-2">
            {(benefits || defaultBenefits).map((benefit, index) => (
              <div key={index} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-slate-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <Button
            asChild
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            <Link href="/dashboard/settings#pricing">
              View Plans & Pricing
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <Link href="/dashboard">
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <p className="text-xs text-slate-500 pt-2">
          90-day free trial available on Featured tier
        </p>
      </div>
    </div>
  )
}

