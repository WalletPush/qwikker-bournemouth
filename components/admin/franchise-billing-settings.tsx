'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FranchiseBillingConfig {
  city: string
  currency: string
  currency_symbol: string
  tax_rate: number
  tax_name: string
  stripe_account_id?: string
  stripe_publishable_key?: string
  stripe_onboarding_completed: boolean
  business_address?: string
  billing_email?: string
}

interface PricingTier {
  id: string
  tier_name: string
  tier_display_name: string
  monthly_price: number
  annual_price?: number
  setup_fee: number
  max_offers: number
  stripe_price_id_monthly?: string
  stripe_price_id_annual?: string
  is_active: boolean
}

interface FranchiseBillingSettingsProps {
  city: string
  initialConfig?: FranchiseBillingConfig
  initialPricingTiers?: PricingTier[]
}

export function FranchiseBillingSettings({ 
  city, 
  initialConfig, 
  initialPricingTiers = [] 
}: FranchiseBillingSettingsProps) {
  const [config, setConfig] = useState<FranchiseBillingConfig>(
    initialConfig || {
      city,
      currency: 'GBP',
      currency_symbol: '£',
      tax_rate: 0.20,
      tax_name: 'VAT',
      stripe_onboarding_completed: false
    }
  )
  
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(initialPricingTiers)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleConfigSave = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/billing/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, config })
      })
      
      if (response.ok) {
        setMessage('✅ Configuration saved successfully!')
      } else {
        setMessage('❌ Failed to save configuration')
      }
    } catch (error) {
      setMessage('❌ Error saving configuration')
    }
    setIsLoading(false)
  }

  const handleStripeConnect = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/billing/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city })
      })
      
      const data = await response.json()
      if (data.url) {
        window.open(data.url, '_blank')
        setMessage('🔗 Stripe Connect opened in new tab')
      }
    } catch (error) {
      setMessage('❌ Error connecting to Stripe')
    }
    setIsLoading(false)
  }

  const updatePricingTier = (index: number, field: string, value: any) => {
    const updated = [...pricingTiers]
    updated[index] = { ...updated[index], [field]: value }
    setPricingTiers(updated)
  }

  const savePricingTiers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/billing/pricing-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, pricingTiers })
      })
      
      if (response.ok) {
        setMessage('✅ Pricing tiers saved successfully!')
      } else {
        setMessage('❌ Failed to save pricing tiers')
      }
    } catch (error) {
      setMessage('❌ Error saving pricing tiers')
    }
    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {message && (
        <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
          <p className="text-sm text-slate-300">{message}</p>
        </div>
      )}

      {/* Currency & Tax Settings */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Currency & Tax Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Currency</Label>
              <select 
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                value={config.currency}
                onChange={(e) => {
                  const code = e.target.value
                  const symbolMap: Record<string, string> = {
                    GBP: '£', USD: '$', CAD: 'C$', EUR: '€', AUD: 'A$',
                    NZD: 'NZ$', CHF: 'CHF', JPY: '¥', CNY: '¥', HKD: 'HK$',
                    SGD: 'S$', INR: '₹', IDR: 'Rp', MYR: 'RM', THB: '฿',
                    PHP: '₱', VND: '₫', KRW: '₩', TWD: 'NT$', PKR: '₨',
                    BDT: '৳', LKR: 'Rs', NPR: 'Rs', AED: 'د.إ', SAR: '﷼',
                    QAR: 'QR', KWD: 'KD', BHD: 'BD', OMR: 'OMR', JOD: 'JD',
                    EGP: 'E£', ZAR: 'R', NGN: '₦', KES: 'KSh', GHS: 'GH₵',
                    TZS: 'TSh', UGX: 'USh', MAD: 'MAD', TND: 'DT',
                    BRL: 'R$', MXN: 'MX$', ARS: 'AR$', CLP: 'CL$', COP: 'COL$',
                    PEN: 'S/.', UYU: '$U', CRC: '₡', GTQ: 'Q', DOP: 'RD$',
                    SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł', CZK: 'Kč',
                    HUF: 'Ft', RON: 'lei', BGN: 'лв', HRK: 'kn', RSD: 'din',
                    TRY: '₺', RUB: '₽', UAH: '₴', GEL: '₾', ILS: '₪',
                    ISK: 'kr', ALL: 'L', MKD: 'ден', BAM: 'KM',
                    XOF: 'CFA', XAF: 'FCFA', XPF: 'F', FJD: 'FJ$',
                    PGK: 'K', WST: 'WS$', TOP: 'T$', MMK: 'K', KHR: '៛', LAK: '₭',
                  }
                  setConfig({ ...config, currency: code, currency_symbol: symbolMap[code] || code })
                }}
              >
                <optgroup label="Major Currencies">
                  <option value="GBP">GBP - British Pound (£)</option>
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="CAD">CAD - Canadian Dollar (C$)</option>
                  <option value="AUD">AUD - Australian Dollar (A$)</option>
                  <option value="NZD">NZD - New Zealand Dollar (NZ$)</option>
                  <option value="CHF">CHF - Swiss Franc (CHF)</option>
                  <option value="JPY">JPY - Japanese Yen (¥)</option>
                  <option value="CNY">CNY - Chinese Yuan (¥)</option>
                </optgroup>
                <optgroup label="Asia & Pacific">
                  <option value="HKD">HKD - Hong Kong Dollar (HK$)</option>
                  <option value="SGD">SGD - Singapore Dollar (S$)</option>
                  <option value="INR">INR - Indian Rupee (₹)</option>
                  <option value="IDR">IDR - Indonesian Rupiah (Rp)</option>
                  <option value="MYR">MYR - Malaysian Ringgit (RM)</option>
                  <option value="THB">THB - Thai Baht (฿)</option>
                  <option value="PHP">PHP - Philippine Peso (₱)</option>
                  <option value="VND">VND - Vietnamese Dong (₫)</option>
                  <option value="KRW">KRW - South Korean Won (₩)</option>
                  <option value="TWD">TWD - Taiwan Dollar (NT$)</option>
                  <option value="PKR">PKR - Pakistani Rupee (₨)</option>
                  <option value="BDT">BDT - Bangladeshi Taka (৳)</option>
                  <option value="LKR">LKR - Sri Lankan Rupee (Rs)</option>
                  <option value="NPR">NPR - Nepalese Rupee (Rs)</option>
                  <option value="MMK">MMK - Myanmar Kyat (K)</option>
                  <option value="KHR">KHR - Cambodian Riel (៛)</option>
                  <option value="LAK">LAK - Lao Kip (₭)</option>
                  <option value="FJD">FJD - Fijian Dollar (FJ$)</option>
                  <option value="PGK">PGK - Papua New Guinean Kina (K)</option>
                  <option value="WST">WST - Samoan Tala (WS$)</option>
                  <option value="TOP">TOP - Tongan Paanga (T$)</option>
                </optgroup>
                <optgroup label="Middle East">
                  <option value="AED">AED - UAE Dirham (د.إ)</option>
                  <option value="SAR">SAR - Saudi Riyal (﷼)</option>
                  <option value="QAR">QAR - Qatari Riyal (QR)</option>
                  <option value="KWD">KWD - Kuwaiti Dinar (KD)</option>
                  <option value="BHD">BHD - Bahraini Dinar (BD)</option>
                  <option value="OMR">OMR - Omani Rial (OMR)</option>
                  <option value="JOD">JOD - Jordanian Dinar (JD)</option>
                  <option value="ILS">ILS - Israeli Shekel (₪)</option>
                  <option value="EGP">EGP - Egyptian Pound (E£)</option>
                </optgroup>
                <optgroup label="Africa">
                  <option value="ZAR">ZAR - South African Rand (R)</option>
                  <option value="NGN">NGN - Nigerian Naira (₦)</option>
                  <option value="KES">KES - Kenyan Shilling (KSh)</option>
                  <option value="GHS">GHS - Ghanaian Cedi (GH₵)</option>
                  <option value="TZS">TZS - Tanzanian Shilling (TSh)</option>
                  <option value="UGX">UGX - Ugandan Shilling (USh)</option>
                  <option value="MAD">MAD - Moroccan Dirham (MAD)</option>
                  <option value="TND">TND - Tunisian Dinar (DT)</option>
                  <option value="XOF">XOF - West African CFA (CFA)</option>
                  <option value="XAF">XAF - Central African CFA (FCFA)</option>
                </optgroup>
                <optgroup label="Americas">
                  <option value="BRL">BRL - Brazilian Real (R$)</option>
                  <option value="MXN">MXN - Mexican Peso (MX$)</option>
                  <option value="ARS">ARS - Argentine Peso (AR$)</option>
                  <option value="CLP">CLP - Chilean Peso (CL$)</option>
                  <option value="COP">COP - Colombian Peso (COL$)</option>
                  <option value="PEN">PEN - Peruvian Sol (S/.)</option>
                  <option value="UYU">UYU - Uruguayan Peso ($U)</option>
                  <option value="CRC">CRC - Costa Rican Colón (₡)</option>
                  <option value="GTQ">GTQ - Guatemalan Quetzal (Q)</option>
                  <option value="DOP">DOP - Dominican Peso (RD$)</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="SEK">SEK - Swedish Krona (kr)</option>
                  <option value="NOK">NOK - Norwegian Krone (kr)</option>
                  <option value="DKK">DKK - Danish Krone (kr)</option>
                  <option value="PLN">PLN - Polish Zloty (zł)</option>
                  <option value="CZK">CZK - Czech Koruna (Kč)</option>
                  <option value="HUF">HUF - Hungarian Forint (Ft)</option>
                  <option value="RON">RON - Romanian Leu (lei)</option>
                  <option value="BGN">BGN - Bulgarian Lev (лв)</option>
                  <option value="HRK">HRK - Croatian Kuna (kn)</option>
                  <option value="RSD">RSD - Serbian Dinar (din)</option>
                  <option value="TRY">TRY - Turkish Lira (₺)</option>
                  <option value="RUB">RUB - Russian Ruble (₽)</option>
                  <option value="UAH">UAH - Ukrainian Hryvnia (₴)</option>
                  <option value="GEL">GEL - Georgian Lari (₾)</option>
                  <option value="ISK">ISK - Icelandic Króna (kr)</option>
                  <option value="ALL">ALL - Albanian Lek (L)</option>
                  <option value="MKD">MKD - Macedonian Denar (ден)</option>
                  <option value="BAM">BAM - Bosnian Mark (KM)</option>
                </optgroup>
              </select>
            </div>
            
            <div>
              <Label className="text-slate-300">Currency Symbol</Label>
              <Input
                value={config.currency_symbol}
                onChange={(e) => setConfig({...config, currency_symbol: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="£"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={config.tax_rate * 100}
                onChange={(e) => setConfig({...config, tax_rate: parseFloat(e.target.value) / 100})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="20"
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
          </div>

          <div>
            <Label className="text-slate-300">Business Address</Label>
            <Input
              value={config.business_address || ''}
              onChange={(e) => setConfig({...config, business_address: e.target.value})}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="123 Main Street, City, Country"
            />
          </div>

          <div>
            <Label className="text-slate-300">Billing Email</Label>
            <Input
              type="email"
              value={config.billing_email || ''}
              onChange={(e) => setConfig({...config, billing_email: e.target.value})}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="billing@yourfranchise.com"
            />
          </div>

          <Button 
            onClick={handleConfigSave} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardContent>
      </Card>

      {/* Stripe Integration */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Stripe Payment Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Stripe Connect Status</h3>
              <p className="text-sm text-slate-400">
                {config.stripe_onboarding_completed 
                  ? '✅ Connected and ready to accept payments'
                  : '⚠️ Not connected - payments will not work'
                }
              </p>
            </div>
            <Button 
              onClick={handleStripeConnect}
              disabled={isLoading}
              className={config.stripe_onboarding_completed 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-orange-600 hover:bg-orange-700'
              }
            >
              {config.stripe_onboarding_completed ? 'Manage Account' : 'Connect Stripe'}
            </Button>
          </div>

          {config.stripe_account_id && (
            <div>
              <Label className="text-slate-300">Stripe Account ID</Label>
              <Input
                value={config.stripe_account_id}
                readOnly
                className="bg-slate-700 border-slate-600 text-slate-400"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Pricing Tiers</CardTitle>
          <p className="text-sm text-slate-400">
            Set your local pricing in {config.currency}. These will be used for business subscriptions.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {pricingTiers.map((tier, index) => (
            <div key={tier.id} className="p-4 bg-slate-700 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">{tier.tier_display_name}</h3>
                <div className="flex items-center space-x-2">
                  <Label className="text-slate-300">Active</Label>
                  <input
                    type="checkbox"
                    checked={tier.is_active}
                    onChange={(e) => updatePricingTier(index, 'is_active', e.target.checked)}
                    className="rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">Monthly Price ({config.currency_symbol})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={tier.monthly_price}
                    onChange={(e) => updatePricingTier(index, 'monthly_price', parseFloat(e.target.value))}
                    className="bg-slate-600 border-slate-500 text-white"
                  />
                </div>
                
                <div>
                  <Label className="text-slate-300">Annual Price ({config.currency_symbol})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={tier.annual_price || ''}
                    onChange={(e) => updatePricingTier(index, 'annual_price', parseFloat(e.target.value) || null)}
                    className="bg-slate-600 border-slate-500 text-white"
                    placeholder="Optional"
                  />
                </div>
                
                <div>
                  <Label className="text-slate-300">Max Offers</Label>
                  <Input
                    type="number"
                    value={tier.max_offers}
                    onChange={(e) => updatePricingTier(index, 'max_offers', parseInt(e.target.value))}
                    className="bg-slate-600 border-slate-500 text-white"
                  />
                </div>
              </div>

              {tier.stripe_price_id_monthly && (
                <div className="text-xs text-slate-400">
                  Stripe Price ID: {tier.stripe_price_id_monthly}
                </div>
              )}
            </div>
          ))}

          <Button 
            onClick={savePricingTiers} 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Saving...' : 'Save Pricing Tiers'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
