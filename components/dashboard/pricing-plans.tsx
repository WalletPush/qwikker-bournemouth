'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PricingPlansProps {
  currentPlan?: string
  isFoundingMember?: boolean
  profile?: any
}

export function PricingPlans({ currentPlan = 'starter', isFoundingMember = false, profile }: PricingPlansProps) {
  // Check if user is in free trial
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
      yearlyDiscount: 232,
      icon: (
        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      features: [
        'AI-powered discovery listings',
        'Menu/service indexing', 
        'Up to 3 active offers',
        'Social media welcome',
        'Limited Secret Menu Club',
        'Dashboard with support'
      ]
    },
    {
      id: 'featured',
      name: 'Featured',
      price: 59,
      yearlyPrice: 590,
      yearlyDiscount: 472,
      popular: true,
      icon: (
        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      features: [
        'Everything in Starter, plus:',
        'Priority AI placement',
        'Advanced menu indexing',
        'Up to 5 exclusive offers',
        'Social media featuring',
        'Full Secret Menu Club'
      ]
    },
    {
      id: 'spotlight',
      name: 'Spotlight',
      price: 89,
      yearlyPrice: 890,
      yearlyDiscount: 712,
      premium: true,
      icon: (
        <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
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
            className={`relative bg-slate-800/50 border transition-all duration-300 hover:scale-[1.02] flex flex-col ${
              isFreeTrialFeatured ? 'ring-2 ring-[#00d083]/50 border-[#00d083]/50' : 
              plan.popular ? 'border-blue-500/50' : 
              plan.premium ? 'border-yellow-500/50' : 
              'border-slate-700'
            }`}
          >
            {/* Single Badge - No Overlapping */}
            {isFreeTrialFeatured ? (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-[#00d083] text-black px-4 py-1 rounded-full text-sm font-bold">
                  Current - Free Trial
                </div>
              </div>
            ) : plan.popular ? (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              </div>
            ) : null}

            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                {plan.icon}
              </div>
              <CardTitle className="text-xl font-bold text-white">{plan.name}</CardTitle>
              <div className="mt-4">
                {/* Clean Pricing Display */}
                <div className="text-3xl font-bold text-white mb-2">
                  £{plan.price}
                  <span className="text-lg font-normal text-gray-400">/month</span>
                </div>
                
                {/* Simplified Yearly Pricing */}
                {showDiscountPricing ? (
                  <div className="text-center">
                    <div className="text-sm text-gray-400 line-through">
                      £{plan.yearlyPrice}/year
                    </div>
                    <div className="text-base font-semibold text-green-400">
                      £{plan.yearlyDiscount}/year
                    </div>
                    <div className="text-xs text-green-300">
                      20% off 12-month plans
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    £{plan.yearlyPrice}/year
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              {/* Clean Feature List */}
              <div className="space-y-3 flex-1 mb-6">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Beautiful Action Button */}
              <div className="mt-auto">
                {(isCurrentPlan && !isFreeTrialFeatured) ? (
                  <Button 
                    className="w-full bg-slate-600 hover:bg-slate-700 text-white cursor-not-allowed h-12 font-semibold rounded-lg"
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
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold h-12 rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
                  >
                    Switch to Paid Plan
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      console.log(`Upgrading to ${plan.name} plan`)
                      window.location.href = `/dashboard/settings?upgrade=${plan.id}`
                    }}
                    className={`w-full font-semibold h-12 text-white rounded-lg shadow-lg transition-all duration-200 ${
                      plan.id === 'starter' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-green-500/25' :
                      plan.id === 'featured' ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/25' :
                      'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 hover:shadow-yellow-500/25'
                    }`}
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