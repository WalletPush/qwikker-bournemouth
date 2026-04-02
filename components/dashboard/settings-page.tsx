'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { PricingPlans } from './pricing-plans'
import { FoundingMemberBanner } from './founding-member-banner'

interface SettingsPageProps {
  profile?: any
  isInFreeTrial?: boolean
  stripeSubscriptionId?: string | null
  freeTrialEndDate?: string | null
}

export function SettingsPage({ profile, isInFreeTrial: isInFreeTrialProp = false, stripeSubscriptionId, freeTrialEndDate }: SettingsPageProps) {
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0)
  const [portalLoading, setPortalLoading] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelResult, setCancelResult] = useState<{ success: boolean; accessUntil?: string; error?: string } | null>(null)

  useEffect(() => {
    if (freeTrialEndDate) {
      const endDate = new Date(freeTrialEndDate)
      const now = new Date()
      const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      setTrialDaysLeft(daysLeft)
    } else {
      setTrialDaysLeft(0)
    }
  }, [freeTrialEndDate])

  const isPendingApproval = profile?.status === 'incomplete' || profile?.status === 'pending_review'
  const plan = profile?.status === 'claimed_free' ? 'free' : (profile?.plan || 'starter')
  const isFreeTrial = isInFreeTrialProp && trialDaysLeft > 0
  const trialPlanDisplay = plan.charAt(0).toUpperCase() + plan.slice(1)
  const planName = isPendingApproval ? 'Pending Approval' :
                  profile?.status === 'claimed_free' ? 'Free Listing' :
                  isFreeTrial ? `${trialPlanDisplay} (Free Trial)` :
                  plan === 'starter' ? 'Starter' :
                  plan.charAt(0).toUpperCase() + plan.slice(1)

  return (
    <div className="space-y-8">
      {/* Clean Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
        <p className="text-gray-400">Manage your subscription and account preferences</p>
      </div>

      {/* Current Plan Info */}
      <Card className="bg-slate-800/50 border-slate-700 max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Current Plan</h3>
          {isPendingApproval ? (
            <div className="space-y-2">
              <p className="text-2xl font-bold text-amber-400 mb-2">Pending Approval</p>
              <p className="text-sm text-gray-400">Your free trial will begin once your account is reviewed and approved. Complete your action items and submit for approval.</p>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-[#00d083] mb-2">{planName}</p>
              {isFreeTrial && (
                <p className="text-sm text-gray-400">Trial expires in {trialDaysLeft} days</p>
              )}
              <FoundingMemberBanner 
                profile={profile}
                trialDaysLeft={trialDaysLeft}
              />
              {profile?.stripe_customer_id && !isFreeTrial && (
                <Button
                  variant="outline"
                  className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-700"
                  disabled={portalLoading}
                  onClick={async () => {
                    setPortalLoading(true)
                    try {
                      const res = await fetch('/api/stripe/create-portal-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ businessId: profile.id }),
                      })
                      const data = await res.json()
                      if (data.url) window.location.href = data.url
                    } catch {
                      // silently fail
                    } finally {
                      setPortalLoading(false)
                    }
                  }}
                >
                  {portalLoading ? 'Opening...' : 'Manage Billing'}
                </Button>
              )}
            </>
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
          businessId={profile?.id}
          isInFreeTrial={isFreeTrial}
          stripeSubscriptionId={stripeSubscriptionId}
        />
      </div>

      {/* Account Actions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start border-slate-600 text-gray-300 hover:bg-slate-700"
              onClick={async () => {
                try {
                  const response = await fetch('/api/download-data', { method: 'POST' })
                  if (response.ok) {
                    const blob = await response.blob()
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `qwikker-data-export-${new Date().toISOString().split('T')[0]}.json`
                    document.body.appendChild(a)
                    a.click()
                    window.URL.revokeObjectURL(url)
                    document.body.removeChild(a)
                  } else {
                    alert('Failed to download data. Please try again.')
                  }
                } catch (error) {
                  console.error('Download error:', error)
                  alert('Failed to download data. Please try again.')
                }
              }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download My Data
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start border-slate-600 text-gray-300 hover:bg-slate-700"
              onClick={() => window.location.href = '/dashboard/profile'}
            >
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
            
            {stripeSubscriptionId && (
              <Button
                variant="outline"
                className="w-full justify-start border-red-600/50 text-red-400 hover:bg-red-900/20"
                onClick={() => { setCancelResult(null); setShowCancelDialog(true) }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Subscription Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={(open) => { if (!open) setShowCancelDialog(false) }}>
        <DialogContent className="bg-slate-900 border-slate-700/80 text-white p-0 gap-0 overflow-hidden" style={{ width: '380px', maxWidth: '380px' }}>
          {cancelResult?.success ? (
            <div className="px-6 py-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-700/60 flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-semibold text-white">Subscription cancelled</p>
                <p className="text-[13px] text-slate-400 mt-1.5 leading-relaxed">
                  You still have access until{' '}
                  <span className="text-white font-medium">
                    {cancelResult.accessUntil
                      ? new Date(cancelResult.accessUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'the end of your billing period'}
                  </span>.
                  After that, your plan will revert to Free Listing.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-slate-700 hover:bg-slate-600 text-white h-9 px-5 mt-2"
                onClick={() => { setShowCancelDialog(false); window.location.reload() }}
              >
                Got it
              </Button>
            </div>
          ) : (
            <>
              <div className="px-6 pt-6 pb-4">
                <DialogHeader className="space-y-1.5">
                  <DialogTitle className="text-[15px] font-semibold text-white">Cancel your subscription?</DialogTitle>
                  <DialogDescription className="text-[13px] text-slate-400 leading-relaxed">
                    Are you sure? Here&apos;s what happens:
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="px-6 pb-4 space-y-4">
                <div className="rounded-lg border border-slate-700/60 bg-slate-800/40">
                  <ul className="divide-y divide-slate-700/40 text-[13px]">
                    <li className="flex items-start gap-3 px-4 py-3">
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-slate-300">You keep full access until the end of your current billing period</span>
                    </li>
                    <li className="flex items-start gap-3 px-4 py-3">
                      <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-slate-300">After that, your listing reverts to the free tier</span>
                    </li>
                    <li className="flex items-start gap-3 px-4 py-3">
                      <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-slate-300">You can resubscribe at any time</span>
                    </li>
                  </ul>
                </div>

                {cancelResult?.error && (
                  <p className="text-xs text-red-400">{cancelResult.error}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/40 bg-slate-800/20">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCancelDialog(false)}
                  className="text-slate-400 hover:text-white hover:bg-slate-700/50 h-9 px-4"
                >
                  Keep my plan
                </Button>
                <Button
                  size="sm"
                  disabled={cancelLoading}
                  className="bg-red-600 hover:bg-red-700 text-white h-9 px-5 font-medium"
                  onClick={async () => {
                    setCancelLoading(true)
                    setCancelResult(null)
                    try {
                      const res = await fetch('/api/stripe/cancel-subscription', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ businessId: profile?.id }),
                      })
                      const data = await res.json()
                      if (res.ok) {
                        setCancelResult({ success: true, accessUntil: data.accessUntil })
                      } else {
                        setCancelResult({ success: false, error: data.error || 'Something went wrong.' })
                      }
                    } catch {
                      setCancelResult({ success: false, error: 'Failed to connect. Please try again.' })
                    } finally {
                      setCancelLoading(false)
                    }
                  }}
                >
                  {cancelLoading ? 'Cancelling...' : 'Cancel subscription'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
              href="/terms-of-service" 
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
              href="/privacy-policy" 
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
