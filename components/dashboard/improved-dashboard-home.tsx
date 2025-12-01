'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getReferralStats } from '@/lib/actions/referral-actions'
import { submitBusinessForReview } from '@/lib/actions/business-actions'
import { getPendingChanges } from '@/lib/actions/pending-changes'
import { getBusinessVisits } from '@/lib/actions/business-visit-actions'
import { SuccessModal, ErrorModal } from '@/components/ui/success-modal'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ElegantModal } from '@/components/ui/elegant-modal'

interface ImprovedDashboardHomeProps {
  profile?: {
    created_at: string
    user_id: string
    plan: string
    status: string
    is_founder: boolean
    business_name?: string
    business_type?: string
    business_town?: string
    subscription?: {
      tier_id: string
      status: string
      is_in_free_trial: boolean
      free_trial_start_date: string | null
      free_trial_end_date: string | null
      subscription_tiers?: {
        tier_name: string
        tier_display_name: string
        features: any
      }
    } | null
    [key: string]: any
  }
}

export function ImprovedDashboardHome({ profile }: ImprovedDashboardHomeProps) {
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0)
  const [pendingChanges, setPendingChanges] = useState<any[]>([])
  const [loadingPendingChanges, setLoadingPendingChanges] = useState(false)
  const [activityFeed, setActivityFeed] = useState<any[]>([])
  const [businessVisits, setBusinessVisits] = useState<any[]>([])
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<{
    totalVisits: number
    totalClaims: number
    totalQRScans: number
  }>({ totalVisits: 0, totalClaims: 0, totalQRScans: 0 })
  const supabase = createClientComponentClient()
  
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

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch real analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!profile?.id) return
      
      try {
        const { getBusinessAnalytics } = await import('@/lib/actions/business-analytics-actions')
        const data = await getBusinessAnalytics(profile.id)
        
        setAnalyticsData({
          totalVisits: data.totalVisits,
          totalClaims: data.totalOfferClaims,
          totalQRScans: data.totalQRScans
        })
      } catch (error) {
        console.error('Error fetching analytics:', error)
      }
    }
    
    fetchAnalytics()
  }, [profile?.id])

  // Calculate trial days - USE SUBSCRIPTION DATA FIRST, fallback to legacy
  useEffect(() => {
    if (profile?.subscription?.is_in_free_trial && profile?.subscription?.free_trial_end_date) {
      // Use accurate subscription trial data
      const endDate = new Date(profile.subscription.free_trial_end_date)
      const now = new Date()
      const diffTime = endDate.getTime() - now.getTime()
      const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      setTrialDaysLeft(daysLeft)
    } else if (profile?.created_at) {
      // Fallback to legacy calculation (90 days from created_at)
      const createdDate = new Date(profile.created_at)
      const now = new Date()
      const diffTime = now.getTime() - createdDate.getTime()
      const daysSinceSignup = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const daysLeft = Math.max(0, 90 - daysSinceSignup)
      setTrialDaysLeft(daysLeft)
    }
  }, [profile])

  // Load pending changes
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
  }, [profile])

  // Load business visits
  useEffect(() => {
    if (profile?.id) {
      getBusinessVisits(profile.id, 5).then((result) => {
        if (result.success) {
          setBusinessVisits(result.visits)
        }
      })
    }
  }, [profile])

  // Generate REAL activity feed based on profile data AND business changes
  useEffect(() => {
    if (profile?.user_id) {
      const loadActivityFeed = async () => {
        const realActivity = []
        
        // 1. REAL-TIME ANALYTICS (most recent, highest priority)
        try {
          const { getBusinessActivityData } = await import('@/lib/actions/business-analytics-actions')
          const businessAnalytics = await getBusinessActivityData(profile.id)
          
          // Recent offer claims (last 7 days)
          if (businessAnalytics.recentClaims > 0) {
            realActivity.push({
              id: `recent_claims_${profile.id}`,
              type: 'offer_claimed',
              message: `${businessAnalytics.recentClaims} offer${businessAnalytics.recentClaims > 1 ? 's' : ''} claimed this week`,
              timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago for sorting
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              ),
              color: 'text-orange-400'
            })
          }
          
          // Recent business visits (last 7 days)
          if (businessAnalytics.recentVisits > 0) {
            realActivity.push({
              id: `recent_visits_${profile.id}`,
              type: 'business_visit',
              message: `${businessAnalytics.recentVisits} page visit${businessAnalytics.recentVisits > 1 ? 's' : ''} this week`,
              timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago for sorting
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              color: 'text-blue-400'
            })
          }
        } catch (error) {
          console.error('Error loading business analytics for activity feed:', error)
        }
        
        // 2. PENDING CHANGES (waiting for approval)
        try {
          const { getPendingChanges } = await import('@/lib/actions/pending-changes')
          const changesResult = await getPendingChanges(profile.user_id)
          
          if (changesResult.success && changesResult.pendingChanges.length > 0) {
            // Only show the most recent pending change
            const mostRecentChange = changesResult.pendingChanges[0]
            
            if (mostRecentChange.change_type === 'offer') {
              realActivity.push({
                id: `pending_offer_${mostRecentChange.id}`,
                type: 'offer_pending',
                message: `Offer "${mostRecentChange.change_data?.offer_name || 'New Offer'}" pending approval`,
                timestamp: new Date(mostRecentChange.submitted_at || mostRecentChange.created_at),
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                color: 'text-yellow-400'
              })
            } else if (mostRecentChange.change_type === 'profile') {
              realActivity.push({
                id: `pending_profile_${mostRecentChange.id}`,
                type: 'profile_pending',
                message: 'Profile changes pending approval',
                timestamp: new Date(mostRecentChange.submitted_at || mostRecentChange.created_at),
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                color: 'text-yellow-400'
              })
            }
          }
        } catch (error) {
          console.error('Error loading pending changes for activity feed:', error)
        }
        
        // 3. PROFILE MILESTONES (one-time events)
        
        // Listing approval (most important milestone)
        if (profile.status === 'approved' && profile.approved_at) {
          const approvalTime = new Date(profile.approved_at)
          const createdTime = new Date(profile.created_at)
          
          // Only show if approval happened after creation (valid timestamp)
          if (approvalTime > createdTime) {
            realActivity.push({
              id: 'listing_approved',
              type: 'listing_approved',
              message: `${profile.business_name || 'Business'} approved and live!`,
              timestamp: approvalTime,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              color: 'text-green-400'
            })
          }
        }
        
        // Profile joined (fallback if no other activity)
        if (profile.created_at) {
          realActivity.push({
            id: 'profile_created',
            type: 'profile_created',
            message: `${profile.business_name || 'Business'} joined Qwikker`,
            timestamp: new Date(profile.created_at),
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            ),
            color: 'text-blue-400'
          })
        }
      
        // Sort by timestamp (newest first) and take top 4
        const sortedActivity = realActivity
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 4)
        
        setActivityFeed(sortedActivity)
      }
      
      loadActivityFeed()
    }
  }, [profile, businessVisits])

  // Calculate if ready for review (no required fields missing)
  const isReadyForReview = profile?.business_name && 
    (profile?.business_hours || profile?.business_hours_structured) &&
    profile?.business_description && 
    profile?.business_tagline && 
    profile?.business_address && 
    profile?.business_town && 
    profile?.business_category && 
    profile?.logo && 
    profile?.business_images && 
    Array.isArray(profile.business_images) && 
    profile.business_images.length > 0
  const currentStatus = profile?.status || 'incomplete'
  const businessName = profile?.business_name || 'Your Business'

  // Calculate required fields count for status display
  const getRequiredFieldsCount = () => {
    let count = 0
    if (!profile?.business_name) count++
    if ((!profile?.business_hours || profile?.business_hours.trim() === '') && !profile?.business_hours_structured) count++
    if (!profile?.business_description) count++
    if (!profile?.business_tagline) count++
    if (!profile?.business_address || !profile?.business_town) count++
    if (!profile?.business_category) count++
    if (!profile?.logo) count++
    if (!profile?.business_images || (Array.isArray(profile?.business_images) && profile.business_images.length === 0)) count++
    return count
  }

  const requiredFieldsCount = getRequiredFieldsCount()


  // Status display logic - FIXED LOGIC
  const getStatusDisplay = () => {
    // If profile is complete but status is still incomplete, show "Ready to Submit"
    if (currentStatus === 'incomplete' && isReadyForReview) {
        return {
          text: 'Ready to Submit',
          subtext: 'All requirements complete - ready for review',
          color: 'text-green-400',
          bgColor: 'bg-green-500/10 border-green-500/20',
          icon: (
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
    }
    
    switch (currentStatus) {
      case 'incomplete':
        return {
          text: 'Profile Incomplete',
          subtext: `${requiredFieldsCount} required field${requiredFieldsCount !== 1 ? 's' : ''} remaining`,
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10 border-orange-500/20',
          icon: (
            <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      case 'pending_review':
        return {
          text: 'Pending Review',
          subtext: 'Your listing is being reviewed by our team',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10 border-blue-500/20',
          icon: (
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          )
        }
      case 'approved':
        return {
          text: 'Live on Qwikker!',
          subtext: 'Your business is discoverable by customers',
          color: 'text-green-400',
          bgColor: 'bg-green-500/10 border-green-500/20',
          icon: (
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )
        }
      default:
        return {
          text: 'Ready to Submit',
          subtext: 'All requirements complete',
          color: 'text-green-400',
          bgColor: 'bg-green-500/10 border-green-500/20',
          icon: (
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
    }
  }

  const statusDisplay = getStatusDisplay()
  
  // Get plan name from subscription first, fallback to profile
  const getTierInfo = () => {
    if (profile?.subscription?.subscription_tiers) {
      return {
        name: profile.subscription.subscription_tiers.tier_display_name,
        isFreeTrial: profile.subscription.is_in_free_trial
      }
    }
    // Fallback to legacy profile.plan
    const plan = profile?.plan || 'starter'
    const isFreeTrial = plan === 'featured' && trialDaysLeft > 0
    const planName = plan === 'starter' ? 'Starter' : 
                    plan.charAt(0).toUpperCase() + plan.slice(1)
    return { name: planName, isFreeTrial }
  }
  
  const { name: planName, isFreeTrial } = getTierInfo()
  const displayPlanName = isFreeTrial ? `${planName} (Free Trial)` : planName

  // Check if premium features are unlocked (ONLY Spotlight gets them)
  const isPremiumFeatureUnlocked = () => {
    const tierName = profile?.subscription?.subscription_tiers?.tier_name
    // ONLY Spotlight tier unlocks premium features
    if (tierName === 'spotlight') return true
    // Fallback: check legacy plan field
    if (profile?.plan === 'spotlight' || profile?.plan === 'pro') return true
    return false
  }

  // Check if a specific feature is unlocked (for individual feature cards)
  const isFeatureUnlocked = (featureKey: string) => {
    // FIRST: Check individual feature override
    if (profile?.features && typeof profile.features[featureKey] === 'boolean') {
      return profile.features[featureKey]
    }
    // SECOND: Check tier-based access
    return isPremiumFeatureUnlocked()
  }

  const handleSubmitForReview = async () => {
    console.log('🚀 DASHBOARD: handleSubmitForReview called', { 
      hasUserId: !!profile?.user_id, 
      isSubmitting, 
      userId: profile?.user_id,
      currentStatus: profile?.status,
      businessName: profile?.business_name,
      requiredTodosCount: requiredFieldsCount,
      isReadyForReview
    })
    
    // 🚨 CONFIRMATION: Ask user to confirm before submitting
    const confirmed = window.confirm(
      '⚠️ Ready to submit your listing for review?\n\n' +
      'Once submitted, you won\'t be able to make changes until after the review is complete.\n\n' +
      '💡 Tip: Click "Preview listing" first to see how customers will see your profile.\n\n' +
      'Submit now?'
    )
    
    if (!confirmed) {
      console.log('🚫 DASHBOARD: User cancelled submission')
      return
    }
    
    if (!profile?.user_id || isSubmitting) {
      console.log('❌ DASHBOARD: Early return - no userId or already submitting')
      return
    }
    
    console.log('⏳ DASHBOARD: Setting isSubmitting to true...')
    setIsSubmitting(true)
    
    try {
      console.log('📤 DASHBOARD: Calling submitBusinessForReview with userId:', profile.user_id)
      const result = await submitBusinessForReview(profile.user_id)
      console.log('📥 DASHBOARD: Submission result:', result)
      
      if (result.success) {
        console.log('✅ DASHBOARD: SUCCESS! Business should now be pending_review')
        console.log('🔍 DASHBOARD: Check admin dashboard for business:', {
          userId: profile.user_id,
          businessName: profile.business_name,
          email: profile.email
        })
        
        setSuccessModal({
          isOpen: true,
          title: 'Successfully Submitted!',
          message: 'Your business listing is now being reviewed by our team.\n\nYou\'ll receive an email notification once it\'s approved and live on Qwikker!',
          buttonText: 'Continue',
          onButtonClick: () => {
            setSuccessModal({ isOpen: false, title: '', message: '' })
            console.log('🔄 DASHBOARD: Reloading page to show new status')
            window.location.reload()
          }
        })
      } else {
        console.error('❌ DASHBOARD: Submission failed:', result.error)
        setErrorModal({
          isOpen: true,
          title: 'Submission Failed',
          message: result.error || 'Unknown error occurred. Please try again.'
        })
      }
    } catch (error) {
      console.error('💥 DASHBOARD: Submit error:', error)
      setErrorModal({
        isOpen: true,
        title: 'Submission Failed',
        message: 'Failed to submit for review. Please try again.'
      })
    } finally {
      console.log('🏁 DASHBOARD: Submission finished, setting isSubmitting to false')
      setIsSubmitting(false)
    }
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="flex flex-col items-center gap-6 mb-6">
          <div className="p-4 bg-[#00d083]/10 rounded-full border border-[#00d083]/30">
            <svg className="w-10 h-10 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-5xl font-bold text-[#00d083] mb-2">Dashboard</h1>
            <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-[#00d083] to-transparent rounded-full" />
          </div>
        </div>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Welcome back! Here's your business overview.
        </p>
      </div>

      {currentStatus === 'incomplete' && isReadyForReview && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-emerald-300 font-semibold text-lg">Your listing is ready for review</p>
            <p className="text-sm text-emerald-100/80">
              Preview how customers will see your profile, then submit it to the Qwikker team for approval.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              variant="outline"
              className="border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/20"
            >
              <Link href="/dashboard/profile/preview">
                Preview listing
              </Link>
            </Button>
            <Button
              onClick={handleSubmitForReview}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold"
            >
              {isSubmitting ? 'Submitting…' : 'Submit for review'}
            </Button>
          </div>
        </div>
      )}

      {/* 🎯 ALWAYS show preview link when status is pending_review */}
      {currentStatus === 'pending_review' && (
        <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-blue-300 font-semibold text-lg">Your listing is under review</p>
            <p className="text-sm text-blue-100/80">
              Our team is reviewing your profile. You can still preview how it will look to customers.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              variant="outline"
              className="border-blue-400/60 text-blue-200 hover:bg-blue-500/20"
            >
              <Link href="/dashboard/profile/preview">
                Preview listing
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Quick Actions Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
          <Link href="/dashboard/offers">
            <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-xl shadow-lg cursor-pointer transition-colors duration-200">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white group-hover:text-[#00d083]">
                  Create Offer
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
          <Link href="/dashboard/secret-menu">
            <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-xl shadow-lg cursor-pointer transition-colors duration-200">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white group-hover:text-purple-400">
                  Add Secret Menu
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
          <Link href="/dashboard/profile#featured-items">
            <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-xl shadow-lg cursor-pointer transition-colors duration-200">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white group-hover:text-blue-400">
                  Update Menu
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
          <Link href="/dashboard/profile#business-info">
            <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-xl shadow-lg cursor-pointer transition-colors duration-200">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white group-hover:text-orange-400">
                  Edit Profile
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Combined Status & Plan Card */}
        <Card className="bg-slate-800/50 border-slate-700 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Business Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Display */}
            <div className={`p-4 rounded-lg border ${statusDisplay.bgColor}`}>
              <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 ${statusDisplay.color}`}>
                  {statusDisplay.icon}
                </div>
                <div>
                  <p className={`font-semibold ${statusDisplay.color}`}>{statusDisplay.text}</p>
                  <p className="text-sm text-slate-400">{statusDisplay.subtext}</p>
                </div>
              </div>
            </div>

            {/* Plan Display */}
            <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#00d083]">{displayPlanName}</p>
                  <p className="text-sm text-slate-400">
                    {isFreeTrial ? `${trialDaysLeft} days remaining` : 'Active subscription'}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-700">
                  <Link href="/dashboard/settings">Manage</Link>
                </Button>
              </div>
            </div>

            {/* Business Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/offers" className="group">
                <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50 hover:border-[#00d083]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-300 group-hover:text-[#00d083] transition-colors">Active Offers</p>
                      <p className="text-xl font-bold text-white">{profile?.business_offers?.filter(offer => offer.status === 'approved')?.length || 0}</p>
                    </div>
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-[#00d083] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/secret-menu" className="group">
                <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50 hover:border-[#00d083]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-300 group-hover:text-[#00d083] transition-colors">Secret Items</p>
                      <p className="text-xl font-bold text-white">{(() => {
                        try {
                          const notesData = profile?.additional_notes ? JSON.parse(profile.additional_notes) : null
                          return notesData?.secret_menu_items?.length || 0
                        } catch {
                          return 0
                        }
                      })()}</p>
                    </div>
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-[#00d083] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>

          </CardContent>
        </Card>

        {/* Activity Feed Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityFeed.length > 0 ? (
              <div className="space-y-3">
                {activityFeed.slice(0, 4).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <div className={`${activity.color} flex-shrink-0 mt-0.5`}>{activity.icon}</div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${activity.color}`}>{activity.message}</p>
                      <p className="text-xs text-slate-500">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
                {activityFeed.length > 4 && (
                  <Button variant="ghost" size="sm" className="w-full text-slate-400 hover:text-white">
                    View all activity
                  </Button>
                )}
                
                {/* Unlock Full Analytics Button */}
                <div className="pt-3 border-t border-slate-700/50">
                  <Button 
                    onClick={() => setShowAnalyticsModal(true)}
                    size="sm" 
                    className="w-full bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 hover:from-[#00d083]/30 hover:to-[#00b86f]/30 text-[#00d083] border border-[#00d083]/30 hover:border-[#00d083]/50 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Unlock Full Analytics
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">No recent activity</p>
                <p className="text-slate-500 text-xs mt-1">Activity will appear once your business is live</p>
                
                {/* Unlock Full Analytics Button for empty state */}
                <div className="pt-4">
                  <Button 
                    onClick={() => setShowAnalyticsModal(true)}
                    size="sm" 
                    className="bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 hover:from-[#00d083]/30 hover:to-[#00b86f]/30 text-[#00d083] border border-[#00d083]/30 hover:border-[#00d083]/50 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Unlock Full Analytics
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Items / Optimize Listing Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
            {(() => {
              // Calculate ONLY INCOMPLETE/REMAINING action items
              const remainingItems = []
              
              // REQUIRED items that are missing
              if (!profile?.business_name) remainingItems.push({ title: 'Add business name', priority: 'REQUIRED' })
              if ((!profile?.business_hours || profile?.business_hours.trim() === '') && !profile?.business_hours_structured) {
                remainingItems.push({ title: 'Set opening hours', priority: 'REQUIRED' })
              }
              if (!profile?.business_description) remainingItems.push({ title: 'Add business description', priority: 'REQUIRED' })
              if (!profile?.business_tagline) remainingItems.push({ title: 'Add business tagline', priority: 'REQUIRED' })
              if (!profile?.business_address || !profile?.business_town) remainingItems.push({ title: 'Complete business address', priority: 'REQUIRED' })
              if (!profile?.business_category) remainingItems.push({ title: 'Select business category', priority: 'REQUIRED' })
              if (!profile?.logo) remainingItems.push({ title: 'Upload business logo', priority: 'REQUIRED' })
              if (!profile?.business_images || (Array.isArray(profile?.business_images) && profile.business_images.length === 0)) {
                remainingItems.push({ title: 'Upload business photo', priority: 'REQUIRED' })
              }
              
              // RECOMMENDED items that are missing
              // Check for approved menus (new system) instead of old menu_url
              if (!profile?.approved_menus_count || profile.approved_menus_count === 0) {
                remainingItems.push({ 
                  title: 'Upload menu/service list', 
                  priority: 'RECOMMENDED', 
                  href: '/dashboard/files#menus' 
                })
              }
              if (!profile?.menu_preview || (Array.isArray(profile?.menu_preview) && profile.menu_preview.length === 0)) {
                remainingItems.push({ title: 'Add featured services/items', priority: 'RECOMMENDED', href: '/dashboard/profile#featured-items' })
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
              
              if (!profile?.offer_name) remainingItems.push({ title: 'Create your first exclusive offer', priority: 'RECOMMENDED', href: '/dashboard/offers' })
              if (!hasSecretMenuItems) remainingItems.push({ title: 'Add secret menu item', priority: 'RECOMMENDED', href: '/dashboard/secret-menu' })
              if (!profile?.instagram_handle) remainingItems.push({ title: 'Add Instagram handle', priority: 'RECOMMENDED', href: '/dashboard/profile#business-info' })
              if (!profile?.website_url) remainingItems.push({ title: 'Add website URL', priority: 'RECOMMENDED', href: '/dashboard/profile#business-info' })
              if (!profile?.facebook_url) remainingItems.push({ title: 'Add Facebook page', priority: 'RECOMMENDED', href: '/dashboard/profile#business-info' })
              
              const requiredRemaining = remainingItems.filter(item => item.priority === 'REQUIRED')
              const recommendedRemaining = remainingItems.filter(item => item.priority === 'RECOMMENDED')
              
              if (remainingItems.length === 0) {
                return (
                  <>
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Profile Complete
                  </>
                )
              } else {
                return (
                  <>
                    <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Action Items
                    <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full text-xs font-bold">
                      {remainingItems.length}
                    </span>
                  </>
                )
              }
            })()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Calculate the SAME remaining items as in the title
              const remainingItems = []
              
              // REQUIRED items that are missing
              if (!profile?.business_name) remainingItems.push({ title: 'Add business name', priority: 'REQUIRED', href: '/dashboard/profile#business-info' })
              if ((!profile?.business_hours || profile?.business_hours.trim() === '') && !profile?.business_hours_structured) {
                remainingItems.push({ title: 'Set opening hours', priority: 'REQUIRED', href: '/dashboard/profile#business-hours' })
              }
              if (!profile?.business_description) remainingItems.push({ title: 'Add business description', priority: 'REQUIRED', href: '/dashboard/profile#business-info' })
              if (!profile?.business_tagline) remainingItems.push({ title: 'Add business tagline', priority: 'REQUIRED', href: '/dashboard/profile#business-info' })
              if (!profile?.business_address || !profile?.business_town) remainingItems.push({ title: 'Complete business address', priority: 'REQUIRED', href: '/dashboard/profile#business-info' })
              if (!profile?.business_category) remainingItems.push({ title: 'Select business category', priority: 'REQUIRED', href: '/dashboard/profile#business-info' })
              if (!profile?.logo) remainingItems.push({ title: 'Upload business logo', priority: 'REQUIRED', href: '/dashboard/profile#business-logo' })
              if (!profile?.business_images || (Array.isArray(profile?.business_images) && profile.business_images.length === 0)) {
                remainingItems.push({ title: 'Upload business photo', priority: 'REQUIRED', href: '/dashboard/profile#business-photo' })
              }
              
              // RECOMMENDED items that are missing
              // Check for approved menus (new system) instead of old menu_url
              if (!profile?.approved_menus_count || profile.approved_menus_count === 0) {
                remainingItems.push({ title: 'Upload menu/service list', priority: 'RECOMMENDED', href: '/dashboard/files#menus' })
              }
              if (!profile?.menu_preview || (Array.isArray(profile?.menu_preview) && profile.menu_preview.length === 0)) {
                remainingItems.push({ title: 'Add featured services/items', priority: 'RECOMMENDED', href: '/dashboard/profile#featured-items' })
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
              
              // RECOMMENDED - Create first offer (MISSING FROM DASHBOARD!)
              if (!profile?.offer_name) remainingItems.push({ title: 'Create your first exclusive offer', priority: 'RECOMMENDED', href: '/dashboard/offers' })
              
              if (!hasSecretMenuItems) remainingItems.push({ title: 'Add secret menu item', priority: 'RECOMMENDED', href: '/dashboard/secret-menu' })
              if (!profile?.instagram_handle) remainingItems.push({ title: 'Add Instagram handle', priority: 'RECOMMENDED', href: '/dashboard/profile#business-info' })
              if (!profile?.website_url) remainingItems.push({ title: 'Add website URL', priority: 'RECOMMENDED', href: '/dashboard/profile#business-info' })
              if (!profile?.facebook_url) remainingItems.push({ title: 'Add Facebook page', priority: 'RECOMMENDED', href: '/dashboard/profile#business-info' })
              
              if (remainingItems.length > 0) {
                return (
                  <div className="space-y-4">
                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <p className="text-sm text-orange-300 font-medium mb-1">Complete these to improve your visibility on Qwikker</p>
                      <p className="text-xs text-orange-400">Higher completion = better search ranking</p>
                    </div>
                    
                    {/* Show first 3 items like Activity Feed */}
                    <div className="space-y-3">
                      {remainingItems.slice(0, 3).map((item, index) => (
                        <Link key={index} href={item.href}>
                          <div className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80 transition-colors ${
                            item.priority === 'REQUIRED' 
                              ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20' 
                              : 'bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20'
                          }`}>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              item.priority === 'REQUIRED' ? 'bg-red-400' : 'bg-blue-400'
                            }`}></div>
                            <span className={`text-sm flex-1 ${
                              item.priority === 'REQUIRED' ? 'text-red-300' : 'text-blue-300'
                            }`}>{item.title}</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-bold flex-shrink-0 ${
                              item.priority === 'REQUIRED' 
                                ? 'bg-red-500/20 text-red-400' 
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>{item.priority}</span>
                            <svg className={`w-4 h-4 flex-shrink-0 ${
                              item.priority === 'REQUIRED' ? 'text-red-400' : 'text-blue-400'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      ))}
                    </div>
                    
                    {/* View All Button like Activity Feed */}
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <Link href="/dashboard/action-items">
                        <button className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors">
                          View all action items
                        </button>
                      </Link>
                    </div>
                  </div>
                )
              } else {
                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-sm text-green-300 mb-2">🎉 All Items Complete!</p>
                      <p className="text-xs text-green-400">Your listing is fully optimized for maximum visibility</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-white">Keep customers engaged:</p>
                      <ul className="space-y-1 text-xs text-slate-400">
                        <li>• Update your offers regularly</li>
                        <li>• Add new secret menu items</li>
                        <li>• Upload fresh business photos</li>
                        <li>• Keep your menu current</li>
                      </ul>
                    </div>
                  </div>
                )
              }
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Additional Dashboard Cards - ALL THE MISSING ONES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Analytics Overview (Locked) */}
        <Card className="bg-slate-800/50 border-slate-700 relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics Overview
            </CardTitle>
          </CardHeader>
          <CardContent className={!isPremiumFeatureUnlocked() ? "blur-[8px] select-none pointer-events-none" : ""}>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#00d083]">{analyticsData.totalVisits}</p>
                <p className="text-xs text-gray-400">Views This Month</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#00d083]">{analyticsData.totalClaims}</p>
                <p className="text-xs text-gray-400">Offers Claimed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#00d083]">{analyticsData.totalQRScans}</p>
                <p className="text-xs text-gray-400">QR Code Scans</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#00d083]">
                  {analyticsData.totalVisits > 0 
                    ? ((analyticsData.totalClaims / analyticsData.totalVisits) * 100).toFixed(1) 
                    : '0'}%
                </p>
                <p className="text-xs text-gray-400">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
          {/* Only show lock overlay if NOT Spotlight */}
          {!isPremiumFeatureUnlocked() && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-semibold text-white mb-2">Unlock Analytics</p>
                <Button asChild size="sm" className="bg-[#00d083] hover:bg-[#00b86f] text-white">
                  <Link href="/dashboard/analytics">Upgrade Plan</Link>
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Push Notifications (Locked) */}
        <Card className="bg-slate-800/50 border-slate-700 relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 12a8 8 0 1116 0c0 3-2 5-2 5H6s-2-2-2-5zM9 21h6" />
              </svg>
              Push Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className={!isPremiumFeatureUnlocked() ? "blur-[8px] select-none pointer-events-none" : ""}>
            {isPremiumFeatureUnlocked() ? (
              // Unlocked: Show action button and recent notifications
              <div className="space-y-4">
                <Button asChild className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white">
                  <Link href="/dashboard/notifications">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Send New Push Notification
                  </Link>
                </Button>
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Recent Notifications</h4>
                  <div className="space-y-2">
                    <div className="bg-slate-700/30 rounded-lg p-2 text-xs">
                      <p className="text-white font-medium">Weekend Special</p>
                      <p className="text-slate-400">Sent 2 hours ago • 156 delivered</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-2 text-xs">
                      <p className="text-white font-medium">New Menu Item</p>
                      <p className="text-slate-400">Sent yesterday • 243 delivered</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Locked: Show placeholder content
              <div className="space-y-3">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="font-medium text-white">New Customer Alert</p>
                  <p className="text-sm text-gray-300 mt-1">Sarah just ordered your Daily Special!</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="font-medium text-white">Loyalty Milestone</p>
                  <p className="text-sm text-gray-300 mt-1">Mike reached 10 visits!</p>
                </div>
              </div>
            )}
          </CardContent>
          {/* Only show lock overlay if NOT Spotlight */}
          {!isPremiumFeatureUnlocked() && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-semibold text-white mb-2">Unlock Push Notifications</p>
                <Button asChild size="sm" className="bg-[#00d083] hover:bg-[#00b86f] text-white">
                  <Link href="/dashboard/notifications">Upgrade Plan</Link>
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Loyalty Cards Preview (Locked) */}
        <Card className="bg-slate-800/50 border-slate-700 relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Loyalty Card Preview
            </CardTitle>
          </CardHeader>
          <CardContent className={!isPremiumFeatureUnlocked() ? "blur-[8px] select-none pointer-events-none" : ""}>
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
          {/* Only show lock overlay if NOT Spotlight */}
          {!isPremiumFeatureUnlocked() && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-semibold text-white mb-2">Unlock Loyalty Cards</p>
                <Button asChild size="sm" className="bg-[#00d083] hover:bg-[#00b86f] text-white">
                  <Link href="/dashboard/loyalty">Upgrade Plan</Link>
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Social Wizard (Locked) */}
        <Card className="bg-slate-800/50 border-slate-700 relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Social Wizard
            </CardTitle>
          </CardHeader>
          <CardContent className={!isFeatureUnlocked('social_wizard') ? "blur-[8px] select-none pointer-events-none" : ""}>
            {isFeatureUnlocked('social_wizard') ? (
              // Unlocked: Show action button
              <div className="space-y-4">
                <Button asChild className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white">
                  <Link href="/dashboard/social-wizard">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Post
                  </Link>
                </Button>
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">AI-Powered Content</h4>
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <p className="text-white text-sm font-medium mb-1">Generate engaging social posts</p>
                    <p className="text-slate-400 text-xs">Let AI create compelling content for Instagram, Facebook, and Twitter in seconds</p>
                  </div>
                </div>
              </div>
            ) : (
              // Locked: Show placeholder content
              <div className="space-y-3">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="font-medium text-white">AI Post Generator</p>
                  <p className="text-sm text-gray-300 mt-1">Create engaging social content in seconds</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="font-medium text-white">Multi-Platform</p>
                  <p className="text-sm text-gray-300 mt-1">Optimize for Instagram, Facebook, Twitter</p>
                </div>
              </div>
            )}
          </CardContent>
          {/* Only show lock overlay if NOT unlocked */}
          {!isFeatureUnlocked('social_wizard') && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-semibold text-white mb-2">Unlock Social Wizard</p>
                <Button asChild size="sm" className="bg-[#00d083] hover:bg-[#00b86f] text-white">
                  <Link href="/dashboard/social-wizard">Upgrade Plan</Link>
                </Button>
              </div>
            </div>
          )}
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
                  <p className="text-2xl font-bold text-[#00d083]">0</p>
                  <p className="text-xs text-gray-400">Businesses Referred</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#00d083]">£0.00</p>
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

      {/* Success/Error Modals */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
        buttonText={successModal.buttonText}
        onButtonClick={successModal.onButtonClick}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
      />

      {/* Analytics Unlock Modal */}
      <ElegantModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        title="Analytics Dashboard"
        description="Get deep insights into your business performance with detailed analytics and reporting."
        type="info"
        size="md"
        actions={[
          {
            label: 'Upgrade to Spotlight',
            onClick: () => {
              window.location.href = '/dashboard/settings'
            },
            variant: 'default',
            className: 'bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold'
          }
        ]}
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h4 className="font-medium text-blue-400 mb-3">Unlock Advanced Analytics</h4>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                <span>Search visibility & impressions tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                <span>Offer performance & conversion rates</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                <span>Customer demographics & behavior insights</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                <span>Export data & QR code tracking</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center">
            Available on Spotlight plan • Data is anonymized & privacy-friendly
          </p>
        </div>
      </ElegantModal>
    </div>
  )
}
