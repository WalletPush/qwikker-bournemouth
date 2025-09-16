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
                <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-400 font-semibold text-sm">Founding Member Benefit</span>
                  </div>
                  <p className="text-yellow-200 text-xs leading-relaxed">
                    <strong>20% off for life</strong> on 12-month plans if you upgrade to a paid plan <strong>before your trial expires</strong>. This discount locks in your rate permanently.
                  </p>
                  <p className="text-yellow-300 text-xs mt-2 font-medium">
                    Trial ends: {new Date(new Date(profile.created_at).getTime() + (120 * 24 * 60 * 60 * 1000)).toLocaleDateString('en-GB', { 
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
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
            
            <Button variant="outline" className="w-full justify-start border-slate-600 text-gray-300 hover:bg-slate-700">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Update Profile
            </Button>
            
            <Button variant="outline" className="w-full justify-start border-slate-600 text-gray-300 hover:bg-slate-700">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Change Password
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

      {/* Notification Settings */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <span className="text-white font-medium">Email Notifications</span>
                  <p className="text-gray-400 text-sm">Receive updates about your account and offers</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00d083]"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM8 17H3l5 5v-5zM3 7h18M3 12h18" />
                </svg>
                <div>
                  <span className="text-white font-medium">Marketing Updates</span>
                  <p className="text-gray-400 text-sm">New features, tips, and QWIKKER news</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00d083]"></div>
              </label>
            </div>
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
