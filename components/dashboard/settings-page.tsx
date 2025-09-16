'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PricingPlans } from './pricing-plans'

interface SettingsPageProps {
  profile?: any
}

export function SettingsPage({ profile }: SettingsPageProps) {
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0)

  useEffect(() => {
    if (profile?.created_at) {
      const createdDate = new Date(profile.created_at)
      const now = new Date()
      
      // Calculate days since signup
      const diffTime = now.getTime() - createdDate.getTime()
      const daysSinceSignup = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      // Trial is 120 days, so countdown from 120
      const daysLeft = Math.max(0, 120 - daysSinceSignup)
      setTrialDaysLeft(daysLeft)
    }
  }, [profile])

  const plan = profile?.plan || 'starter'
  const isFreeTrial = plan === 'featured' && trialDaysLeft > 0
  const planName = isFreeTrial ? 'Featured (Free Trial)' : 
                  plan === 'starter' ? 'Starter' : 
                  plan.charAt(0).toUpperCase() + plan.slice(1)

  return (
    <div className="space-y-8">
      {/* Clean Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
        <p className="text-gray-400">Manage your subscription and account preferences</p>
      </div>

      {/* Clean Current Plan Info */}
      <Card className="bg-slate-800/50 border-slate-700 max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Current Plan</h3>
          <p className="text-2xl font-bold text-[#00d083] mb-2">{planName}</p>
          {isFreeTrial && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Trial expires in {trialDaysLeft} days</p>
              {profile?.is_founder && (
                <p className="text-xs text-yellow-400">20% off available</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clean Pricing Plans */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Choose Your Plan</h2>
        <PricingPlans 
          currentPlan={plan}
          isFoundingMember={profile?.is_founder || false}
          profile={profile}
        />
      </div>

      {/* Account Actions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start border-slate-600 text-gray-300 hover:bg-slate-700">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download My Data
            </Button>
            
            <Button variant="outline" className="w-full justify-start border-red-600 text-red-400 hover:bg-red-900/20">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legal Documents */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Legal Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <a 
              href="#" 
              className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-white">Terms of Service</span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            
            <a 
              href="#" 
              className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-white">Privacy Policy</span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
