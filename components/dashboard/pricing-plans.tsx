'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'

interface PricingPlansProps {
  currentPlan?: string
  isFoundingMember?: boolean
  profile?: any
}

export function PricingPlans({ currentPlan = 'starter', isFoundingMember = false, profile }: PricingPlansProps) {
  // Check if user is in free trial and should see discount pricing
  const isInFreeTrial = profile?.plan === 'featured' && profile?.created_at
  const trialDaysLeft = isInFreeTrial ? (() => {
    const createdDate = new Date(profile.created_at)
    const now = new Date()
    const diffTime = now.getTime() - createdDate.getTime()
    const daysSinceSignup = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, 120 - daysSinceSignup)
  })() : 0
  
  const showDiscountPricing = isInFreeTrial && trialDaysLeft > 0 && isFoundingMember

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 29,
      yearlyPrice: 290,
      yearlyDiscount: 232, // 20% off
      color: 'from-green-500 to-emerald-600',
      features: [
        'AI-powered discovery listings',
        'Menu/service indexing', 
        'Up to 3 active offers',
        'Social media welcome',
        'Limited Secret Menu Club access',
        'Dashboard with support'
      ]
    },
    {
      id: 'featured',
      name: 'Featured',
      price: 59,
      yearlyPrice: 590,
      yearlyDiscount: 472, // 20% off
      color: 'from-blue-500 to-indigo-600',
      popular: true,
      features: [
        'Everything in Starter, plus:',
        'Priority AI placement',
        'Advanced menu indexing',
        'Up to 5 exclusive offers',
        'Social media featuring',
        'Full Secret Menu Club access'
      ]
    },
    {
      id: 'spotlight',
      name: 'Spotlight',
      price: 89,
      yearlyPrice: 890,
      yearlyDiscount: 712, // 20% off
      color: 'from-yellow-500 to-amber-600',
      premium: true,
      features: [
        'Everything in Featured, plus:',
        'White-label loyalty system',
        'Advanced AI insights',
        'Push notifications',
        'Analytics & QR stands',
        'Direct AI booking'
      ]
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {plans.map((plan) => {
        const isCurrentPlan = currentPlan === plan.id
        const isFreeTrialFeatured = isInFreeTrial && plan.id === 'featured'
        
        return (
          <Card 
            key={plan.id}
            className={`relative bg-slate-800/50 border transition-all duration-300 hover:scale-[1.02] flex flex-col h-full ${
              plan.popular ? 'border-blue-500/50' : 
              plan.premium ? 'border-yellow-500/50' : 
              'border-slate-700'
            } ${isFreeTrialFeatured ? 'ring-2 ring-[#00d083]/50' : ''}`}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              </div>
            )}

            {/* Free Trial Badge */}
            {isFreeTrialFeatured && (
              <div className="absolute -top-3 right-4">
                <div className="bg-[#00d083] text-black px-3 py-1 rounded-full text-sm font-bold">
                  Current - Free Trial
                </div>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold text-white">{plan.name}</CardTitle>
              <div className="mt-4">
                <div className="text-3xl font-bold text-white">
                  £{plan.price}
                  <span className="text-lg font-normal text-gray-400">/month</span>
                </div>
                {showDiscountPricing ? (
                  <div className="mt-2">
                    <div className="text-sm text-gray-400 line-through">
                      £{plan.yearlyPrice}/year
                    </div>
                    <div className="text-lg font-semibold text-yellow-400">
                      £{plan.yearlyDiscount}/year (20% off 12-month plans)
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 mt-2">
                    £{plan.yearlyPrice}/year
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-3 flex-1">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-auto">
                {(isCurrentPlan && !isFreeTrialFeatured) ? (
                  <Button 
                    className="w-full bg-slate-600 hover:bg-slate-700 text-white cursor-not-allowed h-12"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : isFreeTrialFeatured ? (
                  <Button 
                    onClick={() => {
                      console.log('Converting free trial to paid Featured plan')
                      window.location.href = '/dashboard/settings?upgrade=featured'
                    }}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium h-12"
                  >
                    {showDiscountPricing ? 'Lock in 20% OFF for Life!' : 'Switch to Paid Plan'}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      console.log(`Upgrading to ${plan.name} plan`)
                      window.location.href = `/dashboard/settings?upgrade=${plan.id}`
                    }}
                    className={`w-full font-medium h-12 bg-gradient-to-r ${plan.color} hover:opacity-90 text-white`}
                  >
                    Upgrade to {plan.name}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}