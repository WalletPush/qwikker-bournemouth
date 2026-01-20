'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { updateBusinessTier } from '@/lib/actions/admin-crm-actions'
import { computeEntitlementState } from '@/lib/utils/entitlement-helpers'

interface TierManagementCardProps {
  business: any
  onUpdate: () => void
}

type PlanTier = 'free' | 'trial' | 'starter' | 'featured' | 'spotlight'

interface FeatureAccess {
  social_wizard: boolean
  loyalty_cards: boolean
  analytics: boolean
  push_notifications: boolean
}

export function TierManagementCard({ business, onUpdate }: TierManagementCardProps) {
  // ✅ LOCKDOWN: Extract subscription properly
  const sub = Array.isArray(business?.subscription) ? business?.subscription[0] : business?.subscription
  
  // ✅ LOCKDOWN: Compute entitlement state (DO NOT use business.plan!)
  const entitlement = computeEntitlementState(
    {
      owner_user_id: business?.owner_user_id,
      status: business?.status
    },
    sub
  )
  
  // Get current tier from entitlement state ONLY
  const getCurrentTier = (): PlanTier | null => {
    console.log('🔍 Getting current tier from entitlement:', {
      state: entitlement.state,
      tierNameOrNull: entitlement.tierNameOrNull,
      business_status: business?.status
    })
    
    // ✅ LOCKDOWN: Use entitlement state to determine tier
    if (entitlement.state === 'UNCLAIMED') return null // No tier yet
    if (entitlement.state === 'NO_SUB') return null // Free listing, no tier
    if (entitlement.state === 'TRIAL_EXPIRED') return null // NO TIER!
    if (entitlement.state === 'TRIAL_ACTIVE') return 'trial'
    if (entitlement.state === 'PAID_ACTIVE' && entitlement.tierNameOrNull) {
      return entitlement.tierNameOrNull as PlanTier
    }
    
    return null // Default: no tier selected
  }

  // ✅ LOCKDOWN: Initialize with current tier OR null (for expired/no-sub)
  const currentTier = getCurrentTier()
  const [selectedTier, setSelectedTier] = useState<PlanTier | null>(currentTier)
  const [userHasSelected, setUserHasSelected] = useState(false) // Track if user clicked a tier
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  // Feature access state
  const [features, setFeatures] = useState<FeatureAccess>({
    social_wizard: business?.features?.social_wizard ?? false,
    loyalty_cards: business?.features?.loyalty_cards ?? false,
    analytics: business?.features?.analytics ?? false,
    push_notifications: business?.features?.push_notifications ?? false
  })

  // Free trial state - ONLY use subscription data (NOT business_profiles)
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(
    business?.subscription?.is_in_free_trial ?? false
  )
  const [trialStartDate, setTrialStartDate] = useState(
    business?.subscription?.free_trial_start_date 
      ? new Date(business.subscription.free_trial_start_date).toISOString().split('T')[0]
      : ''
  )
  const [trialEndDate, setTrialEndDate] = useState(
    business?.subscription?.free_trial_end_date 
      ? new Date(business.subscription.free_trial_end_date).toISOString().split('T')[0]
      : ''
  )

  // Calculate trial days remaining
  const calculateTrialDays = () => {
    if (!trialEndDate) return 0
    const end = new Date(trialEndDate)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const tierDetails = {
    free: {
      name: 'Free Listing',
      color: 'border-emerald-500',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-400',
      features: [
        '✅ Listed in Discover directory',
        '✅ Basic business profile',
        '✅ Update profile info',
        '✅ Limited visibility',
        '❌ No AI chat visibility',
        '❌ No offers or events',
        '❌ No secret menu items',
        '❌ No analytics'
      ]
    },
    trial: {
      name: 'Free Trial',
      color: 'border-blue-500',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-400',
      features: [
        'All Featured features included',
        '90-day free trial period',
        'Priority AI placement',
        'Advanced menu/service indexing',
        'Up to 5 exclusive offers',
        'Social media featuring',
        'Full Secret Menu Club'
      ]
    },
    starter: {
      name: 'Starter',
      color: 'border-slate-500',
      bgColor: 'bg-slate-500/10',
      textColor: 'text-slate-400',
      features: [
        'AI-powered discovery listings',
        'Basic menu/service indexing',
        'Up to 3 active offers',
        'Social media welcome',
        'Secret Menu Club (3 items)',
        'Dashboard with support'
      ]
    },
    featured: {
      name: 'Featured',
      color: 'border-purple-500',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-400',
      features: [
        'Everything in Starter, plus:',
        'Priority AI placement',
        'Advanced menu/service indexing',
        'Up to 5 exclusive offers',
        'Social media featuring',
        'Full Secret Menu Club'
      ]
    },
    spotlight: {
      name: 'Spotlight',
      color: 'border-amber-500',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-400',
      features: [
        'Everything in Featured, plus:',
        'White-label loyalty system',
        'Complete POS system access',
        'Push notifications to all users',
        'Direct AI booking',
        'Advanced AI insights'
      ]
    }
  }

  const handleTierChange = (tier: PlanTier) => {
    console.log('🎯 TIER CHANGED TO:', tier)
    setSelectedTier(tier)
    setUserHasSelected(true) // ✅ Track that user made a selection
    
    // Auto-enable features based on tier
    if (tier === 'spotlight') {
      setFeatures({
        social_wizard: true,
        loyalty_cards: true,
        analytics: true,
        push_notifications: true
      })
    } else if (tier === 'trial' || tier === 'featured') {
      // Trial and Featured have same features, just different billing
      setFeatures({
        social_wizard: false,
        loyalty_cards: false,
        analytics: false,
        push_notifications: false
      })
    } else {
      // Starter
      setFeatures({
        social_wizard: false,
        loyalty_cards: false,
        analytics: false,
        push_notifications: false
      })
    }

    // Auto-set trial dates if switching to trial tier
    if (tier === 'trial' && !trialStartDate) {
      const start = new Date()
      const end = new Date()
      end.setDate(end.getDate() + 90) // 90-day trial
      setTrialStartDate(start.toISOString().split('T')[0])
      setTrialEndDate(end.toISOString().split('T')[0])
      setFreeTrialEnabled(true)
    }
  }

  const handleFeatureToggle = (feature: keyof FeatureAccess) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }))
  }

  const handleSave = async () => {
    if (!selectedTier) return
    
    setIsSaving(true)
    setErrorMessage(null)
    
    try {
      console.log('🚀 Calling SERVER ACTION: updateBusinessTier')
      console.log('🔍 Business object:', {
        id: business.id,
        user_id: business.user_id,
        name: business.business_name,
        will_use_userId: business.user_id || business.id
      })
      console.log('📊 SELECTED TIER BEFORE SAVE:', selectedTier)

      // Calculate trial days from trial end date
      const trialDays = selectedTier === 'trial' ? calculateTrialDays() : undefined

      console.log('💾 CALLING updateBusinessTier WITH:', {
        businessId: business.id,
        selectedTier,
        features,
        trialDays
      })

      // Call the server action (uses service role, bypasses RLS)
      const result = await updateBusinessTier({
        businessId: business.id,
        userId: business.user_id || business.id,
        city: business.city,
        selectedTier,
        features,
        trialDays
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to update tier')
      }

      console.log('✅ SERVER ACTION succeeded:', result)
      setShowSuccessModal(true)
      setTimeout(() => {
        setShowSuccessModal(false)
        onUpdate()
      }, 800)
    } catch (error: any) {
      console.error('❌ Error updating tier:', error)
      setErrorMessage(error?.message || 'Unknown error occurred')
      setShowErrorModal(true)
    } finally {
      setIsSaving(false)
    }
  }

  // ✅ SAFETY: Lock tiers for ANY unclaimed business (not just imported)
  // ✅ LOCKDOWN: Use entitlement state for lock logic
  const isUnclaimed = entitlement.shouldLockControls

  // DEV-ONLY: Log tier overlay gate status
  if (process.env.NODE_ENV === 'development') {
    console.log('[TIER OVERLAY GATE]', {
      business_name: business?.business_name,
      status: business?.status,
      owner_user_id: business?.owner_user_id,
      auto_imported: business?.auto_imported,
      isUnclaimed,
      will_show_overlay: isUnclaimed
    })
  }
  
  return (
    <Card className="bg-slate-800/50 border-slate-700 relative">
      {/* ✅ OVERLAY for ANY unclaimed business (SAFETY: owner_user_id IS NULL) */}
      {isUnclaimed && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Business Must Claim Before Upgrading</h4>
            <p className="text-slate-300 mb-4">
              This business listing is unclaimed. Subscription tiers and features can only be managed after the business owner claims their listing.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-sm text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Current Status: <span className="text-orange-400 font-semibold">Unclaimed</span>
            </div>
          </div>
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="text-white">Tier & Feature Management</CardTitle>
        <p className="text-sm text-slate-400">
          Control subscription tier and individual feature access
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ✅ LOCKDOWN: Expired trial notice from entitlement state */}
        {entitlement.state === 'TRIAL_EXPIRED' && (() => {
          return (
            <div className="p-4 rounded-lg border-2 border-red-500/30 bg-red-500/10">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-400 mb-1">⚠️ Trial Has Expired - No Active Subscription</h4>
                  <p className="text-sm text-red-300 mb-3">
                    This business's free trial ended on {sub?.free_trial_end_date 
                      ? new Date(sub.free_trial_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'recently'}. They currently have <strong>no active subscription tier</strong>.
                  </p>
                  <p className="text-xs text-slate-400">
                    👉 To reactivate this business, extend their trial or select a paid tier below.
                  </p>
                </div>
              </div>
            </div>
          )
        })()}
        
        {/* Tier Selection */}
        <div>
          <Label className="text-slate-300 mb-3 block">Select Subscription Tier</Label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(['free', 'trial', 'starter', 'featured', 'spotlight'] as PlanTier[]).map((tier) => {
              const details = tierDetails[tier]
              const isSelected = selectedTier === tier
              const isCurrent = getCurrentTier() === tier
              
              return (
                <button
                  key={tier}
                  onClick={() => handleTierChange(tier)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? `${details.color} ${details.bgColor}`
                      : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                  }`}
                >
                  <div className={`font-semibold mb-1 ${isSelected ? details.textColor : 'text-slate-300'}`}>
                    {details.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {tier === 'free' && 'Discover only'}
                    {tier === 'trial' && '90-day free trial'}
                    {tier === 'starter' && 'Basic features'}
                    {tier === 'featured' && 'Priority placement'}
                    {tier === 'spotlight' && 'All premium features'}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {/* ✅ LOCKDOWN: Only show "Current" if business has an active tier */}
                    {isCurrent && currentTier !== null && (
                      <span className="text-xs font-medium text-blue-400">Current</span>
                    )}
                    {/* ✅ LOCKDOWN: Only show "Selected" if user manually clicked */}
                    {isSelected && (userHasSelected || currentTier !== null) && (
                      <span className="text-xs font-medium text-[#00d083]">✓ Selected</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Current Tier Features */}
        {selectedTier ? (
          <div className={`p-4 rounded-lg border ${tierDetails[selectedTier].color} ${tierDetails[selectedTier].bgColor}`}>
            <h4 className={`font-medium mb-2 ${tierDetails[selectedTier].textColor}`}>
              {tierDetails[selectedTier].name} Features
            </h4>
            <ul className="space-y-1 text-xs text-slate-400">
              {tierDetails[selectedTier].features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#00d083] mt-0.5">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-slate-600 bg-slate-700/30">
            <p className="text-sm text-slate-400 text-center">
              Select a tier above to view features and manage subscription
            </p>
          </div>
        )}

        {/* Free Trial Management - Only shown when trial tier is selected */}
        {selectedTier === 'trial' && (
          <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="font-medium text-amber-400">Free Trial Period</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">Trial Start Date</Label>
                <input
                  type="date"
                  value={trialStartDate}
                  onChange={(e) => setTrialStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">Trial End Date</Label>
                <input
                  type="date"
                  value={trialEndDate}
                  onChange={(e) => setTrialEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                />
              </div>
            </div>

            {trialEndDate && (
              <div className="p-2 bg-slate-700/50 rounded text-center">
                <span className="text-amber-400 font-semibold text-lg">{calculateTrialDays()}</span>
                <span className="text-slate-400 text-sm ml-2">days remaining</span>
              </div>
            )}
          </div>
        )}

        {/* Individual Feature Control */}
        <div>
          <Label className="text-slate-300 mb-3 block">Individual Feature Access</Label>
          <div className="space-y-2">
            {[
              { 
                key: 'social_wizard' as const, 
                label: 'Social Wizard',
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              },
              { 
                key: 'loyalty_cards' as const, 
                label: 'Loyalty Cards',
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              },
              { 
                key: 'analytics' as const, 
                label: 'Analytics',
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              },
              { 
                key: 'push_notifications' as const, 
                label: 'Push Notifications',
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 12a8 8 0 1116 0c0 3-2 5-2 5H6s-2-2-2-5zM9 21h6" /></svg>
              }
            ].map(({ key, label, icon }) => {
              const isEnabled = features[key]
              
              return (
                <button
                  key={key}
                  onClick={() => handleFeatureToggle(key)}
                  className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                    isEnabled
                      ? 'border-[#00d083] bg-[#00d083]/10'
                      : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isEnabled ? 'text-[#00d083]' : 'text-slate-400'}>
                      {icon}
                    </span>
                    <span className={`font-medium ${isEnabled ? 'text-white' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEnabled ? (
                      <>
                        <span className="text-xs font-medium text-[#00d083]">Unlocked</span>
                        <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-slate-500">Locked</span>
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Info Notice */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-400">
            <strong>Note:</strong> Changes take effect immediately. The business will see updated features in their dashboard right away.
          </p>
        </div>
      </CardContent>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#00d083]/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Success!</h3>
                <p className="text-sm text-slate-400">Tier updated successfully</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              The subscription tier and features have been updated. Changes will be visible immediately.
            </p>
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Error</h3>
                <p className="text-sm text-slate-400">Failed to update tier</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              {errorMessage}
            </p>
            <Button
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

