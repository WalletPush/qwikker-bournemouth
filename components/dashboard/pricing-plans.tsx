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
  const [trialEndDate, setTrialEndDate] = useState<string>('')

  useEffect(() => {
    if (profile?.created_at) {
      const createdDate = new Date(profile.created_at)
      const endDate = new Date(createdDate.getTime() + (120 * 24 * 60 * 60 * 1000)) // Add 120 days
      setTrialEndDate(endDate.toLocaleDateString('en-GB', { 
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }))
    }
  }, [profile])

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 29,
      yearlyPrice: 290,
      yearlyDiscount: 58,
      color: 'from-green-500 to-emerald-600',
      borderColor: 'border-green-500/50',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      features: [
        'AI-powered discovery listings',
        'Menu/service indexing',
        'Up to 3 active offers',
        'Social media welcome',
        'Limited Secret Menu Club access',
        'Dashboard with support',
        'Physical marketing materials'
      ]
    },
    {
      id: 'featured',
      name: 'Featured',
      price: 59,
      yearlyPrice: 590,
      yearlyDiscount: 118,
      color: 'from-blue-500 to-indigo-600',
      borderColor: 'border-blue-500/50',
      popular: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      features: [
        'Everything in Starter, plus:',
        'Priority AI placement',
        'Advanced menu indexing',
        'Up to 5 exclusive offers',
        'Social media featuring',
        'Full Secret Menu Club access',
        '"Near Me" carousel listing'
      ]
    },
    {
      id: 'spotlight',
      name: 'Spotlight',
      price: 89,
      yearlyPrice: 890,
      yearlyDiscount: 178,
      color: 'from-yellow-500 to-amber-600',
      borderColor: 'border-yellow-500/50',
      premium: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      features: [
        'Everything in Featured, plus:',
        'White-label loyalty system',
        'Advanced AI insights',
        'Push notifications',
        'Analytics & QR stands',
        'Direct AI booking',
        'Unlimited offers'
      ]
    }
  ]

  const premiumFeatures = [
    'Push notifications to all users',
    'Advanced analytics & insights',
    'White-label loyalty system',
    'Priority AI placement',
    'Full Secret Menu Club access',
    'Social media featuring'
  ]

  return (
    <div className="space-y-8">
      {/* Upgrade Banner */}
      {currentPlan === 'starter' && isFoundingMember && trialEndDate && (
        <div className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-yellow-500/30 rounded-xl p-8 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-2xl font-bold text-yellow-400">Limited Time Founding Member Offer</h3>
            </div>
            
            <p className="text-lg text-white mb-4">
              <span className="font-semibold">Upgrade on or before {trialEndDate}</span> to receive <span className="text-yellow-400 font-bold">20% off 12-month plans for life</span> as a founding member and unlock premium features such as:
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm">
              {premiumFeatures.map((feature, index) => (
                <span key={index} className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-gray-200">
                  {feature}
                </span>
              ))}
            </div>
            
            <p className="text-xl text-white">
              Starting from only <span className="text-yellow-400 font-bold">£29.99/month</span>
            </p>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id
          const isFreeTrialFeatured = currentPlan === 'starter' // Free trial users are on starter but it's actually featured plan trial
          
          return (
            <Card 
              key={plan.id}
              className={`relative bg-slate-800/50 backdrop-blur-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 group flex flex-col h-full ${
                plan.popular ? 'ring-2 ring-blue-500/50 border-blue-500/50' : 
                plan.premium ? 'ring-2 ring-yellow-500/50 border-yellow-500/50' : 
                plan.borderColor
              } ${(isCurrentPlan && !isFreeTrialFeatured) || (isFreeTrialFeatured && plan.id === 'featured') ? 'ring-4 ring-[#00d083]/50 border-[#00d083]/50' : ''}`}
            >
              {/* Current Plan Badge for Featured (Free Trial) */}
              {isFreeTrialFeatured && plan.id === 'featured' && (
                <div className="absolute -top-4 right-4 z-10">
                  <div className="bg-[#00d083] text-black px-3 py-1 rounded-full text-xs font-bold uppercase shadow-lg flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></div>
                    Current
                  </div>
                </div>
              )}

              {/* Popular Badge - Only show if not on free trial */}
              {plan.popular && !isFreeTrialFeatured && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Premium Badge - Only show if not overlapping */}
              {plan.premium && !isFreeTrialFeatured && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-black px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide shadow-lg">
                    Premium Features
                  </div>
                </div>
              )}

              {/* Current Plan Badge - For paid plans only */}
              {isCurrentPlan && !isFreeTrialFeatured && (
                <div className="absolute -top-4 right-6 z-10">
                  <div className="bg-[#00d083] text-black px-3 py-2 rounded-full text-sm font-bold uppercase shadow-lg">
                    Current
                  </div>
                </div>
              )}

              <CardHeader className="text-center pb-4 pt-12">
                {/* Plan Icon */}
                <div className={`mx-auto mb-4 w-12 h-12 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {plan.icon}
                </div>

                {/* Plan Name */}
                <CardTitle className="text-xl font-bold text-white mb-3">{plan.name}</CardTitle>

                {/* Pricing */}
                <div className="space-y-1 mb-4">
                  <div className="text-3xl font-bold text-white">
                    £{plan.price}
                    <span className="text-base text-gray-400 font-normal">/month</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    or £{plan.yearlyPrice}/year (Save £{plan.yearlyDiscount})
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-6 pb-6 flex flex-col h-full">
                {/* Free Trial to Paid Conversion */}
                {isFreeTrialFeatured && plan.id === 'featured' && (
                  <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg p-4 mb-4 cursor-pointer hover:bg-blue-500/20 transition-all duration-200" onClick={() => {/* Handle upgrade click */}}>
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <p className="text-blue-300 text-sm font-medium">
                        Upgrade from free to paid
                      </p>
                    </div>
                  </div>
                )}

                {/* Features */}
                <div className="space-y-2 flex-grow">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 group/feature">
                      <div className="w-4 h-4 rounded-full bg-[#00d083]/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/feature:bg-[#00d083]/40 transition-colors duration-200">
                        <svg className="w-2.5 h-2.5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-300 text-sm leading-relaxed group-hover/feature:text-white transition-colors duration-200">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <div className="pt-6 mt-auto">
                  {(isCurrentPlan && !isFreeTrialFeatured) || (isFreeTrialFeatured && plan.id === 'featured') ? (
                    <Button 
                      className="w-full bg-slate-600 hover:bg-slate-700 text-white cursor-not-allowed h-12 font-medium"
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => {
                        // TODO: Integrate with Stripe for plan upgrades
                        console.log(`Upgrading to ${plan.name} plan`)
                        // For now, redirect to settings
                        window.location.href = '/dashboard/settings'
                      }}
                      className={`w-full font-medium transition-all duration-200 hover:scale-[1.02] shadow-lg h-12 rounded-lg border-0 ${
                        plan.id === 'starter' ? 'bg-green-500 hover:bg-green-600 text-white hover:shadow-green-500/25' :
                        plan.id === 'featured' ? 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-blue-500/25' :
                        'bg-yellow-500 hover:bg-yellow-600 text-black hover:shadow-yellow-500/25'
                      }`}
                      style={{ 
                        background: plan.id === 'starter' ? '#10b981' : plan.id === 'featured' ? '#3b82f6' : '#eab308',
                        color: plan.id === 'spotlight' ? '#000' : '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      {isFreeTrialFeatured && plan.id === 'featured' ? 'Upgrade Plan' : 
                       isFreeTrialFeatured && plan.id !== 'featured' ? `Upgrade to ${plan.name}` : 
                       currentPlan === plan.id ? 'Current Plan' :
                       `Switch to ${plan.name}`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
