'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getReferralStats } from '@/lib/actions/referral-actions'
import { submitBusinessForReview } from '@/lib/actions/business-actions'
import { getPendingChanges } from '@/lib/actions/pending-changes'
import { SuccessModal, ErrorModal } from '@/components/ui/success-modal'

interface DashboardHomeProps {
  profile?: {
    created_at: string
    user_id: string
    plan: string
    is_founder: boolean
    [key: string]: any
  }
}

export function DashboardHome({ profile }: DashboardHomeProps) {
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0)
  // Modal states
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    buttonText?: string
    onButtonClick?: () => void
  }>({
    isOpen: false,
    title: '',
    message: ''
  })
  
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean
    title: string
    message: string
  }>({
    isOpen: false,
    title: '',
    message: ''
  })
  
  const [showModal, setShowModal] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<any[]>([])
  const [loadingPendingChanges, setLoadingPendingChanges] = useState(false)
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
      
      // Trial is 90 days, so countdown from 90
      const daysLeft = Math.max(0, 90 - daysSinceSignup)
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

  // Load pending changes for approved businesses
  useEffect(() => {
    if (profile?.user_id && profile?.status === 'approved') {
      setLoadingPendingChanges(true)
      getPendingChanges(profile.user_id).then((result) => {
        if (result.success) {
          setPendingChanges(result.pendingChanges)
        }
        setLoadingPendingChanges(false)
      })
    }
  }, [profile?.user_id, profile?.status])

  const handleSubmitForReview = async () => {
    console.log('handleSubmitForReview called', { 
      hasUserId: !!profile?.user_id, 
      isSubmitting, 
      userId: profile?.user_id,
      status: profile?.status
    })
    
    if (!profile?.user_id) {
      console.error('NO USER ID!')
      alert('Error: No user ID found!')
      return
    }
    
    if (isSubmitting) {
      console.log('Already submitting, ignoring click')
      return
    }
    
    console.log('Setting isSubmitting to true...')
    setIsSubmitting(true)
    
    try {
      console.log('Calling submitBusinessForReview...')
      const result = await submitBusinessForReview(profile.user_id)
      console.log('Submission result:', result)
      
      if (result.success) {
        console.log('SUCCESS! Showing success modal...')
        
        // Show beautiful success modal
        setSuccessModal({
          isOpen: true,
          title: 'Successfully Submitted!',
          message: 'Your business listing is now being reviewed by our team.\n\nYou\'ll receive an email notification once it\'s approved and live on Qwikker!',
          buttonText: 'Continue',
          onButtonClick: () => {
            setSuccessModal({ isOpen: false, title: '', message: '' })
            // Use a slight delay to avoid React lifecycle conflicts
            setTimeout(() => {
              window.location.href = window.location.href
            }, 100)
          }
        })
        
        console.log('Business should now be in admin "Pending Reviews" with status: pending_review')
      } else {
        console.error('Submission failed:', result.error)
        setErrorModal({
          isOpen: true,
          title: 'Submission Failed',
          message: result.error || 'Unknown error occurred. Please try again.'
        })
      }
    } catch (error) {
      console.error('Submit error:', error)
      setErrorModal({
        isOpen: true,
        title: 'Submission Failed',
        message: 'Failed to submit for review. Please try again.'
      })
    } finally {
      console.log('Submission finished, setting isSubmitting to false')
      setIsSubmitting(false)
    }
  }

  // Check for missing items required for USER dashboard listing
  const requiredTodos = []
  const optionalTodos = []
  
  // REQUIRED - Critical fields that MUST be completed for user dashboard listing
  if (!profile?.business_name) {
    requiredTodos.push({ 
      title: 'Add your business name', 
      href: '/dashboard/business',
      priority: 'REQUIRED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    })
  }

  if (!profile?.business_hours && !profile?.business_hours_structured) {
    requiredTodos.push({ 
      title: 'Add your business hours', 
      href: '/dashboard/business',
      priority: 'REQUIRED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    })
  }

  if (!profile?.business_description) {
    requiredTodos.push({ 
      title: 'Add your business description', 
      href: '/dashboard/business',
      priority: 'REQUIRED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      )
    })
  }

  if (!profile?.business_tagline) {
    requiredTodos.push({ 
      title: 'Add your business tagline', 
      href: '/dashboard/business',
      priority: 'REQUIRED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      )
    })
  }

  if (!profile?.business_address || !profile?.business_town) {
    requiredTodos.push({ 
      title: 'Complete your business address', 
      href: '/dashboard/business',
      priority: 'REQUIRED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    })
  }

  if (!profile?.display_category) {
    requiredTodos.push({ 
      title: 'Select your business category', 
      href: '/dashboard/business',
      priority: 'REQUIRED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    })
  }

  if (!profile?.logo) {
    requiredTodos.push({ 
      title: 'Upload your business logo', 
      href: '/dashboard/files#logo',
      priority: 'REQUIRED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    })
  }

  // Check for business images (required for hero image on user dashboard)
  if (!profile?.business_images || (Array.isArray(profile.business_images) && profile.business_images.length === 0)) {
    requiredTodos.push({ 
      title: 'Upload business photo', 
      href: '/dashboard/files#business-images',
      priority: 'REQUIRED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    })
  }

  // Services/Menu info is recommended - not all business types need traditional menus
  if (!profile?.menu_url) {
    optionalTodos.push({ 
      title: 'Upload full menu/service list (PDF)', 
      href: '/dashboard/files#menu',
      priority: 'RECOMMENDED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    })
  }

  // Featured services/items are recommended - helps with customer attraction
  if (!profile?.menu_preview || (Array.isArray(profile.menu_preview) && profile.menu_preview.length === 0)) {
    optionalTodos.push({ 
      title: 'Add featured services/items (top 3-5)', 
      href: '/dashboard/business',
      priority: 'RECOMMENDED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    })
  }
  
  // RECOMMENDED - Nice to have but not required for user dashboard listing

  if (!profile?.offer_name) {
    optionalTodos.push({ 
      title: 'Create your first exclusive offer', 
      href: '/dashboard/offers',
      priority: 'RECOMMENDED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    })
  }

  // Check for secret menu items (optional)
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
    optionalTodos.push({ 
      title: 'Add a secret menu item', 
      href: '/dashboard/secret-menu',
      priority: 'RECOMMENDED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    })
  }
  
  
  if (!profile?.instagram_handle) {
    optionalTodos.push({ 
      title: 'Add your Instagram handle', 
      href: '/dashboard/business',
      priority: 'RECOMMENDED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    })
  }
  
  if (!profile?.website_url) {
    optionalTodos.push({ 
      title: 'Add your website URL', 
      href: '/dashboard/business',
      priority: 'RECOMMENDED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
        </svg>
      )
    })
  }
  
  if (!profile?.facebook_url) {
    optionalTodos.push({ 
      title: 'Add your Facebook page', 
      href: '/dashboard/business',
      priority: 'RECOMMENDED',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    })
  }
  
  // Removed additional_notes - not required for user dashboard listing
  
  // Combine all todos in priority order (required items first)
  const todoItems = [...requiredTodos, ...optionalTodos]

  // Calculate profile completion percentage based on REQUIRED fields only
  // Required fields: business_name, business_hours/business_hours_structured, business_description, business_tagline, business_address+business_town, business_category, logo, business_images
  const totalRequiredFields = 8
  const completedRequiredFields = totalRequiredFields - requiredTodos.length
  const completionPercentage = Math.round((completedRequiredFields / totalRequiredFields) * 100)
  
  // Check if profile is ready for review (all REQUIRED items completed)
  const isReadyForReview = requiredTodos.length === 0
  const currentStatus = profile?.status || 'incomplete'

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
      <div className="text-center mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">Dashboard</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Welcome back! Here's your business overview.
        </p>
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

        {/* Business Status Card - Changes based on approval status */}
        {currentStatus === 'approved' ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Business Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-sm text-green-300">Live on Qwikker!</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {businessName} • {profile?.business_type || 'Business'} • {profile?.business_town || 'Location'}
                  </p>
                </div>

                {/* Pending Changes Section */}
                {loadingPendingChanges ? (
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-sm text-gray-400">Loading pending changes...</p>
                  </div>
                ) : pendingChanges.length > 0 ? (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-200 mb-2">
                      ⏳ Pending approval: {pendingChanges.length} update{pendingChanges.length !== 1 ? 's' : ''}
                    </p>
                    <div className="text-xs text-yellow-300">
                      {pendingChanges.slice(0, 2).map((change, index) => (
                        <div key={change.id}>
                          • {change.change_type === 'offer' && 'New Offer'}
                          {change.change_type === 'secret_menu' && 'Secret Menu Item'}
                          {change.change_type === 'business_images' && 'Business Photos'}
                          {change.change_type === 'business_info' && 'Business Info Update'}
                        </div>
                      ))}
                      {pendingChanges.length > 2 && (
                        <div>• +{pendingChanges.length - 2} more...</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-200">
                      Your business is approved and live! Keep your listing fresh with updates.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button asChild size="sm" variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-700">
                    <Link href="/dashboard/offers">Add Offer</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-700">
                    <Link href="/dashboard/secret-menu">Secret Menu</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-700">
                    <Link href="/dashboard/files">Upload Photos</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-700">
                    <Link href="/dashboard/business">Update Info</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Profile Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Progress</span>
                    <span className="text-sm font-semibold text-[#00d083]">{completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-[#00d083] to-[#00b86f] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      currentStatus === 'approved' ? 'bg-green-400' :
                      currentStatus === 'pending_review' ? 'bg-yellow-400' :
                      currentStatus === 'rejected' ? 'bg-red-400' :
                      'bg-gray-400'
                    }`}></div>
                    <span className="text-sm text-gray-300">
                      {currentStatus === 'approved' ? 'Live on Qwikker!' :
                       currentStatus === 'pending_review' ? 'Under Review' :
                       currentStatus === 'rejected' ? 'Needs Changes' :
                       'Profile Incomplete'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {businessName} • {profile?.business_type || 'Business'} • {profile?.business_town || 'Location'}
                  </p>
                  {/* DEBUG INFO */}
                <p className="text-xs text-red-400">
                  DEBUG: Status={currentStatus}, Ready={isReadyForReview ? 'YES' : 'NO'}, RequiredItems={requiredTodos.length}, RecommendedItems={optionalTodos.length}
                  <br />Profile Status: {profile?.status} | User ID: {profile?.user_id?.slice(-8)}
                </p>
                </div>
                
                {requiredTodos.length === 0 && currentStatus === 'incomplete' ? (
                  <Button 
                    onClick={(e) => {
                      e.preventDefault()
                      console.log('BUTTON CLICKED!', { 
                        isSubmitting, 
                        userId: profile?.user_id,
                        status: profile?.status,
                        requiredTodos: requiredTodos.length
                      })
                      handleSubmitForReview()
                    }}
                    disabled={isSubmitting}
                    className={`w-full transition-all duration-200 ${
                      isSubmitting 
                        ? 'bg-gray-600 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c]'
                    } text-white`}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="w-full border-slate-600 text-gray-300 hover:bg-slate-700">
                    <Link href="/dashboard/business">Complete Profile</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}


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
                        item.priority === 'REQUIRED' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-green-500 text-white'
                      }`}>
                        {item.priority === 'REQUIRED' ? 'REQ' : 'REC'}
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
                  {currentStatus === 'approved' ? 'You\'re Live!' : 'Profile Complete!'}
                </h3>
                <p className="text-gray-400">
                  {currentStatus === 'approved' 
                    ? 'Your business is live on Qwikker and customers can discover you!'
                    : isReadyForReview 
                    ? 'Your profile is ready! Submit for review to go live on Qwikker.'
                    : 'All action items complete. Your profile is optimized and ready for review.'
                  }
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
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
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

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
        buttonText={successModal.buttonText}
        onButtonClick={successModal.onButtonClick}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
      />
    </div>
  )
}