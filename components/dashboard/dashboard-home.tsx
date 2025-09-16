'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getReferralStats } from '@/lib/actions/referral-actions'

interface DashboardHomeProps {
  profile?: any
}

export function DashboardHome({ profile }: DashboardHomeProps) {
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0)
  const [showModal, setShowModal] = useState<string | null>(null)
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    successfulReferrals: 0,
    totalEarnings: 0
  })

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

  // Load referral stats
  useEffect(() => {
    const loadReferralStats = async () => {
      if (profile?.user_id) {
        try {
          const result = await getReferralStats(profile.user_id)
          if (result.success && result.data) {
            setReferralStats(result.data)
          }
        } catch (error) {
          console.error('Failed to load referral stats:', error)
        }
      }
    }

    loadReferralStats()
  }, [profile?.user_id])

  // Check for missing items from onboarding form - organized by priority
  const highPriorityTodos = []
  const mediumPriorityTodos = []
  const lowPriorityTodos = []
  
  // HIGH PRIORITY - Critical for QWIKKER database and AI responses
  if (!profile?.logo) {
    highPriorityTodos.push({ 
      title: 'Upload your business logo', 
      href: '/dashboard/files',
      priority: 'HIGH',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    })
  }
  
        // Check for menu/service list upload (critical for AI responses)
        if (!profile?.menu_url) {
          highPriorityTodos.push({ 
            title: 'Upload your menu or service price list', 
            href: '/dashboard/files',
            priority: 'HIGH',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )
          })
        }
  
  // MEDIUM PRIORITY - Important for customer engagement
  if (!profile?.offer_name) {
    mediumPriorityTodos.push({ 
      title: 'Create your first exclusive offer', 
      href: '/dashboard/offers',
      priority: 'MEDIUM',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    })
  }

  // Check for secret menu items
  const hasSecretMenuItems = profile?.additional_notes ? 
    (() => {
      try {
        const notesData = JSON.parse(profile.additional_notes)
        return notesData.secret_menu_items && notesData.secret_menu_items.length > 0
      } catch {
        return false
      }
    })() : false

  if (!hasSecretMenuItems) {
    mediumPriorityTodos.push({ 
      title: 'Add a secret menu item', 
      href: '/dashboard/secret-menu',
      priority: 'MEDIUM',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    })
  }
  
  
  if (!profile?.instagram_handle) {
    mediumPriorityTodos.push({ 
      title: 'Add your Instagram handle', 
      href: '/dashboard/business',
      priority: 'MEDIUM',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    })
  }
  
  // LOW PRIORITY - Nice to have but not critical
  if (!profile?.website_url) {
    lowPriorityTodos.push({ 
      title: 'Add your website URL', 
      href: '/dashboard/business',
      priority: 'LOW',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
        </svg>
      )
    })
  }
  
  if (!profile?.facebook_url) {
    lowPriorityTodos.push({ 
      title: 'Add your Facebook page', 
      href: '/dashboard/business',
      priority: 'LOW',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    })
  }
  
  if (!profile?.phone) {
    lowPriorityTodos.push({ 
      title: 'Add your phone number', 
      href: '/dashboard/personal',
      priority: 'LOW',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    })
  }
  
  if (!profile?.business_category) {
    lowPriorityTodos.push({ 
      title: 'Complete your business category', 
      href: '/dashboard/business',
      priority: 'LOW',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    })
  }
  
  if (!profile?.goals) {
    lowPriorityTodos.push({ 
      title: 'Set your business goals', 
      href: '/dashboard/business',
      priority: 'LOW',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    })
  }
  
  if (!profile?.additional_notes) {
    lowPriorityTodos.push({ 
      title: 'Add additional notes about your business', 
      href: '/dashboard/business',
      priority: 'LOW',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    })
  }
  
  // Combine all todos in priority order
  const todoItems = [...highPriorityTodos, ...mediumPriorityTodos, ...lowPriorityTodos]

  const businessName = profile?.business_name || 'Your Business'

  const modalContent = {
    analytics: {
      title: '📊 Analytics (Spotlight)',
      description: 'Unlock deep performance insights across Qwikker:',
      features: [
        'Search visibility: how many times you appeared in results, top queries & "near me" impressions',
        'Offer performance: total views, claims, redemptions, and conversion rate',
        'Audience breakdown: new vs returning users, locations, device types',
        'Trends & comparisons: day/week/month charts and offer-to-offer comparisons',
        'Export & QR tracking: download CSVs; track scans from in-venue QR stands'
      ],
      disclaimer: 'Available on Spotlight. Data is anonymized & privacy-friendly.'
    },
    notifications: {
      title: '📣 Push Notifications (Spotlight)',
      description: 'Reach customers instantly with in-app push:',
      features: [
        'Announce offers & secret items the moment they go live',
        'Targeting: all followers, nearby users, or loyalty members only',
        'Scheduling: send now or pick a time',
        'Performance: deliveries, opens, clicks, and redemptions tracked in analytics',
        'Fair-use limits to keep the feed high-quality (burst limits apply)'
      ],
      disclaimer: 'Available on Spotlight. Users can opt in/out at any time.'
    },
    loyalty: {
      title: '🪪 Loyalty Cards (Spotlight)',
      description: 'Build repeat visits with a white-label loyalty system:',
      features: [
        'Program types: stamp cards, points, tiers, or perks',
        'Smart rewards: auto-unlock free items, upsells, birthday treats',
        'Member engagement: send push to loyalty members only',
        'Insights: visits, redemptions, breakage, most-loved rewards',
        'Easy setup: branded card, QR code for staff, works with your offers'
      ],
      disclaimer: 'Available on Spotlight. Fully branded to your business.'
    }
  }
  const plan = profile?.plan || 'starter'
  const isFreeTrial = plan === 'featured' && trialDaysLeft > 0
  const planName = isFreeTrial ? 'Featured (Free Trial)' : 
                  plan === 'starter' ? 'Starter' : 
                  plan.charAt(0).toUpperCase() + plan.slice(1)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back! Here's your business overview.</p>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Trial Status Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-[#00d083]">{planName}</p>
                <p className="text-sm text-gray-400">
                  {isFreeTrial ? `${trialDaysLeft} days remaining` : 'Active subscription'}
                </p>
              </div>
              
              {isFreeTrial && (
                <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-orange-300 font-medium">
                      Trial expires in {trialDaysLeft} days
                    </p>
                  </div>
                </div>
              )}
              
              <Button asChild className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white">
                <Link href="/dashboard/settings">
                  {isFreeTrial ? 'Upgrade Plan' : 'Manage Plan'}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Business Profile Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Business Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-white">{businessName}</p>
                <p className="text-sm text-gray-400">{profile?.business_type || 'Business Type'}</p>
                <p className="text-sm text-gray-400">{profile?.town || 'Location'}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#00d083] rounded-full animate-pulse"></div>
                <span className="text-sm text-[#00d083]">Online & Active</span>
              </div>
              
              <Button asChild variant="outline" className="w-full border-slate-600 text-gray-300 hover:bg-slate-700">
                <Link href="/dashboard/business">Edit Profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* To-Do Notifications Card */}
        {todoItems.length > 0 ? (
          <Card className="bg-slate-800/50 border-slate-700 h-80 flex flex-col overflow-hidden">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Action Items
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{todoItems.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden">
              <div className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden">
                {todoItems.slice(0, 3).map((item, index) => (
                  <div key={index} className="relative flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg min-w-0">
                    {/* Priority tag positioned better */}
                    <div className="flex-shrink-0 relative">
                      <span className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                        item.priority === 'HIGH' 
                          ? 'bg-red-500 text-white' 
                          : item.priority === 'MEDIUM'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-green-500 text-black'
                      }`}>
                        {item.priority === 'HIGH' ? 'HIGH' : item.priority === 'MEDIUM' ? 'MED' : 'LOW'}
                      </span>
                    </div>
                    <div className="text-[#00d083] flex-shrink-0 mt-0.5">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="border-[#00d083] text-[#00d083] hover:bg-[#00d083] hover:text-black flex-shrink-0">
                      <Link href={item.href}>Fix</Link>
                    </Button>
                  </div>
                ))}
              </div>
              {todoItems.length > 3 && (
                <div className="mt-4 pt-3 border-t border-slate-700 flex-shrink-0">
                  <Button asChild variant="outline" className="w-full border-slate-600 text-gray-300 hover:bg-slate-700">
                    <Link href="/dashboard/action-items">
                      View {todoItems.length - 3} more action items
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700 h-80 flex flex-col">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                All Up to Date
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Great job!
                </h3>
                <p className="text-gray-400">
                  You've completed all your action items. Your QWIKKER profile is fully optimized for AI recommendations.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics Card (Locked) */}
        <Card className="bg-slate-800/50 border-slate-700 relative overflow-hidden">
          <CardHeader className="relative z-30">
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics Overview
              </div>
              <button 
                onClick={() => setShowModal('analytics')}
                className="p-1 hover:bg-slate-700 rounded-full transition-colors" 
                title="See who's finding you, who's claiming your offers, and how often you appear in search."
              >
                <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="blur-[8px] select-none pointer-events-none">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-[#00d083]">2,547</p>
                <p className="text-xs text-gray-400">Monthly Views</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[#00d083]">124</p>
                <p className="text-xs text-gray-400">AI Recommendations</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[#00d083]">89</p>
                <p className="text-xs text-gray-400">Customers</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[#00d083]">£1,234</p>
                <p className="text-xs text-gray-400">Revenue</p>
              </div>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="font-semibold text-white mb-2">Unlock Analytics</p>
              <Button asChild size="sm" className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white">
                <Link href="/dashboard/settings">Upgrade Plan</Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* Push Notifications Card (Locked) */}
        <Card className="bg-slate-800/50 border-slate-700 relative overflow-hidden">
          <CardHeader className="relative z-30">
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 12a8 8 0 1116 0c0 3-2 5-2 5H6s-2-2-2-5zM9 21h6" />
                </svg>
                Push Notifications
              </div>
              <button 
                onClick={() => setShowModal('notifications')}
                className="p-1 hover:bg-slate-700 rounded-full transition-colors" 
                title="Send targeted push notifications when you publish new offers or secret menu items."
              >
                <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="blur-[8px] select-none pointer-events-none">
            <div className="space-y-3">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="font-medium text-white">New Customer Alert</p>
                <p className="text-sm text-gray-300 mt-1">Sarah just ordered your Daily Special! Send a personalized thank you message?</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="font-medium text-white">Loyalty Milestone</p>
                <p className="text-sm text-gray-300 mt-1">Mike reached 10 visits! Time to send a reward notification.</p>
              </div>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="font-semibold text-white mb-2">Unlock Push Notifications</p>
              <Button asChild size="sm" className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white">
                <Link href="/dashboard/settings">Upgrade Plan</Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* Loyalty Cards Preview (Locked) */}
        <Card className="bg-slate-800/50 border-slate-700 relative overflow-hidden">
          <CardHeader className="relative z-30">
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Loyalty Card Preview
              </div>
              <button 
                onClick={() => setShowModal('loyalty')}
                className="p-1 hover:bg-slate-700 rounded-full transition-colors" 
                title="Create a digital loyalty program with stamps, points, or rewards—plus member push and analytics."
              >
                <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="blur-[8px] select-none pointer-events-none">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-lg p-4 text-white">
              <h4 className="font-bold">{businessName}</h4>
              <p className="text-sm mt-1">Collect 10 stamps, get a free coffee!</p>
              <div className="flex justify-center gap-2 mt-3">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center text-xs ${
                      i < 6 ? 'bg-white/90 text-red-500' : ''
                    }`}
                  >
                    {i < 6 ? '✓' : ''}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="font-semibold text-white mb-2">Unlock Loyalty Cards</p>
              <Button asChild size="sm" className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white">
                <Link href="/dashboard/settings">Upgrade Plan</Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* Referral Program Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Referral Program
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#00d083]">{referralStats.successfulReferrals}</p>
                  <p className="text-xs text-gray-400">Businesses Referred</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#00d083]">£{referralStats.totalEarnings.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Credits Earned</p>
                </div>
              </div>
              
              <Button asChild className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white">
                <Link href="/dashboard/referrals">Refer a Business</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Chat Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Support Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                <div className="bg-slate-600 rounded-lg p-2 text-sm text-gray-300">
                  Hi! How can we help you today?
                </div>
                <div className="bg-[#00d083] rounded-lg p-2 text-sm text-black ml-auto max-w-[80%]">
                  I need help with my dashboard
                </div>
                <div className="bg-slate-600 rounded-lg p-2 text-sm text-gray-300">
                  I'd be happy to help! Let me guide you...
                </div>
              </div>
              
              <Button asChild className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white">
                <Link href="/dashboard/support">Open Chat</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowModal(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                    showModal === 'analytics' ? "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" :
                    showModal === 'notifications' ? "M15 17h5l-5 5v-5zM4 12a8 8 0 1116 0c0 3-2 5-2 5H6s-2-2-2-5zM9 21h6" :
                    "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  } />
                </svg>
                {modalContent[showModal as keyof typeof modalContent].title}
              </h2>
              <button 
                onClick={() => setShowModal(null)}
                className="p-1 hover:bg-slate-700 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-300">{modalContent[showModal as keyof typeof modalContent].description}</p>
              <ul className="space-y-2 text-gray-300">
                {modalContent[showModal as keyof typeof modalContent].features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-[#00d083] mt-1">•</span>
                    <span><strong>{feature.split(':')[0]}:</strong> {feature.split(':').slice(1).join(':')}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-gray-400 italic">{modalContent[showModal as keyof typeof modalContent].disclaimer}</p>
              <div className="pt-4">
                <Button asChild className="bg-[#00d083] hover:bg-[#00b86f] text-black">
                  <Link href="/dashboard/settings">Upgrade to Spotlight</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}