'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
  const planName = plan === 'starter' ? 'Free Trial' : plan.charAt(0).toUpperCase() + plan.slice(1)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Account Settings</h1>
        <p className="text-gray-400 mt-1">Manage your subscription and account preferences.</p>
      </div>

      {/* Current Plan Card */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Current Plan: {planName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {plan === 'starter' && (
            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-orange-300">Trial expires in:</p>
                <p className="text-3xl font-bold text-orange-300">{trialDaysLeft} days</p>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-[#00d083]/10 to-[#00b86f]/10 border border-[#00d083]/30 rounded-lg p-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-6 h-6 text-[#00d083]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <h3 className="text-xl font-bold text-[#00d083]">Upgrade Plan</h3>
              </div>
              
              <p className="text-gray-300">Unlock all premium features:</p>
              
              <div className="grid md:grid-cols-2 gap-3 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[#00d083]">✓</span>
                  <span className="text-sm">Advanced analytics and insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#00d083]">✓</span>
                  <span className="text-sm">Custom loyalty card programs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#00d083]">✓</span>
                  <span className="text-sm">Push notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#00d083]">✓</span>
                  <span className="text-sm">Unlimited offers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#00d083]">✓</span>
                  <span className="text-sm">Priority support</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#00d083]">✓</span>
                  <span className="text-sm">Advanced file management</span>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-2">£29.99/month</p>
                <Button className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white px-8">
                  Upgrade Now
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
