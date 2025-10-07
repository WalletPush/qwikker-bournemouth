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
    [key: string]: any
  }
}

export function ImprovedDashboardHome({ profile }: ImprovedDashboardHomeProps) {
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(0)
  const [pendingChanges, setPendingChanges] = useState<any[]>([])
  const [loadingPendingChanges, setLoadingPendingChanges] = useState(false)
  const [activityFeed, setActivityFeed] = useState<any[]>([])
  const [businessVisits, setBusinessVisits] = useState<any[]>([])
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

  // Calculate trial days
  useEffect(() => {
    if (profile?.created_at) {
      const createdDate = new Date(profile.created_at)
      const now = new Date()
      const diffTime = now.getTime() - createdDate.getTime()
      const daysSinceSignup = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const daysLeft = Math.max(0, 120 - daysSinceSignup)
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
        
        // Fetch business changes (offers, approvals, etc.)
        try {
          const { getPendingChanges, getApprovedChanges } = await import('@/lib/actions/pending-changes')
          
          // Get pending changes
          const changesResult = await getPendingChanges(profile.user_id)
          if (changesResult.success) {
            changesResult.pendingChanges.forEach((change: any) => {
              if (change.change_type === 'offer') {
                realActivity.push({
                  id: `offer_submitted_${change.id}`,
                  type: 'offer_submitted',
                  message: `Offer "${change.change_data?.offer_name || 'New Offer'}" submitted for review`,
                  timestamp: new Date(change.submitted_at || change.created_at),
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  ),
                  color: 'text-orange-400'
                })
              }
            })
          }
          
          // Get approved changes
          const approvedResult = await getApprovedChanges(profile.user_id)
          if (approvedResult.success) {
            approvedResult.approvedChanges.forEach((change: any) => {
              if (change.change_type === 'offer') {
                realActivity.push({
                  id: `offer_approved_${change.id}`,
                  type: 'offer_approved',
                  message: `Offer "${change.change_data?.offer_name || 'Your Offer'}" approved and live!`,
                  timestamp: new Date(change.approved_at || change.updated_at),
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  color: 'text-green-400'
                })
              }
            })
          }
        } catch (error) {
          console.error('Error loading business changes for activity feed:', error)
        }
      
      // Profile creation event
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
      
      // Profile submission event (if submitted)
      if (profile.status === 'pending_review' || profile.status === 'approved') {
        realActivity.push({
          id: 'profile_submitted',
          type: 'profile_submitted', 
          message: 'Profile submitted for review',
          timestamp: new Date(profile.updated_at || profile.created_at),
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
          color: 'text-blue-400'
        })
      }
      
      // Approval event (if approved)
      if (profile.status === 'approved') {
        realActivity.push({
          id: 'listing_approved',
          type: 'listing_approved',
          message: 'Listing approved by Qwikker',
          timestamp: new Date(profile.approved_at || profile.updated_at),
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'text-green-400'
        })
      }
      
      // Logo upload event
      if (profile.logo) {
        realActivity.push({
          id: 'logo_uploaded',
          type: 'logo_uploaded',
          message: 'Business logo uploaded',
          timestamp: new Date(profile.updated_at || profile.created_at),
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          color: 'text-purple-400'
        })
      }
      
      // Business hours set event
      if (profile.business_hours_structured) {
        realActivity.push({
          id: 'hours_updated',
          type: 'hours_updated', 
          message: 'Business hours updated',
          timestamp: new Date(profile.business_hours_structured.last_updated || profile.updated_at),
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'text-yellow-400'
        })
      }
      
      // Offer created event
      if (profile.offer_name) {
        realActivity.push({
          id: 'offer_created',
          type: 'offer_created',
          message: `Created "${profile.offer_name}" offer`,
          timestamp: new Date(profile.offer_start_date || profile.updated_at),
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          ),
          color: 'text-orange-400'
        })
      }
      
      // Secret menu items event
      if (profile.additional_notes) {
        try {
          const notesData = JSON.parse(profile.additional_notes)
          if (notesData.secret_menu_items && notesData.secret_menu_items.length > 0) {
            realActivity.push({
              id: 'secret_menu_added',
              type: 'secret_menu_added',
              message: `Added ${notesData.secret_menu_items.length} secret menu item${notesData.secret_menu_items.length !== 1 ? 's' : ''}`,
              timestamp: new Date(profile.updated_at),
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ),
              color: 'text-indigo-400'
            })
          }
        } catch (e) {
          // Invalid JSON, ignore
        }
      }
      
      // Add business visits to activity feed
            businessVisits.forEach((visit) => {
              const visitorName = `${visit.app_users?.first_name || ''} ${visit.app_users?.last_name || ''}`.trim() || 'Someone'
        realActivity.push({
          id: `visit_${visit.id}`,
          type: 'business_viewed',
          message: `${visitorName} viewed your business${visit.is_first_visit ? ' (first time!)' : ''}`,
          timestamp: new Date(visit.visit_date),
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ),
          color: visit.is_first_visit ? 'text-green-400' : 'text-blue-400'
        })
      })

      // Add offer claims and redemptions for THIS business
      try {
        const { data: offerClaims } = await supabase
          .from('user_offer_claims')
          .select(`
            id,
            offer_title,
            claimed_at,
            status,
            updated_at,
            wallet_pass_id
          `)
          .eq('business_name', profile.business_name)
          .order('claimed_at', { ascending: false })
          .limit(10)

        if (offerClaims) {
          for (const claim of offerClaims) {
            // Get user name
            let userName = 'Someone'
            if (claim.wallet_pass_id) {
              const { data: user } = await supabase
                .from('app_users')
                .select('first_name, last_name, name')
                .eq('wallet_pass_id', claim.wallet_pass_id)
                .single()
              
              if (user) {
                userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'Someone'
              }
            }

            // Add claim activity
            realActivity.push({
              id: `claim_${claim.id}`,
              type: 'offer_claimed',
              message: `${userName} claimed YOUR "${claim.offer_title}" offer`,
              timestamp: new Date(claim.claimed_at),
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              ),
              color: 'text-blue-400'
            })

            // Add redemption activity if redeemed
            if (claim.status === 'wallet_added' || claim.status === 'redeemed') {
              realActivity.push({
                id: `redeem_${claim.id}`,
                type: 'offer_redeemed',
                message: `${userName} redeemed YOUR "${claim.offer_title}" offer`,
                timestamp: new Date(claim.updated_at || claim.claimed_at),
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ),
                color: 'text-green-400'
              })
            }
          }
        }
      } catch (error) {
        console.error('Error loading offer claims for business activity:', error)
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
  const plan = profile?.plan || 'starter'
  const isFreeTrial = plan === 'featured' && trialDaysLeft > 0
  const planName = isFreeTrial ? 'Featured (Free Trial)' : 
                  plan === 'starter' ? 'Starter' : 
                  plan.charAt(0).toUpperCase() + plan.slice(1)

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
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back! Here's your business overview.</p>
      </div>

      {/* Quick Actions Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
          <Link href="/dashboard/offers">
            <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200">
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
            <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200">
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
            <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200">
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
            <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200">
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
                  <p className="font-semibold text-[#00d083]">{planName}</p>
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
                      <p className="text-xl font-bold text-white">{profile?.offer_name ? 1 : 0}</p>
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

            {/* Submit Button - Only show for incomplete profiles */}
            {currentStatus === 'incomplete' && isReadyForReview && (
              <Button 
                onClick={handleSubmitForReview}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Review'}
              </Button>
            )}
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
              if (!profile?.menu_url) remainingItems.push({ title: 'Upload menu/service list', priority: 'RECOMMENDED', href: '/dashboard/files#menu' })
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
              if (!profile?.menu_url) remainingItems.push({ title: 'Upload menu/service list', priority: 'RECOMMENDED', href: '/dashboard/files#menu' })
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
          <CardContent className="blur-[8px] select-none pointer-events-none">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#00d083]">247</p>
                <p className="text-xs text-gray-400">Views This Month</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#00d083]">12</p>
                <p className="text-xs text-gray-400">Offers Claimed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#00d083]">89%</p>
                <p className="text-xs text-gray-400">Positive Reviews</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#00d083]">34</p>
                <p className="text-xs text-gray-400">New Followers</p>
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
          <CardContent className="blur-[8px] select-none pointer-events-none">
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
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Loyalty Card Preview
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
    </div>
  )
}
