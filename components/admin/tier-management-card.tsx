'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

interface TierManagementCardProps {
  business: any
  onUpdate: () => void
}

type PlanTier = 'trial' | 'starter' | 'featured' | 'spotlight'

interface FeatureAccess {
  social_wizard: boolean
  loyalty_cards: boolean
  analytics: boolean
  push_notifications: boolean
}

export function TierManagementCard({ business, onUpdate }: TierManagementCardProps) {
  // Get current tier from subscription or fallback to business profile
  const getCurrentTier = (): PlanTier => {
    console.log('🔍 Getting current tier:', {
      subscription_tier_name: business?.subscription?.tier_name,
      profile_plan: business?.plan
    })
    
    if (business?.subscription?.tier_name) {
      if (business.subscription.tier_name === 'free') return 'trial'
      return business.subscription.tier_name as PlanTier
    }
    if (business?.plan) {
      return business.plan as PlanTier
    }
    return 'starter'
  }

  const [selectedTier, setSelectedTier] = useState<PlanTier>(getCurrentTier())
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
    trial: {
      name: 'Free Trial',
      color: 'border-amber-500',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-400',
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
      color: 'border-blue-500',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-400',
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
      color: 'border-purple-500',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-400',
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
    setSelectedTier(tier)
    
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
    setIsSaving(true)
    const supabase = createClient()

    try {
      console.log('🔄 Starting tier update...', { businessId: business.id, selectedTier, features })

      // Step 1: Get tier ID from subscription_tiers
      // For trial, use 'starter' tier but mark as trial in subscription
      const tierName = selectedTier === 'trial' ? 'starter' : selectedTier
      const { data: tierData, error: tierError } = await supabase
        .from('subscription_tiers')
        .select('id')
        .eq('tier_name', tierName)
        .single()

      if (tierError) {
        console.error('❌ Error fetching tier:', {
          tierError,
          tierName,
          selectedTier,
          message: `Could not find tier: ${tierName}`
        })
        throw new Error(`Could not find tier: ${tierName}. Please ensure the subscription_tiers table has this tier.`)
      }

      console.log('✅ Found tier:', { tierName, tierId: tierData.id })

      // Step 2: Update business_profiles with plan and features
      const profileUpdate: any = {
        plan: selectedTier,
        features: features,
        updated_at: new Date().toISOString()
      }

      console.log('📝 Attempting profile update:', { profileUpdate, businessId: business.id })

      const { error: profileError } = await supabase
        .from('business_profiles')
        .update(profileUpdate)
        .eq('id', business.id)

      if (profileError) {
        console.error('❌ Profile update error:', {
          error: profileError,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code,
          profileUpdate
        })
        throw profileError
      }

      console.log('✅ Profile updated successfully')

      // Step 3: Update or create business_subscriptions
      const subscriptionUpdate: any = {
        business_id: business.id,
        tier_id: tierData.id,
        status: selectedTier === 'trial' ? 'trial' : 'active',
        updated_at: new Date().toISOString()
      }

      // Handle trial-specific fields
      if (selectedTier === 'trial') {
        const startDate = trialStartDate || new Date().toISOString()
        const endDate = trialEndDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        
        subscriptionUpdate.is_in_free_trial = true
        subscriptionUpdate.free_trial_start_date = startDate
        subscriptionUpdate.free_trial_end_date = endDate
      } else {
        subscriptionUpdate.is_in_free_trial = false
        subscriptionUpdate.free_trial_start_date = null
        subscriptionUpdate.free_trial_end_date = null
      }

      // Check if subscription exists, then update or insert
      const { data: existingSub, error: checkError } = await supabase
        .from('business_subscriptions')
        .select('id')
        .eq('business_id', business.id)
        .single()

      let subscriptionError

      if (existingSub) {
        // Update existing subscription
        const { error } = await supabase
          .from('business_subscriptions')
          .update(subscriptionUpdate)
          .eq('business_id', business.id)
        subscriptionError = error
      } else {
        // Insert new subscription
        const { error } = await supabase
          .from('business_subscriptions')
          .insert(subscriptionUpdate)
        subscriptionError = error
      }

      if (subscriptionError) {
        console.error('❌ Subscription update error:', {
          code: subscriptionError.code,
          message: subscriptionError.message,
          details: subscriptionError.details,
          hint: subscriptionError.hint
        })
        throw subscriptionError
      }

      console.log('✅ Subscription updated')
      console.log('🎉 Tier updated successfully:', { tier: selectedTier, features })
      setShowSuccessModal(true)
      setTimeout(() => {
        onUpdate()
      }, 1500)
    } catch (error: any) {
      console.error('❌ Error updating tier:', {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      setErrorMessage(error?.message || 'Unknown error occurred')
      setShowErrorModal(true)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Tier & Feature Management</CardTitle>
        <p className="text-sm text-slate-400">
          Control subscription tier and individual feature access
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tier Selection */}
        <div>
          <Label className="text-slate-300 mb-3 block">Select Subscription Tier</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['trial', 'starter', 'featured', 'spotlight'] as PlanTier[]).map((tier) => {
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
                    {tier === 'trial' && '90-day free trial'}
                    {tier === 'starter' && 'Basic features'}
                    {tier === 'featured' && 'Priority placement'}
                    {tier === 'spotlight' && 'All premium features'}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {isCurrent && (
                      <span className="text-xs font-medium text-blue-400">Current</span>
                    )}
                    {isSelected && (
                      <span className="text-xs font-medium text-[#00d083]">✓ Selected</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Current Tier Features */}
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

