'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  founding_member_enabled: boolean
  founding_member_discount: number
  founding_member_title: string
  founding_member_description: string
}

interface PricingCardEditorProps {
  city: string
  initialConfig?: FranchiseConfig
}

export function PricingCardEditor({ city, initialConfig }: PricingCardEditorProps) {
  const [config, setConfig] = useState<FranchiseConfig | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedCard, setSelectedCard] = useState<'starter' | 'featured' | 'spotlight'>('starter')

  // Load real pricing data from database
  useEffect(() => {
    const loadPricingConfig = async () => {
      try {
        const response = await fetch(`/api/admin/pricing-cards?city=${city}`)
        const data = await response.json()
        
        if (data.success && data.config) {
          setConfig(data.config)
        } else {
          // Fallback to default if no data found
          setConfig({
            city,
            currency: 'GBP',
            currency_symbol: '£',
            tax_rate: 0.20,
            tax_name: 'VAT',
            founding_member_enabled: true,
            founding_member_discount: 20,
            founding_member_title: 'Founding Member Benefit',
            founding_member_description: '20% off for life on 12-month plans if you upgrade to a paid plan before your trial expires. This discount locks in your rate permanently.',
            pricing_cards: {
              starter: {
                title: 'Starter',
                subtitle: 'Perfect for new businesses',
                price: 29,
                annual_price: 290,
                features: [
                  'AI-powered discovery listings',
                  'Menu/service indexing', 
                  'Up to 3 active offers',
                  'Social media welcome',
                  'Limited Secret Menu Club',
                  'Dashboard with support'
                ],
                cta_text: 'Upgrade to Starter',
                popular: false,
                color_scheme: 'slate'
              },
              featured: {
                title: 'Featured',
                subtitle: 'Most popular choice',
                price: 59,
                annual_price: 590,
                features: [
                  'Everything in Starter, plus:',
                  'Priority AI placement',
                  'Advanced menu indexing',
                  'Up to 5 exclusive offers',
                  'Social media featuring',
                  'Full Secret Menu Club'
                ],
                cta_text: 'Upgrade to Featured',
                popular: true,
                color_scheme: 'blue'
              },
              spotlight: {
                title: 'Spotlight',
                subtitle: 'Maximum visibility',
                price: 89,
                annual_price: 890,
                features: [
                  'Everything in Featured, plus:',
                  'White-label loyalty system',
                  'Advanced AI insights',
                  'Push notifications',
                  'Analytics & QR stands',
                  'Direct AI booking'
                ],
                cta_text: 'Upgrade to Spotlight',
                popular: false,
                color_scheme: 'gold'
              }
            }
          })
        }
      } catch (error) {
        console.error('Error loading pricing config:', error)
        setMessage('❌ Error loading pricing configuration')
      } finally {
        setIsLoadingConfig(false)
      }
    }

    loadPricingConfig()
  }, [city])

  const updateCard = (tier: 'starter' | 'featured' | 'spotlight', field: string, value: any) => {
    if (!config) return
    
    setConfig(prev => prev ? ({
      ...prev,
      pricing_cards: {
        ...prev.pricing_cards,
        [tier]: {
          ...prev.pricing_cards[tier],
          [field]: value
        }
      }
    }) : null)
  }

  const updateFeature = (tier: 'starter' | 'featured' | 'spotlight', index: number, value: string) => {
    if (!config) return
    const updatedFeatures = [...config.pricing_cards[tier].features]
    updatedFeatures[index] = value
    updateCard(tier, 'features', updatedFeatures)
  }

  const addFeature = (tier: 'starter' | 'featured' | 'spotlight') => {
    if (!config) return
    const updatedFeatures = [...config.pricing_cards[tier].features, 'New Feature']
    updateCard(tier, 'features', updatedFeatures)
  }

  const removeFeature = (tier: 'starter' | 'featured' | 'spotlight', index: number) => {
    if (!config) return
    const updatedFeatures = config.pricing_cards[tier].features.filter((_, i) => i !== index)
    updateCard(tier, 'features', updatedFeatures)
  }

  const savePricingCards = async () => {
    setSaveStatus('saving')
    try {
      const response = await fetch('/api/admin/pricing-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, config })
      })
      
      if (response.ok) {
        setSaveStatus('saved')
        setMessage('✅ Pricing cards saved! Changes are now live on business dashboard.')
        
        // Reset to idle after 2 seconds
        setTimeout(() => {
          setSaveStatus('idle')
        }, 2000)
      } else {
        setSaveStatus('error')
        setMessage('❌ Failed to save pricing cards')
      }
    } catch (error) {
      setSaveStatus('error')
      setMessage('❌ Error saving pricing cards')
    }
  }

  const getCardColorClasses = (colorScheme: string, isPopular: boolean) => {
    const baseClasses = "relative overflow-hidden transition-colors duration-300"
    
    switch (colorScheme) {
      case 'blue':
        return `${baseClasses} bg-gradient-to-br from-blue-600 to-blue-800 border-blue-500 ${isPopular ? 'ring-2 ring-blue-400' : ''}`
      case 'gold':
        return `${baseClasses} bg-gradient-to-br from-yellow-600 to-yellow-800 border-yellow-500`
      default:
        return `${baseClasses} bg-slate-800 border-slate-700`
    }
  }

  const renderPricingCard = (tier: 'starter' | 'featured' | 'spotlight') => {
    const card = config.pricing_cards[tier]
    const isSelected = selectedCard === tier
    const showDiscountPricing = config.founding_member_enabled // Show discount if enabled
    const discountMultiplier = config.founding_member_discount ? (100 - config.founding_member_discount) / 100 : 0.8
    
    // Use the EXACT same styling as the business dashboard
    const planNames = { starter: 'Starter', featured: 'Featured', spotlight: 'Spotlight' }
    const planIcons = {
      starter: (
        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      featured: (
        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      spotlight: (
        <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    
    return (
      <div 
        key={tier}
        className={`cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
        onClick={() => setSelectedCard(tier)}
      >
        <Card className={`relative bg-slate-800/50 border transition-colors duration-300 flex flex-col ${
          tier === 'featured' ? 'border-blue-500/50' : 
          tier === 'spotlight' ? 'border-yellow-500/50' : 
          'border-slate-700'
        }`}>
          {/* Popular Badge - EXACTLY like business dashboard */}
          {tier === 'featured' && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
            </div>
          )}

          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              {planIcons[tier]}
            </div>
            <CardTitle className="text-xl font-bold text-white">{planNames[tier]}</CardTitle>
            <div className="mt-4">
              {/* EXACT pricing display from business dashboard */}
              <div className="text-3xl font-bold text-white mb-2">
                {config.currency_symbol}{card.price}
                <span className="text-lg font-normal text-gray-400">/month</span>
              </div>
              
              {/* Discount Pricing - EXACTLY like business dashboard */}
              {showDiscountPricing ? (
                <div className="text-center">
                  <div className="text-sm text-gray-400 line-through">
                    {config.currency_symbol}{card.annual_price}/year
                  </div>
                  <div className="text-base font-semibold text-green-400">
                    {config.currency_symbol}{Math.round(card.annual_price * discountMultiplier)}/year
                  </div>
                  <div className="text-xs text-green-300">
                    {config.founding_member_discount}% off 12-month plans
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  {config.currency_symbol}{card.annual_price}/year
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col">
            {/* EXACT feature list from business dashboard */}
            <div className="space-y-3 flex-1 mb-6">
              {card.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                </div>
              ))}
            </div>

            {/* EXACT button styling from business dashboard */}
            <div className="mt-auto">
              <Button className={`w-full font-semibold h-12 text-white rounded-lg shadow-lg transition-all duration-200 ${
                tier === 'starter' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-green-500/25' :
                tier === 'featured' ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/25' :
                'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 hover:shadow-yellow-500/25'
              }`}>
                {card.cta_text}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state while config is loading
  if (isLoadingConfig || !config) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading pricing configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {message && (
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
          <p className="text-sm text-slate-300">{message}</p>
        </div>
      )}

      {/* Currency Settings */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Currency & Tax Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
          <div>
            <Label className="text-slate-300">Currency</Label>
            <select 
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
              value={config.currency}
              onChange={(e) => {
                const currencySymbols: Record<string, string> = {
                  'GBP': '£', 'USD': '$', 'CAD': '$', 'EUR': '€', 'AUD': '$', 'NZD': '$',
                  'CHF': 'CHF', 'JPY': '¥', 'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr',
                  'PLN': 'zł', 'CZK': 'Kč', 'HUF': 'Ft', 'TRY': '₺', 'RUB': '₽',
                  'BRL': 'R$', 'MXN': '$', 'INR': '₹', 'CNY': '¥', 'KRW': '₩',
                  'SGD': '$', 'ZAR': 'R', 'ILS': '₪', 'AED': 'د.إ', 'SAR': '﷼'
                }
                
                setConfig({
                  ...config, 
                  currency: e.target.value,
                  currency_symbol: currencySymbols[e.target.value] || e.target.value
                })
              }}
            >
              <optgroup label="🇬🇧 UK & Europe">
                <option value="GBP">GBP - British Pound (£)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="CHF">CHF - Swiss Franc</option>
                <option value="SEK">SEK - Swedish Krona (kr)</option>
                <option value="NOK">NOK - Norwegian Krone (kr)</option>
                <option value="DKK">DKK - Danish Krone (kr)</option>
                <option value="PLN">PLN - Polish Złoty (zł)</option>
                <option value="CZK">CZK - Czech Koruna (Kč)</option>
                <option value="HUF">HUF - Hungarian Forint (Ft)</option>
                <option value="TRY">TRY - Turkish Lira (₺)</option>
                <option value="RUB">RUB - Russian Ruble (₽)</option>
              </optgroup>
              <optgroup label="🇺🇸 Americas">
                <option value="USD">USD - US Dollar ($)</option>
                <option value="CAD">CAD - Canadian Dollar ($)</option>
                <option value="BRL">BRL - Brazilian Real (R$)</option>
                <option value="MXN">MXN - Mexican Peso ($)</option>
              </optgroup>
              <optgroup label="🌏 Asia Pacific">
                <option value="AUD">AUD - Australian Dollar ($)</option>
                <option value="NZD">NZD - New Zealand Dollar ($)</option>
                <option value="JPY">JPY - Japanese Yen (¥)</option>
                <option value="CNY">CNY - Chinese Yuan (¥)</option>
                <option value="KRW">KRW - South Korean Won (₩)</option>
                <option value="INR">INR - Indian Rupee (₹)</option>
                <option value="SGD">SGD - Singapore Dollar ($)</option>
              </optgroup>
              <optgroup label="🌍 Other">
                <option value="ZAR">ZAR - South African Rand (R)</option>
                <option value="ILS">ILS - Israeli Shekel (₪)</option>
                <option value="AED">AED - UAE Dirham (د.إ)</option>
                <option value="SAR">SAR - Saudi Riyal (﷼)</option>
              </optgroup>
            </select>
          </div>
          
          <div>
            <Label className="text-slate-300">Symbol</Label>
            <Input
              value={config.currency_symbol}
              onChange={(e) => setConfig({...config, currency_symbol: e.target.value})}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          
          <div>
            <Label className="text-slate-300">Tax Rate (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={(config.tax_rate * 100) || ''}
              onChange={(e) => setConfig({...config, tax_rate: (parseFloat(e.target.value) || 0) / 100})}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          
          <div>
            <Label className="text-slate-300">Tax Name</Label>
            <Input
              value={config.tax_name}
              onChange={(e) => setConfig({...config, tax_name: e.target.value})}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="VAT"
            />
          </div>
        </CardContent>
      </Card>

      {/* Founding Member Benefit Settings */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Founding Member Benefit</CardTitle>
          <p className="text-sm text-slate-400">
            Control the promotional banner that appears above pricing cards
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.founding_member_enabled}
              onChange={(e) => setConfig({...config, founding_member_enabled: e.target.checked})}
              className="rounded"
            />
            <Label className="text-slate-300">Enable Founding Member Benefit Banner</Label>
          </div>

          {config.founding_member_enabled && (
            <>
              <div>
                <Label className="text-slate-300">Banner Title</Label>
                <Input
                  value={config.founding_member_title}
                  onChange={(e) => setConfig({...config, founding_member_title: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Founding Member Benefit"
                />
              </div>

              <div>
                <Label className="text-slate-300">Discount Percentage (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={config.founding_member_discount || ''}
                  onChange={(e) => setConfig({...config, founding_member_discount: parseInt(e.target.value) || 0})}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="20"
                />
              </div>

              <div>
                <Label className="text-slate-300">Banner Description</Label>
                <textarea
                  value={config.founding_member_description}
                  onChange={(e) => setConfig({...config, founding_member_description: e.target.value})}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white min-h-[80px]"
                  placeholder="20% off for life on 12-month plans if you upgrade to a paid plan before your trial expires. This discount locks in your rate permanently."
                />
              </div>

              {/* Preview of the banner */}
              <div className="mt-4">
                <Label className="text-slate-300 mb-2 block">Banner Preview:</Label>
                <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-400">🌟</span>
                    <span className="font-semibold text-yellow-400">{config.founding_member_title}</span>
                  </div>
                  <p className="text-sm text-slate-300">
                    {config.founding_member_description.replace(/\d+%/, `${config.founding_member_discount}%`)}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Live Preview */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Live Preview - Click to Edit</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {renderPricingCard('starter')}
          {renderPricingCard('featured')}
          {renderPricingCard('spotlight')}
        </div>
      </div>

      {/* Editor Panel */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">
            Editing: {config.pricing_cards[selectedCard].title}
            <Badge className="ml-2" variant="secondary">{selectedCard}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Plan Name (Fixed)</Label>
              <Input
                value={selectedCard.charAt(0).toUpperCase() + selectedCard.slice(1)}
                disabled
                className="bg-slate-600 border-slate-500 text-slate-400 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">Plan names cannot be changed</p>
            </div>
            
            <div>
              <Label className="text-slate-300">Subtitle</Label>
              <Input
                value={config.pricing_cards[selectedCard].subtitle}
                onChange={(e) => updateCard(selectedCard, 'subtitle', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-slate-300">Monthly Price</Label>
              <Input
                type="number"
                step="0.01"
                value={config.pricing_cards[selectedCard].price || ''}
                onChange={(e) => updateCard(selectedCard, 'price', parseFloat(e.target.value) || 0)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <Label className="text-slate-300">Annual Price</Label>
              <Input
                type="number"
                step="0.01"
                value={config.pricing_cards[selectedCard].annual_price || ''}
                onChange={(e) => updateCard(selectedCard, 'annual_price', parseFloat(e.target.value) || 0)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <Label className="text-slate-300">CTA Button Text</Label>
              <Input
                value={config.pricing_cards[selectedCard].cta_text}
                onChange={(e) => updateCard(selectedCard, 'cta_text', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Color Scheme</Label>
              <select 
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                value={config.pricing_cards[selectedCard].color_scheme}
                onChange={(e) => updateCard(selectedCard, 'color_scheme', e.target.value)}
              >
                <option value="slate">Slate (Default)</option>
                <option value="blue">Blue (Popular)</option>
                <option value="gold">Gold (Premium)</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.pricing_cards[selectedCard].popular}
                onChange={(e) => updateCard(selectedCard, 'popular', e.target.checked)}
                className="rounded"
              />
              <Label className="text-slate-300">Mark as Popular</Label>
            </div>
          </div>

          {/* Features Editor */}
          <div>
            <Label className="text-slate-300">Features</Label>
            <div className="space-y-2">
              {config.pricing_cards[selectedCard].features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={feature}
                    onChange={(e) => updateFeature(selectedCard, index, e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white flex-1"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeFeature(selectedCard, index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addFeature(selectedCard)}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                Add Feature
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={savePricingCards}
          disabled={saveStatus === 'saving'}
          className={`px-8 py-2 text-white transition-colors ${
            saveStatus === 'saved' 
              ? 'bg-green-500 hover:bg-green-600' 
              : saveStatus === 'error'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {saveStatus === 'saving' && '⏳ Saving...'}
          {saveStatus === 'saved' && '✅ Saved!'}
          {saveStatus === 'error' && '❌ Error'}
          {saveStatus === 'idle' && 'Save & Deploy Pricing Cards'}
        </Button>
      </div>
    </div>
  )
}
