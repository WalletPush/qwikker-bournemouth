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

type PlanTier = 'starter' | 'trial' | 'featured' | 'spotlight'

interface FeatureAccess {
  social_wizard: boolean
  loyalty_cards: boolean
  analytics: boolean
  push_notifications: boolean
}

export function TierManagementCard({ business, onUpdate }: TierManagementCardProps) {
  const [selectedTier, setSelectedTier] = useState<PlanTier>(business?.plan || 'starter')
  const [isSaving, setIsSaving] = useState(false)
  
  // Feature access state
  const [features, setFeatures] = useState<FeatureAccess>({
    social_wizard: business?.features?.social_wizard ?? false,
    loyalty_cards: business?.features?.loyalty_cards ?? false,
    analytics: business?.features?.analytics ?? false,
    push_notifications: business?.features?.push_notifications ?? false
  })

  // Free trial state
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(business?.free_trial_enabled ?? false)
  const [trialStartDate, setTrialStartDate] = useState(
    business?.trial_start_date ? new Date(business.trial_start_date).toISOString().split('T')[0] : ''
  )
  const [trialEndDate, setTrialEndDate] = useState(
    business?.trial_end_date ? new Date(business.trial_end_date).toISOString().split('T')[0] : ''
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
      const updateData: any = {
        plan: selectedTier,
        features: features,
        updated_at: new Date().toISOString()
      }

      // Add trial dates if trial tier is selected
      if (selectedTier === 'trial') {
        updateData.trial_start_date = trialStartDate || new Date().toISOString()
        updateData.trial_end_date = trialEndDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        updateData.free_trial_enabled = true
      } else {
        // Clear trial dates if not on trial
        updateData.free_trial_enabled = false
      }

      const { error } = await supabase
        .from('business_profiles')
        .update(updateData)
        .eq('id', business.id)

      if (error) throw error

      console.log('✅ Tier updated:', { tier: selectedTier, features, trialDates: selectedTier === 'trial' ? { start: trialStartDate, end: trialEndDate } : null })
      alert('✅ Tier and features updated successfully!')
      onUpdate()
    } catch (error) {
      console.error('❌ Error updating tier:', error)
      alert('Failed to update tier. Please try again.')
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
            {(['starter', 'trial', 'featured', 'spotlight'] as PlanTier[]).map((tier) => {
              const details = tierDetails[tier]
              const isSelected = selectedTier === tier
              
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
                    {tier === 'starter' && 'Basic features'}
                    {tier === 'trial' && '90-day free trial'}
                    {tier === 'featured' && 'Priority placement'}
                    {tier === 'spotlight' && 'All premium features'}
                  </div>
                  {isSelected && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-[#00d083]">✓ Selected</span>
                    </div>
                  )}
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
              { key: 'social_wizard' as const, label: 'Social Wizard', icon: '✨' },
              { key: 'loyalty_cards' as const, label: 'Loyalty Cards', icon: '💳' },
              { key: 'analytics' as const, label: 'Analytics', icon: '📊' },
              { key: 'push_notifications' as const, label: 'Push Notifications', icon: '🔔' }
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
                    <span className="text-xl">{icon}</span>
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
    </Card>
  )
}

