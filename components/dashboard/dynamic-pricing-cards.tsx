'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PricingCard {
  title: string
  subtitle: string
  price: number
  annual_price: number
  features: string[]
  cta_text: string
  popular: boolean
  color_scheme: 'slate' | 'blue' | 'gold'
}

interface PricingCards {
  starter: PricingCard
  featured: PricingCard
  spotlight: PricingCard
}

interface FranchiseConfig {
  city: string
  currency: string
  currency_symbol: string
  tax_rate: number
  tax_name: string
  pricing_cards: PricingCards
}

interface DynamicPricingCardsProps {
  city: string
  currentPlan?: 'starter' | 'featured' | 'spotlight'
  onPlanSelect?: (plan: 'starter' | 'featured' | 'spotlight') => void
}

export function DynamicPricingCards({ 
  city, 
  currentPlan,
  onPlanSelect 
}: DynamicPricingCardsProps) {
  const [config, setConfig] = useState<FranchiseConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnnual, setIsAnnual] = useState(false)

  useEffect(() => {
    const fetchPricingConfig = async () => {
      try {
        const response = await fetch(`/api/admin/pricing-cards?city=${city}`)
        const data = await response.json()
        
        if (data.success) {
          setConfig(data.config)
        }
      } catch (error) {
        console.error('❌ Error fetching pricing config:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPricingConfig()
  }, [city])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-slate-800 border-slate-700 animate-pulse">
            <CardHeader className="h-32 bg-slate-700 rounded-t-lg"></CardHeader>
            <CardContent className="h-48 bg-slate-800"></CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!config) {
    return (
      <div className="text-center text-slate-400 py-8">
        <p>Unable to load pricing information for {city}</p>
      </div>
    )
  }

  const getCardColorClasses = (colorScheme: string, isPopular: boolean, isCurrent: boolean) => {
    const baseClasses = "relative overflow-hidden transition-all duration-300 hover:scale-105"
    
    if (isCurrent) {
      return `${baseClasses} bg-gradient-to-br from-green-600 to-green-800 border-green-500 ring-2 ring-green-400`
    }
    
    switch (colorScheme) {
      case 'blue':
        return `${baseClasses} bg-gradient-to-br from-blue-600 to-blue-800 border-blue-500 ${isPopular ? 'ring-2 ring-blue-400' : ''}`
      case 'gold':
        return `${baseClasses} bg-gradient-to-br from-yellow-600 to-yellow-800 border-yellow-500`
      default:
        return `${baseClasses} bg-slate-800 border-slate-700`
    }
  }

  const formatPrice = (price: number) => {
    return `${config.currency_symbol}${price.toFixed(2)}`
  }

  const calculateTax = (price: number) => {
    return price * config.tax_rate
  }

  const renderPricingCard = (tier: 'starter' | 'featured' | 'spotlight') => {
    const card = config.pricing_cards[tier]
    const isCurrent = currentPlan === tier
    const displayPrice = isAnnual ? card.annual_price : card.price
    const taxAmount = calculateTax(displayPrice)
    const totalPrice = displayPrice + taxAmount
    
    return (
      <Card 
        key={tier}
        className={getCardColorClasses(card.color_scheme, card.popular, isCurrent)}
      >
        {card.popular && !isCurrent && (
          <div className="absolute top-0 right-0 bg-white text-blue-600 px-3 py-1 text-xs font-bold rounded-bl-lg">
            POPULAR
          </div>
        )}
        
        {isCurrent && (
          <div className="absolute top-0 right-0 bg-white text-green-600 px-3 py-1 text-xs font-bold rounded-bl-lg">
            CURRENT PLAN
          </div>
        )}
        
        <CardHeader className="text-center text-white">
          <CardTitle className="text-xl font-bold">{card.title}</CardTitle>
          <p className="text-sm opacity-90">{card.subtitle}</p>
          
          <div className="mt-4">
            <span className="text-3xl font-bold">{formatPrice(displayPrice)}</span>
            <span className="text-sm opacity-75">/{isAnnual ? 'year' : 'month'}</span>
          </div>
          
          {/* Tax Information */}
          <div className="text-xs opacity-75 space-y-1">
            <p>+ {formatPrice(taxAmount)} {config.tax_name}</p>
            <p className="font-semibold">Total: {formatPrice(totalPrice)}</p>
          </div>
          
          {/* Annual Savings */}
          {!isAnnual && card.annual_price && (
            <p className="text-xs opacity-75">
              Save {Math.round((1 - (card.annual_price / (card.price * 12))) * 100)}% with annual billing
            </p>
          )}
        </CardHeader>
        
        <CardContent className="text-white">
          <ul className="space-y-2 mb-6">
            {card.features.map((feature, index) => (
              <li key={index} className="flex items-center text-sm">
                <span className="w-2 h-2 bg-white rounded-full mr-3 flex-shrink-0"></span>
                {feature}
              </li>
            ))}
          </ul>
          
          <Button 
            className={`w-full font-semibold ${
              isCurrent 
                ? 'bg-white text-green-600 hover:bg-gray-100 cursor-default' 
                : 'bg-white text-slate-900 hover:bg-gray-100'
            }`}
            onClick={() => !isCurrent && onPlanSelect?.(tier)}
            disabled={isCurrent}
          >
            {isCurrent ? 'Current Plan' : card.cta_text}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            className={`px-4 py-2 rounded text-sm font-medium transition-all ${
              !isAnnual 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setIsAnnual(false)}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 rounded text-sm font-medium transition-all ${
              isAnnual 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setIsAnnual(true)}
          >
            Annual
            <Badge className="ml-2 bg-green-600 text-white text-xs">Save up to 17%</Badge>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderPricingCard('starter')}
        {renderPricingCard('featured')}
        {renderPricingCard('spotlight')}
      </div>

      {/* City-Specific Footer */}
      <div className="text-center text-slate-400 text-sm">
        <p>Pricing for {config.city.charAt(0).toUpperCase() + config.city.slice(1)} • All prices in {config.currency}</p>
        <p>Platform fee: {(config.platform_fee_percentage * 100).toFixed(1)}% • {config.tax_name}: {(config.tax_rate * 100).toFixed(1)}%</p>
      </div>
    </div>
  )
}
