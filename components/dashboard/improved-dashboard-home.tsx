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
import { HowQwikkerWorksModal } from '@/components/dashboard/how-qwikker-works-modal'
import { VerificationStatusWidget } from './VerificationStatusWidget'
import { ClaimWelcomeModal } from './claim-welcome-modal'
import { isFreeTier } from '@/lib/atlas/eligibility'
import { LoyaltyCardPreview, toLoyaltyCardPreviewProps } from '@/components/loyalty/loyalty-card-preview'

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
  const [franchiseConfig, setFranchiseConfig] = useState<{
    founding_member_enabled: boolean
    founding_member_discount: number
    founding_member_title: string
    founding_member_description: string
  } | null>(null)
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
  
  // Claim welcome modal state (only show once on first login for claimed_free)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  
  // How Qwikker Works modal state
  const [showHowQwikkerWorksModal, setShowHowQwikkerWorksModal] = useState(false)

  // Activity feed modal + badge state
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [newActivityCount, setNewActivityCount] = useState(0)

  // Push notification stats state
  const [pushStats, setPushStats] = useState<{
    eligiblePasses: number
    sentCount: number
    clickThroughRate: number
    recentNotifications: Array<{ id: string; message: string; sentCount: number; createdAt: string }>
  } | null>(null)

  // Loyalty program state for dashboard card (full program for card preview)
  const [loyaltyProgram, setLoyaltyProgram] = useState<Record<string, any> | null>(null)

  // Fetch loyalty program data for dashboard card
  useEffect(() => {
    async function fetchLoyalty() {
      try {
        const res = await fetch('/api/loyalty/program')
        if (!res.ok) return
        const data = await res.json()
        if (data.program) {
          setLoyaltyProgram(data.program)
          if (data.program.status === 'active') {
            const summaryRes = await fetch('/api/loyalty/business-summary')
            if (summaryRes.ok) {
              const summaryData = await summaryRes.json()
              setLoyaltyProgram(prev => prev ? { ...prev, member_count: summaryData.summary?.totalMembers || 0 } : prev)
            }
          }
        }
      } catch {
        // Non-critical
      }
    }
    fetchLoyalty()
  }, [])

  // Show welcome modal on mount if needed
  useEffect(() => {
    if (
      profile?.status === 'claimed_free' &&
      profile?.claim_welcome_modal_shown === false
    ) {
      setShowWelcomeModal(true)
    }
  }, [profile?.status, profile?.claim_welcome_modal_shown])

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
    console.log('🔍 COMPONENT DEBUG: Profile has subscription?', !!profile?.subscription)
    console.log('🔍 COMPONENT DEBUG: is_in_free_trial?', profile?.subscription?.is_in_free_trial)
    console.log('🔍 COMPONENT DEBUG: free_trial_end_date?', profile?.subscription?.free_trial_end_date)
    
    if (profile?.subscription?.is_in_free_trial && profile?.subscription?.free_trial_end_date) {
      // Use accurate subscription trial data
      const endDate = new Date(profile.subscription.free_trial_end_date)
      const now = new Date()
      const diffTime = endDate.getTime() - now.getTime()
      const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      console.log('✅ USING SUBSCRIPTION DATA: Days left =', daysLeft)
      setTrialDaysLeft(daysLeft)
    } else if (profile?.created_at) {
      // Fallback to legacy calculation (90 days from created_at)
      const createdDate = new Date(profile.created_at)
      const now = new Date()
      const diffTime = now.getTime() - createdDate.getTime()
      const daysSinceSignup = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const daysLeft = Math.max(0, 90 - daysSinceSignup)
      console.log('❌ USING FALLBACK: Days left =', daysLeft, '(90 - ' + daysSinceSignup + ' days since signup)')
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

  // Fetch franchise config for founding member discount
  useEffect(() => {
    const fetchFranchiseConfig = async () => {
      try {
        const { getCityFromHostnameClient } = await import('@/lib/utils/client-city-detection')
        const city = getCityFromHostnameClient(window.location.hostname)
        const response = await fetch(`/api/admin/pricing-cards?city=${city}`)
        const data = await response.json()
        
        if (data.success) {
          setFranchiseConfig({
            founding_member_enabled: data.config.founding_member_enabled ?? true,
            founding_member_discount: data.config.founding_member_discount || 20,
            founding_member_title: data.config.founding_member_title || 'Founding Member Benefit',
            founding_member_description: data.config.founding_member_description || ''
          })
        }
      } catch (error) {
        console.error('Error fetching franchise config:', error)
      }
    }
    
    if (profile?.status === 'claimed_free') {
      fetchFranchiseConfig()
    }
  }, [profile?.status])

  // Generate REAL activity feed based on profile data AND business changes
  useEffect(() => {
    if (profile?.user_id) {
      const loadActivityFeed = async () => {
        const realActivity: Array<{ id: string; type: string; message: string; timestamp: Date; icon: React.ReactNode; color: string }> = []
        
        // 1. GRANULAR ACTIVITY EVENTS (individual claims, visits with names)
        try {
          const { getBusinessActivityData } = await import('@/lib/actions/business-analytics-actions')
          const businessAnalytics = await getBusinessActivityData(profile.id)
          
          // Individual offer claims with user names
          businessAnalytics.recentActivity
            .filter(e => e.type === 'offer_claim')
            .forEach((event, i) => {
              const name = event.firstName || 'Someone'
              const offerLabel = event.itemName ? ` "${event.itemName}"` : ''
              realActivity.push({
                id: `claim_${i}_${event.timestamp}`,
                type: 'offer_claimed',
                message: `${name} claimed your offer${offerLabel}`,
                timestamp: new Date(event.timestamp),
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                ),
                color: 'text-orange-400'
              })
            })

          // Individual profile views with user names
          businessAnalytics.recentActivity
            .filter(e => e.type === 'profile_view')
            .forEach((event, i) => {
              const name = event.firstName || 'Someone'
              realActivity.push({
                id: `visit_${i}_${event.timestamp}`,
                type: 'profile_view',
                message: `${name} viewed your profile`,
                timestamp: new Date(event.timestamp),
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ),
                color: 'text-blue-400'
              })
            })
        } catch (error) {
          console.error('Error loading business analytics for activity feed:', error)
        }
        
        // 2. APPROVED OFFERS (show recently approved offers)
        if (profile?.business_offers && Array.isArray(profile.business_offers)) {
          const approvedOffers = profile.business_offers
            .filter((offer: any) => offer.status === 'approved' && offer.approved_at)
            .sort((a: any, b: any) => new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime())
            .slice(0, 3)
          
          approvedOffers.forEach((offer: any) => {
            realActivity.push({
              id: `offer_approved_${offer.id}`,
              type: 'offer_approved',
              message: `Offer "${offer.offer_name}" approved and live!`,
              timestamp: new Date(offer.approved_at),
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              color: 'text-green-400'
            })
          })
        }
        
        // 3. SECRET MENU ITEMS (from additional_notes)
        // Items only exist in this array after admin approval.
        // New items have status='approved' + approved_at; legacy items lack these fields.
        try {
          if (profile?.additional_notes) {
            const notesData = JSON.parse(profile.additional_notes)
            if (notesData.secret_menu_items && Array.isArray(notesData.secret_menu_items)) {
              const secretItems = notesData.secret_menu_items
                .filter((item: any) => item.itemName && (item.status === 'approved' || !item.status))
                .sort((a: any, b: any) =>
                  new Date(b.approved_at || b.created_at || 0).getTime() -
                  new Date(a.approved_at || a.created_at || 0).getTime()
                )
                .slice(0, 3)
              
              secretItems.forEach((item: any) => {
                realActivity.push({
                  id: `secret_menu_${item.id || item.itemName}`,
                  type: 'secret_menu_approved',
                  message: `Secret menu item "${item.itemName}" approved!`,
                  timestamp: new Date(item.approved_at || item.created_at || profile.created_at),
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ),
                  color: 'text-purple-400'
                })
              })
            }
          }
        } catch (error) {
          console.error('Error parsing secret menu items for activity feed:', error)
        }
        
        // 4. PENDING CHANGES (waiting for approval)
        try {
          const { getPendingChanges } = await import('@/lib/actions/pending-changes')
          const changesResult = await getPendingChanges(profile.user_id)
          
          if (changesResult.success && changesResult.pendingChanges.length > 0) {
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
        
        // 5. PROFILE MILESTONES (one-time events)
        if (profile.status === 'approved' && profile.approved_at) {
          const approvalTime = new Date(profile.approved_at)
          const createdTime = new Date(profile.created_at)
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
      
        // Sort by timestamp (newest first) -- store ALL items, slice only in render
        const sortedActivity = realActivity
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        
        setActivityFeed(sortedActivity)

        // Track new activity count via localStorage
        const storageKey = `activity_feed_seen_${profile.id}`
        const lastSeenCount = parseInt(localStorage.getItem(storageKey) || '0', 10)
        const newCount = Math.max(0, sortedActivity.length - lastSeenCount)
        setNewActivityCount(newCount)
      }
      
      loadActivityFeed()
    }
  }, [profile, businessVisits])

  // Mark activity as seen when modal opens
  const handleOpenActivityModal = () => {
    setShowActivityModal(true)
    setNewActivityCount(0)
    if (profile?.id) {
      localStorage.setItem(`activity_feed_seen_${profile.id}`, String(activityFeed.length))
    }
  }

  // Fetch push notification stats for the dashboard card
  const fetchPushStats = async () => {
    try {
      const res = await fetch('/api/dashboard/notification-stats')
      if (!res.ok) return
      const data = await res.json()
      setPushStats({
        eligiblePasses: data.eligiblePasses || 0,
        sentCount: data.sentCount || 0,
        clickThroughRate: data.clickThroughRate || 0,
        recentNotifications: (data.recentNotifications || []).slice(0, 2).map((n: any) => ({
          id: n.id,
          message: n.message,
          sentCount: n.sentCount,
          createdAt: n.createdAt,
        })),
      })
    } catch (err) {
      console.error('Error fetching push stats:', err)
    }
  }

  useEffect(() => {
    if (isFeatureUnlocked('push_notifications')) {
      fetchPushStats()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Calculate if ready for review (no required fields missing)
  const isReadyForReview = profile?.business_name && 
    (profile?.business_hours || profile?.business_hours_structured) &&
    profile?.business_description && 
    profile?.business_tagline && 
    profile?.business_address && 
    profile?.business_town && 
    profile?.display_category && 
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
    if (!profile?.display_category) count++
    if (!profile?.logo) count++
    if (!profile?.business_images || (Array.isArray(profile?.business_images) && profile.business_images.length === 0)) count++
    return count
  }

  const requiredFieldsCount = getRequiredFieldsCount()


  // Status display logic - FIXED LOGIC
  const getStatusDisplay = () => {
    // ✅ CRITICAL: Check for expired trial FIRST (overrides all other statuses)
    // Handle both array format (from admin) and object format (from dashboard)
    const subscription = Array.isArray(profile?.subscription) 
      ? profile.subscription[0] 
      : profile?.subscription
      
    if (subscription?.is_in_free_trial && subscription?.free_trial_end_date) {
      const endDate = new Date(subscription.free_trial_end_date)
      const now = new Date()
      
      if (endDate < now) {
        const daysExpired = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
        return {
          text: '🔴 Trial Expired',
          subtext: `Trial ended ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago - Please upgrade to continue`,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10 border-red-500/20',
          icon: (
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      }
    }
    
    // If profile is complete but status is still incomplete, show "Ready to Submit"
    // 🔒 HIDE for claimed_free businesses
    if (currentStatus === 'incomplete' && isReadyForReview && profile?.status !== 'claimed_free') {
        return {
          text: 'Ready to Submit',
          subtext: 'All requirements complete - ready for review',
          color: 'text-green-400',
          bgColor: 'bg-slate-700/30 border-slate-600/50',
          icon: (
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
    }
    
    // 🔒 For claimed_free, show special status
    if (profile?.status === 'claimed_free') {
      return {
        text: 'Free Listing',
        subtext: 'Basic AI visibility • Upgrade for premium carousel cards',
        color: 'text-emerald-400',
        bgColor: 'bg-slate-700/30 border-slate-600/50',
        icon: (
          <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          bgColor: 'bg-slate-700/30 border-slate-600/50',
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
          bgColor: 'bg-slate-700/30 border-slate-600/50',
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
    // 🔒 CRITICAL: Check if claimed_free status
    if (profile?.status === 'claimed_free') {
      return {
        name: 'Free Listing',
        isFreeTrial: false
      }
    }
    
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
        <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">Dashboard</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Welcome back! Here's your business overview.
        </p>
      </div>

      {/* 🔒 FREE LISTING UPGRADE BANNER - CLEAN & PREMIUM */}
      {profile?.status === 'claimed_free' && (
        <div className="rounded-2xl border border-slate-600 bg-slate-800/50 p-8">
          <div className="space-y-6 text-center">
            {/* Your Free Listing Includes */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Your Free Listing Includes</h3>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm py-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">Visible in Discover section</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">Basic AI chat visibility</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">Up to 5 menu items</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">1 offer per month</span>
                </div>
              </div>
            </div>
            
            {/* Divider */}
            <div className="border-t border-slate-600"></div>
            
            {/* Upgrade Section */}
            <div className="space-y-5">
              <h3 className="text-2xl font-semibold text-white">Upgrade to Start Getting Recommended</h3>
              <p className="text-slate-300 text-base leading-relaxed max-w-2xl mx-auto">
                Free listings are visible. <span className="text-white font-medium">Upgraded listings are actively suggested by AI</span> and shown more prominently to customers looking right now.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-semibold px-8"
                >
                  <Link href="/dashboard/settings#pricing">
                    View Plans
                  </Link>
                </Button>
                <button
                  onClick={() => setShowHowQwikkerWorksModal(true)}
                  className="text-slate-300 hover:text-white text-sm transition-colors duration-200"
                >
                  How Qwikker brings you customers →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 MENU PROMPT FOR CLAIMED_FREE - Only show if menu_preview is empty */}
      {profile?.status === 'claimed_free' && (!profile?.menu_preview || (Array.isArray(profile?.menu_preview) && profile.menu_preview.length === 0)) && (
        <div className="rounded-2xl border border-slate-600 bg-slate-800/30 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-xl font-semibold text-white">Boost your chat visibility</h3>
              <p className="text-slate-300 leading-relaxed">
                Users can discover you with dish-level recommendations. Add up to 5 featured items so you appear when someone asks for specific dishes or cuisines.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button asChild variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40">
                <Link href="/dashboard/profile#featured-items">
                  Add featured items
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {currentStatus === 'incomplete' && isReadyForReview && profile?.status !== 'claimed_free' && (
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
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-semibold"
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

      {/* Atlas & Verification Widget - shown for all tiers */}
      <div className="mb-6">
        <VerificationStatusWidget business={{
          id: profile?.id || '',
          business_name: profile?.business_name || '',
          google_place_id: profile?.google_place_id,
          latitude: profile?.latitude,
          longitude: profile?.longitude,
          business_tier: profile?.business_tier
        }} />
      </div>

      {/* Quick Actions Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative">
          <Link href="/dashboard/offers">
            <Card className="relative bg-slate-800/50 border-slate-700 rounded-xl cursor-pointer transition-colors duration-200 hover:border-[#00d083]/50">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white">
                  Create Offer
                </span>
              </CardContent>
            </Card>
          </Link>
          {profile?.status === 'claimed_free' && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-2 px-4">
              <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-slate-300 text-center font-medium leading-tight">
                Offers Locked<br/>
                <span className="text-[10px] text-slate-400">Upgrade to create deals</span>
              </span>
            </div>
          )}
        </div>

        <div className="relative">
          <Link href="/dashboard/secret-menu">
            <Card className="relative bg-slate-800/50 border-slate-700 rounded-xl cursor-pointer transition-colors duration-200 hover:border-purple-500/50">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white">
                  Add Secret Menu
                </span>
              </CardContent>
            </Card>
          </Link>
          {profile?.status === 'claimed_free' && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-2 px-4">
              <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-slate-300 text-center font-medium leading-tight">
                Secret Menu Locked<br/>
                <span className="text-[10px] text-slate-400">Upgrade for hidden specials</span>
              </span>
            </div>
          )}
        </div>

        <div className="relative">
          <Link href="/dashboard/profile#featured-items">
            <Card className="relative bg-slate-800/50 border-slate-700 rounded-xl cursor-pointer transition-colors duration-200 hover:border-blue-500/50">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white">
                  Update Menu
                </span>
              </CardContent>
            </Card>
          </Link>
          {profile?.status === 'claimed_free' && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-2 px-4">
              <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-slate-300 text-center font-medium leading-tight">
                Menu Upload Locked<br/>
                <span className="text-[10px] text-slate-400">Upgrade to upload menus</span>
              </span>
            </div>
          )}
        </div>

        <div>
          <Link href="/dashboard/profile#business-info">
            <Card className="relative bg-slate-800/50 border-slate-700 rounded-xl cursor-pointer transition-colors duration-200 hover:border-orange-500/50">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white">
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
                      <p className="text-xl font-bold text-white">{profile?.business_offers?.filter(offer => offer.status === 'approved' && (!offer.offer_end_date || new Date(offer.offer_end_date) >= new Date()))?.length || 0}</p>
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
        <Card className={`bg-slate-800/50 border-slate-700 ${profile?.status === 'claimed_free' ? 'md:col-span-2 lg:col-span-2' : ''}`}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Activity Feed
              {newActivityCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  {newActivityCount} new
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityFeed.length > 0 ? (
              <div className="space-y-3">
                {activityFeed.slice(0, 3).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <div className={`${activity.color} flex-shrink-0 mt-0.5`}>{activity.icon}</div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${activity.color}`}>{activity.message}</p>
                      <p className="text-xs text-slate-500">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
                {activityFeed.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full text-slate-400 hover:text-white" onClick={handleOpenActivityModal}>
                    View all activity ({activityFeed.length} items)
                  </Button>
                )}
                
                {/* Unlock Full Analytics Button - ONLY for non-Spotlight tiers */}
                {!isPremiumFeatureUnlocked() && (
                  <div className="pt-3 border-t border-slate-700/50">
                    <Button 
                      onClick={() => setShowAnalyticsModal(true)}
                      size="sm" 
                      className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Unlock Full Analytics
                    </Button>
                  </div>
                )}
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
                
                {/* Unlock Full Analytics Button for empty state - ONLY for non-Spotlight tiers */}
                {!isPremiumFeatureUnlocked() && (
                  <div className="pt-4">
                    <Button 
                      onClick={() => setShowAnalyticsModal(true)}
                      size="sm" 
                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Unlock Full Analytics
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Items / Optimize Listing Card */}
        {/* 🔒 HIDE for claimed_free businesses - they don't need to complete action items */}
        {profile?.status !== 'claimed_free' && (
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
              if (!profile?.display_category) remainingItems.push({ title: 'Select business category', priority: 'REQUIRED' })
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
              if (!profile?.display_category) remainingItems.push({ title: 'Select business category', priority: 'REQUIRED', href: '/dashboard/profile#business-info' })
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
                    <div className="p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg">
                      <p className="text-sm text-green-400 mb-2">All Items Complete</p>
                      <p className="text-xs text-slate-400">Your listing is fully optimized for maximum visibility</p>
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
        )}
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
          <CardContent className={!isFeatureUnlocked('analytics') ? "blur-[8px] select-none pointer-events-none" : ""}>
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
          {/* Only show lock overlay if analytics is not unlocked */}
          {!isFeatureUnlocked('analytics') && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-semibold text-white mb-2">Unlock Analytics</p>
                <Button asChild size="sm" variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40">
                  <Link href="/dashboard/settings">Upgrade Plan</Link>
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
          <CardContent className={!isFeatureUnlocked('push_notifications') ? "blur-[8px] select-none pointer-events-none" : ""}>
            {isFeatureUnlocked('push_notifications') ? (
              // Unlocked: Show real stats, send button, and recent notifications
              <div className="space-y-4">
                {/* Send button -- navigates to push notifications page */}
                <Button asChild variant="outline" className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40">
                  <Link href="/dashboard/notifications">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Send New Push Notification
                  </Link>
                </Button>

                {/* Real stats row */}
                {pushStats && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-700/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-white">{pushStats.eligiblePasses}</p>
                      <p className="text-[10px] text-slate-500">Eligible</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-white">{pushStats.sentCount}</p>
                      <p className="text-[10px] text-slate-500">Sent (30d)</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-2">
                      <p className="text-lg font-bold text-white">{pushStats.clickThroughRate}%</p>
                      <p className="text-[10px] text-slate-500">CTR</p>
                    </div>
                  </div>
                )}

                {/* Recent real notifications */}
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Recent Notifications</h4>
                  <div className="space-y-2">
                    {pushStats?.recentNotifications && pushStats.recentNotifications.length > 0 ? (
                      pushStats.recentNotifications.map(n => (
                        <div key={n.id} className="bg-slate-700/30 rounded-lg p-2 text-xs">
                          <p className="text-white font-medium truncate">{n.message}</p>
                          <p className="text-slate-400">{formatTimeAgo(new Date(n.createdAt))} • {n.sentCount} delivered</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No notifications sent yet</p>
                    )}
                  </div>
                  <Link href="/dashboard/notifications" className="block text-center text-xs text-slate-500 hover:text-slate-300 transition-colors mt-2">
                    View all →
                  </Link>
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
          {/* Only show lock overlay if push_notifications is not unlocked */}
          {!isFeatureUnlocked('push_notifications') && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-semibold text-white mb-2">Unlock Push Notifications</p>
                <Button asChild size="sm" variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40">
                  <Link href="/dashboard/settings">Upgrade Plan</Link>
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Loyalty Cards */}
        <Card className="bg-slate-800/50 border-slate-700 relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Loyalty
            </CardTitle>
          </CardHeader>
          <CardContent className={!isFeatureUnlocked('loyalty_cards') ? "blur-[8px] select-none pointer-events-none" : ""}>
            {isFeatureUnlocked('loyalty_cards') && (loyaltyProgram?.status === 'active' || loyaltyProgram?.status === 'paused') ? (
              <div className="space-y-3">
                <LoyaltyCardPreview
                  {...toLoyaltyCardPreviewProps({ ...loyaltyProgram, business_name: businessName })}
                />
                {typeof loyaltyProgram.member_count === 'number' && (
                  <p className="text-emerald-400 text-xs font-medium">
                    {loyaltyProgram.member_count} {loyaltyProgram.member_count === 1 ? 'member' : 'members'}
                  </p>
                )}
                <Button asChild variant="outline" size="sm" className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40">
                  <Link href="/dashboard/loyalty">Manage Loyalty</Link>
                </Button>
              </div>
            ) : isFeatureUnlocked('loyalty_cards') && loyaltyProgram?.status === 'submitted' ? (
              <div className="space-y-3">
                <LoyaltyCardPreview
                  {...toLoyaltyCardPreviewProps({ ...loyaltyProgram, business_name: businessName })}
                />
                <p className="text-amber-400 text-xs font-medium text-center">Under Review</p>
                <Button asChild variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-400 hover:bg-zinc-800">
                  <Link href="/dashboard/loyalty">View Details</Link>
                </Button>
              </div>
            ) : isFeatureUnlocked('loyalty_cards') ? (
              <div className="space-y-3">
                <div className="bg-zinc-900/40 border border-zinc-700/30 rounded-lg p-4 text-center">
                  <p className="text-zinc-300 text-sm">Bring customers back with stamp rewards</p>
                  <p className="text-zinc-500 text-xs mt-1">Set up your loyalty program in minutes.</p>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40">
                  <Link href="/dashboard/loyalty">Set Up Loyalty</Link>
                </Button>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-lg p-4">
                <h4 className="font-bold text-white">{businessName}</h4>
                <p className="text-sm mt-1 text-zinc-400">Collect stamps, earn rewards</p>
                <div className="flex justify-center gap-2 mt-3">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-full border-2 border-zinc-600 flex items-center justify-center text-xs ${
                        i < 5 ? 'bg-zinc-500 text-zinc-800' : ''
                      }`}
                    >
                      {i < 5 ? '✓' : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          {!isFeatureUnlocked('loyalty_cards') && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-semibold text-white mb-2">Unlock Loyalty Cards</p>
                <Button asChild size="sm" variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40">
                  <Link href="/dashboard/settings">Upgrade Plan</Link>
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
                <Button asChild variant="outline" className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40">
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
                <Button asChild size="sm" variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40">
                  <Link href="/dashboard/settings">Upgrade Plan</Link>
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
                  <p className="text-2xl font-bold text-[#00d083]">0</p>
                  <p className="text-xs text-gray-400">Credits Earned</p>
                </div>
              </div>
              
              <Button asChild variant="outline" className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40">
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
              
              <Button asChild variant="outline" className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40">
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
            variant: 'outline',
            className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-semibold'
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

      {/* 🎉 Claim Welcome Modal - Show once on first login for claimed_free users */}
      {profile?.status === 'claimed_free' && profile?.business_name && (
        <ClaimWelcomeModal
          businessName={profile.business_name}
          businessId={profile.id}
          isOpen={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}

      {/* 📚 How Qwikker Works Modal */}
      <HowQwikkerWorksModal
        isOpen={showHowQwikkerWorksModal}
        onClose={() => setShowHowQwikkerWorksModal(false)}
      />

      {/* Activity Feed Modal */}
      <ElegantModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        title="All Activity"
        description="Your complete activity feed"
        type="info"
        size="lg"
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {activityFeed.length > 0 ? activityFeed.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
              <div className={`${activity.color} flex-shrink-0 mt-0.5`}>{activity.icon}</div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${activity.color}`}>{activity.message}</p>
                <p className="text-xs text-slate-500">{formatTimeAgo(activity.timestamp)}</p>
              </div>
            </div>
          )) : (
            <p className="text-center text-slate-500 py-8">No activity yet</p>
          )}
        </div>
      </ElegantModal>

    </div>
  )
}
