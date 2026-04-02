'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useState, useEffect } from 'react'
import { getCityFromHostnameClient } from '@/lib/utils/client-city-detection'

interface PricingPlansProps {
  currentPlan?: string
  isFoundingMember?: boolean
  profile?: any
  businessId?: string
  isInFreeTrial?: boolean
  stripeSubscriptionId?: string | null
}

interface DynamicPricing {
  currency: string
  currency_symbol: string
  starter_price: number
  featured_price: number
  spotlight_price: number
  starter_yearly: number
  featured_yearly: number
  spotlight_yearly: number
  // Text fields from admin settings
  starter_title: string
  featured_title: string
  spotlight_title: string
  starter_subtitle: string
  featured_subtitle: string
  spotlight_subtitle: string
  starter_cta: string
  featured_cta: string
  spotlight_cta: string
  starter_features: string[]
  featured_features: string[]
  spotlight_features: string[]
  starter_popular: boolean
  featured_popular: boolean
  spotlight_popular: boolean
  founding_member_enabled: boolean
  founding_member_discount: number
  founding_member_title: string
  founding_member_description: string
}

function formatPrice(value: number, currency?: string): string {
  if (value === 0) return '0'
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'PYG', 'UGX', 'RWF', 'XOF', 'XAF', 'KHR', 'LAK', 'MMK']
  const isZeroDecimal = currency && zeroDecimalCurrencies.includes(currency.toUpperCase())
  if (isZeroDecimal || Number.isInteger(value)) {
    return Math.round(value).toLocaleString('en-US')
  }
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PricingPlans({ currentPlan = 'starter', isFoundingMember = false, profile, businessId, isInFreeTrial: isInFreeTrialProp = false, stripeSubscriptionId }: PricingPlansProps) {
  const [dynamicPricing, setDynamicPricing] = useState<DynamicPricing | null>(null)
  const [city, setCity] = useState<string>('bournemouth')
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [pendingChange, setPendingChange] = useState<{
    planId: string
    planName: string
    price: number
    currentPrice: number
    currentPlanName: string
    cycle: 'monthly' | 'annual'
    isUpgrade: boolean
  } | null>(null)
  const [successResult, setSuccessResult] = useState<{
    planName: string
    isUpgrade: boolean
  } | null>(null)

  useEffect(() => {
    // Detect city and fetch dynamic pricing
    const loadDynamicPricing = async () => {
      try {
        const detectedCity = getCityFromHostnameClient(window.location.hostname)
        setCity(detectedCity)
        
        // Fetch pricing from admin settings
        const response = await fetch(`/api/admin/pricing-cards?city=${detectedCity}`)
        console.log('🔍 Pricing API Response:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('🔍 Pricing Data:', data)
          
          if (data.success && data.config.pricing_cards) {
            const cards = data.config.pricing_cards
            const pricing = {
              currency: data.config.currency || 'GBP',
              currency_symbol: data.config.currency_symbol || '£',
              starter_price: cards.starter?.price || 29,
              featured_price: cards.featured?.price || 59,
              spotlight_price: cards.spotlight?.price || 89,
              starter_yearly: cards.starter?.annual_price || 290,
              featured_yearly: cards.featured?.annual_price || 590,
              spotlight_yearly: cards.spotlight?.annual_price || 890,
              // Include text fields from admin settings
              starter_title: cards.starter?.title || 'Starter',
              featured_title: cards.featured?.title || 'Featured',
              spotlight_title: cards.spotlight?.title || 'Spotlight',
              starter_subtitle: cards.starter?.subtitle || 'Get started',
              featured_subtitle: cards.featured?.subtitle || 'Most popular',
              spotlight_subtitle: cards.spotlight?.subtitle || 'Maximum visibility',
              starter_cta: cards.starter?.cta_text || 'Start Free Trial',
              featured_cta: cards.featured?.cta_text || 'Upgrade to Featured',
              spotlight_cta: cards.spotlight?.cta_text || 'Upgrade to Spotlight',
              starter_features: cards.starter?.features || [],
              featured_features: cards.featured?.features || [],
              spotlight_features: cards.spotlight?.features || [],
              starter_popular: cards.starter?.popular || false,
              featured_popular: cards.featured?.popular ?? true,
              spotlight_popular: cards.spotlight?.popular || false,
              founding_member_enabled: data.config.founding_member_enabled ?? true,
              founding_member_discount: data.config.founding_member_discount || 20,
              founding_member_title: data.config.founding_member_title || 'Founding Member Benefit',
              founding_member_description: data.config.founding_member_description || '20% off for life on 12-month plans if you upgrade to a paid plan before your trial expires. This discount locks in your rate permanently.'
            }
            console.log('🔍 Setting Dynamic Pricing:', pricing)
            setDynamicPricing(pricing)
          }
        } else {
          console.log('❌ Pricing API failed:', response.status)
          setDynamicPricing({
            currency: 'GBP',
            currency_symbol: '£',
            starter_price: 29,
            featured_price: 59,
            spotlight_price: 89,
            starter_yearly: 290,
            featured_yearly: 590,
            spotlight_yearly: 890,
            starter_title: 'Starter',
            featured_title: 'Featured',
            spotlight_title: 'Spotlight',
            starter_subtitle: 'Get started',
            featured_subtitle: 'Most popular',
            spotlight_subtitle: 'Maximum visibility',
            starter_cta: 'Start Free Trial',
            featured_cta: 'Upgrade to Featured',
            spotlight_cta: 'Upgrade to Spotlight',
            starter_features: ['Basic features', 'Email support'],
            featured_features: ['All Starter features', 'Priority support', 'Advanced analytics'],
            spotlight_features: ['All Featured features', 'White-label options', 'Custom integrations'],
            starter_popular: false,
            featured_popular: true,
            spotlight_popular: false,
            founding_member_enabled: true,
            founding_member_discount: 20,
            founding_member_title: 'Founding Member Offer',
            founding_member_description: '20% off yearly plans for life as a founding member. Choose an annual plan to lock in this rate permanently.'
          })
        }
      } catch (error) {
        console.log('❌ Pricing API error:', error)
        setDynamicPricing({
          currency: 'GBP',
          currency_symbol: '£',
          starter_price: 29,
          featured_price: 59,
          spotlight_price: 89,
          starter_yearly: 290,
          featured_yearly: 590,
          spotlight_yearly: 890,
          starter_title: 'Starter',
          featured_title: 'Featured',
          spotlight_title: 'Spotlight',
          starter_subtitle: 'Get started',
          featured_subtitle: 'Most popular',
          spotlight_subtitle: 'Maximum visibility',
          starter_cta: 'Start Free Trial',
          featured_cta: 'Upgrade to Featured',
          spotlight_cta: 'Upgrade to Spotlight',
          starter_features: ['Basic features', 'Email support'],
          featured_features: ['All Starter features', 'Priority support', 'Advanced analytics'],
          spotlight_features: ['All Featured features', 'White-label options', 'Custom integrations'],
          starter_popular: false,
          featured_popular: true,
          spotlight_popular: false,
          founding_member_enabled: true,
          founding_member_discount: 20,
          founding_member_title: 'Founding Member Offer',
          founding_member_description: '20% off yearly plans for life as a founding member. Choose an annual plan to lock in this rate permanently.'
        })
      }
    }
    
    loadDynamicPricing()
  }, [])
  const isInFreeTrial = isInFreeTrialProp
  const isClaimedFree = profile?.status === 'claimed_free'
  
  // Show founding member discount when admin has it enabled (visible to ALL businesses)
  const foundingMemberActive = dynamicPricing?.founding_member_enabled === true
  
  // Discount only applies to annual plans
  const showDiscountPricing = foundingMemberActive && billingCycle === 'annual'
  
  const discountMultiplier = dynamicPricing?.founding_member_discount != null 
    ? (100 - dynamicPricing.founding_member_discount) / 100 
    : 0.8

  const plans = [
    // Free Listing Card (always show for reference)
    {
      id: 'free',
      name: 'Free Listing',
      subtitle: 'Basic visibility',
      cta: currentPlan === 'free' ? 'Current Plan' : 'Included',
      price: 0,
      yearlyPrice: 0,
      yearlyDiscount: 0,
      icon: (
        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      features: [
        'Listed in Discover directory',
        'Basic business profile',
        'Update profile info',
        'Limited visibility',
        '❌ No AI chat visibility',
        '❌ No offers or events',
        '❌ No secret menu items',
        '❌ No analytics'
      ],
      isFree: true
    },
    {
      id: 'starter',
      name: dynamicPricing?.starter_title || 'Starter',
      subtitle: dynamicPricing?.starter_subtitle || 'Get started',
      cta: dynamicPricing?.starter_cta || 'Start Free Trial',
      price: dynamicPricing?.starter_price || 29,
      yearlyPrice: dynamicPricing?.starter_yearly || 290,
      yearlyDiscount: Math.round((dynamicPricing?.starter_yearly || 290) * discountMultiplier),
      popular: dynamicPricing?.starter_popular || false,
      icon: (
        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      features: dynamicPricing?.starter_features || [
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
      name: dynamicPricing?.featured_title || 'Featured',
      subtitle: dynamicPricing?.featured_subtitle || 'Most popular',
      cta: dynamicPricing?.featured_cta || 'Upgrade to Featured',
      price: dynamicPricing?.featured_price || 59,
      yearlyPrice: dynamicPricing?.featured_yearly || 590,
      yearlyDiscount: Math.round((dynamicPricing?.featured_yearly || 590) * discountMultiplier),
      popular: dynamicPricing?.featured_popular ?? true,
      icon: (
        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      features: dynamicPricing?.featured_features || [
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
      name: dynamicPricing?.spotlight_title || 'Spotlight',
      subtitle: dynamicPricing?.spotlight_subtitle || 'Maximum visibility',
      cta: dynamicPricing?.spotlight_cta || 'Upgrade to Spotlight',
      price: dynamicPricing?.spotlight_price || 89,
      yearlyPrice: dynamicPricing?.spotlight_yearly || 890,
      yearlyDiscount: Math.round((dynamicPricing?.spotlight_yearly || 890) * discountMultiplier),
      popular: dynamicPricing?.spotlight_popular || false,
      premium: true,
      icon: (
        <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      features: dynamicPricing?.spotlight_features || [
        'Everything in Featured, plus:',
        'White-label loyalty system',
        'Advanced AI insights',
        'Push notifications',
        'Analytics & QR stands',
        'Direct AI booking'
      ]
    }
  ]

  function handleUpgrade(planId: string) {
    if (!businessId) {
      setCheckoutError('Unable to identify your business. Please try again.')
      return
    }

    setCheckoutError(null)

    // For in-place updates (existing subscription), show confirmation dialog first
    if (stripeSubscriptionId) {
      const targetPlan = plans.find(p => p.id === planId)
      const currentPlanObj = plans.find(p => p.id === currentPlan)
      if (!targetPlan) return

      const tierOrder = ['free', 'starter', 'featured', 'spotlight']
      const isUpgrade = tierOrder.indexOf(planId) > tierOrder.indexOf(currentPlan)

      let price: number
      let curPrice: number
      if (billingCycle === 'annual') {
        price = showDiscountPricing ? targetPlan.yearlyDiscount : targetPlan.yearlyPrice
        curPrice = showDiscountPricing && currentPlanObj ? currentPlanObj.yearlyDiscount : (currentPlanObj?.yearlyPrice || 0)
      } else {
        price = targetPlan.price
        curPrice = currentPlanObj?.price || 0
      }

      setPendingChange({
        planId,
        planName: targetPlan.name,
        price,
        currentPrice: curPrice,
        currentPlanName: currentPlanObj?.name || currentPlan,
        cycle: billingCycle,
        isUpgrade,
      })
      return
    }

    // First-time purchases go to Stripe Checkout (has built-in confirmation)
    executeCheckout(planId)
  }

  async function confirmPlanChange() {
    if (!pendingChange || !businessId) return

    const { planId, planName, isUpgrade } = pendingChange
    setPendingChange(null)
    setCheckoutLoading(planId)

    try {
      const response = await fetch('/api/stripe/update-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          tierName: planId,
          billingCycle,
          applyFoundingDiscount: foundingMemberActive && billingCycle === 'annual',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setCheckoutError(data.error || 'Something went wrong. Please try again.')
        return
      }

      setSuccessResult({ planName, isUpgrade })
    } catch (err) {
      setCheckoutError('Failed to connect to payment service. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function executeCheckout(planId: string) {
    setCheckoutLoading(planId)

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          tierName: planId,
          billingCycle,
          applyFoundingDiscount: foundingMemberActive && billingCycle === 'annual',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setCheckoutError(data.error || 'Something went wrong. Please try again.')
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setCheckoutError('Failed to connect to payment service. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            billingCycle === 'monthly'
              ? 'bg-white text-slate-900 shadow-md'
              : 'bg-slate-700/50 text-slate-400 hover:text-white'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle('annual')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            billingCycle === 'annual'
              ? 'bg-white text-slate-900 shadow-md'
              : 'bg-slate-700/50 text-slate-400 hover:text-white'
          }`}
        >
          Annual
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            billingCycle === 'annual' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-green-500/20 text-green-400'
          }`}>
            {foundingMemberActive 
              ? `Save ${dynamicPricing?.founding_member_discount || 20}% + 2 months free`
              : '2 months free'}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
      {plans.map((plan) => {
        const isCurrentPlan = currentPlan === plan.id || (currentPlan === 'free' && profile?.status === 'claimed_free' && plan.id === 'free')
        const isFreeTrialFeatured = isInFreeTrial && plan.id === currentPlan
        const isFreeListingCard = plan.id === 'free'
        
        return (
          <Card 
            key={plan.id}
            className={`relative bg-slate-800/50 border transition-all duration-300 hover:scale-[1.02] flex flex-col ${
              isFreeListingCard ? 'border-slate-600 opacity-80' :
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
            ) : isCurrentPlan && isFreeListingCard ? (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-slate-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Current Plan
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
              {plan.subtitle && (
                <p className="text-sm text-gray-400 mt-1">{plan.subtitle}</p>
              )}
              <div className="mt-4">
                {/* Clean Pricing Display */}
                {isFreeListingCard ? (
                  <div className="text-3xl font-bold text-slate-400 mb-2">
                    Free
                    <span className="text-lg font-normal text-slate-500">/forever</span>
                  </div>
                ) : billingCycle === 'monthly' ? (
                  <div className="text-3xl font-bold text-white mb-2">
                    {dynamicPricing?.currency_symbol || '£'}{formatPrice(plan.price, dynamicPricing?.currency)}
                    <span className="text-lg font-normal text-gray-400">/month</span>
                  </div>
                ) : showDiscountPricing ? (
                  <>
                    <div className="text-3xl font-bold text-green-400 mb-1">
                      {dynamicPricing?.currency_symbol || '£'}{formatPrice(plan.yearlyDiscount, dynamicPricing?.currency)}
                      <span className="text-lg font-normal text-green-400/70">/year</span>
                    </div>
                    <div className="text-sm text-slate-500 line-through">
                      {dynamicPricing?.currency_symbol || '£'}{formatPrice(plan.yearlyPrice, dynamicPricing?.currency)}/year
                    </div>
                    <div className="text-xs text-green-300 mt-1">
                      {dynamicPricing?.founding_member_discount || 20}% founding member discount locked in forever
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-white mb-1">
                      {dynamicPricing?.currency_symbol || '£'}{formatPrice(plan.yearlyPrice, dynamicPricing?.currency)}
                      <span className="text-lg font-normal text-gray-400">/year</span>
                    </div>
                    <div className="text-xs text-blue-400 mt-1">2 months free vs monthly</div>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              {/* Clean Feature List */}
              <div className="space-y-3 flex-1 mb-6">
                {plan.features.map((feature, index) => {
                  const isNegativeFeature = feature.startsWith('❌')
                  const cleanFeature = isNegativeFeature ? feature.replace('❌ ', '') : feature
                  
                  return (
                    <div key={index} className="flex items-start gap-3">
                      {isNegativeFeature ? (
                        <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`text-sm leading-relaxed ${isNegativeFeature ? 'text-slate-400' : 'text-gray-300'}`}>
                        {cleanFeature}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Action Button */}
              <div className="mt-auto space-y-2">
                {checkoutError && checkoutLoading === null && plan.id !== 'free' && (
                  <p className="text-xs text-red-400 text-center">{checkoutError}</p>
                )}
                {isFreeListingCard ? (
                  <Button 
                    className="w-full bg-slate-600 hover:bg-slate-700 text-white cursor-not-allowed h-12 font-semibold rounded-lg"
                    disabled
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Free'}
                  </Button>
                ) : (isCurrentPlan && !isFreeTrialFeatured) ? (
                  <Button 
                    className="w-full bg-slate-600 hover:bg-slate-700 text-white cursor-not-allowed h-12 font-semibold rounded-lg"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : isFreeTrialFeatured ? (
                  <Button 
                    onClick={() => handleUpgrade('featured')}
                    disabled={checkoutLoading === 'featured'}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold h-12 rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
                  >
                    {checkoutLoading === 'featured' ? 'Redirecting to payment...' : 'Switch to Paid Plan'}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={checkoutLoading === plan.id}
                    className={`w-full font-semibold h-12 text-white rounded-lg shadow-lg transition-all duration-200 ${
                      plan.id === 'starter' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-green-500/25' :
                      plan.id === 'featured' ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/25' :
                      'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 hover:shadow-yellow-500/25'
                    }`}
                  >
                    {checkoutLoading === plan.id ? 'Processing...' : plan.cta}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
      </div>

      {/* Plan Change Confirmation Dialog */}
      <Dialog open={!!pendingChange} onOpenChange={(open) => { if (!open) setPendingChange(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700/80 text-white p-0 gap-0 overflow-hidden" style={{ width: '380px', maxWidth: '380px' }}>
          <div className="px-6 pt-6 pb-4">
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="text-[15px] font-semibold text-white">
                {pendingChange?.isUpgrade ? 'Confirm Upgrade' : 'Confirm Plan Change'}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-slate-400 leading-relaxed">
                This change takes effect straight away.
              </DialogDescription>
            </DialogHeader>
          </div>

          {pendingChange && (
            <div className="px-6 pb-4 space-y-4">
              <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-0.5">Current plan</p>
                    <p className="text-sm font-medium text-slate-300">{pendingChange.currentPlanName}</p>
                  </div>
                  <p className="text-sm text-slate-400">
                    {dynamicPricing?.currency_symbol || '£'}{formatPrice(pendingChange.currentPrice, dynamicPricing?.currency)}<span className="text-xs text-slate-500">/{pendingChange.cycle === 'annual' ? 'yr' : 'mo'}</span>
                  </p>
                </div>

                <div className="border-t border-slate-700/40" />

                <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-0.5">New plan</p>
                    <p className="text-sm font-semibold text-white">{pendingChange.planName}</p>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {dynamicPricing?.currency_symbol || '£'}{formatPrice(pendingChange.price, dynamicPricing?.currency)}<span className="text-xs font-normal text-slate-400">/{pendingChange.cycle === 'annual' ? 'yr' : 'mo'}</span>
                  </p>
                </div>
              </div>

              <p className="text-[12px] text-slate-500 leading-relaxed">
                {pendingChange.isUpgrade
                  ? "You'll only pay the difference for the time left on your current billing period."
                  : "You'll receive a credit for the remaining time on your current plan, applied to your next bill."}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/40 bg-slate-800/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPendingChange(null)}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmPlanChange}
              disabled={checkoutLoading !== null}
              className={`h-9 px-5 font-medium ${pendingChange?.isUpgrade
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {checkoutLoading ? 'Processing...' : pendingChange?.isUpgrade ? 'Confirm Upgrade' : 'Confirm Change'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan Change Success Dialog */}
      <Dialog open={!!successResult} onOpenChange={(open) => { if (!open) window.location.reload() }}>
        <DialogContent className="bg-slate-900 border-slate-700/80 text-white p-0 gap-0 overflow-hidden" style={{ width: '380px', maxWidth: '380px' }}>
          <div className="px-6 py-8 text-center space-y-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${
              successResult?.isUpgrade ? 'bg-green-500/15' : 'bg-blue-500/15'
            }`}>
              <svg className={`w-5 h-5 ${successResult?.isUpgrade ? 'text-green-400' : 'text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-white">
                {successResult?.isUpgrade ? 'Plan upgraded' : 'Plan changed'}
              </p>
              <p className="text-[13px] text-slate-400 mt-1.5 leading-relaxed">
                You&apos;re now on the <span className="text-white font-medium">{successResult?.planName}</span> plan.
                {successResult?.isUpgrade
                  ? ' Your new features are available immediately.'
                  : ' Your billing will update at the next cycle.'}
              </p>
            </div>
            <Button
              size="sm"
              className={`h-9 px-5 mt-2 ${
                successResult?.isUpgrade
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              onClick={() => window.location.reload()}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}