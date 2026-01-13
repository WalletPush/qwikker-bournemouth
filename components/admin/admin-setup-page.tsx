'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface FranchiseConfig {
  // Basic Info
  city: string
  display_name: string
  subdomain: string
  owner_name: string
  owner_email: string
  owner_phone: string
  contact_address: string
  timezone: string
  status: string

  // Franchise-Paid API Services
  resend_api_key?: string | null // Masked when returned from API
  resend_from_email?: string
  resend_from_name?: string
  openai_api_key?: string | null // Masked
  anthropic_api_key?: string | null // Masked
  google_places_api_key?: string | null // Masked
  
  // "has_*" flags indicate if a secret is configured (without exposing value)
  has_resend_api_key?: boolean
  has_openai_api_key?: boolean
  has_anthropic_api_key?: boolean
  has_google_places_api_key?: boolean
  
  // CRM Integration (GHL)
  ghl_webhook_url: string | null // Masked
  ghl_update_webhook_url: string | null // Masked
  ghl_api_key: string | null // Masked
  has_ghl_webhook_url?: boolean
  has_ghl_update_webhook_url?: boolean
  has_ghl_api_key?: boolean
  
  // Mobile Wallet (WalletPush)
  walletpush_api_key: string | null // Masked
  walletpush_template_id: string
  walletpush_endpoint_url: string
  has_walletpush_api_key?: boolean
  
  // Notifications (Slack)
  slack_webhook_url: string | null // Masked
  slack_channel: string
  has_slack_webhook_url?: boolean
  
  // Payment Processing (Stripe)
  stripe_account_id: string
  stripe_publishable_key: string // Safe (publishable)
  stripe_webhook_secret: string | null // Masked
  stripe_onboarding_completed: boolean
  has_stripe_webhook_secret?: boolean
  
  // Legal & Billing
  business_registration: string
  business_address: string
  billing_email: string
  
  // SMS Notifications (Twilio)
  sms_enabled?: boolean
  sms_provider?: string
  sms_verified?: boolean
  sms_test_mode?: boolean
  sms_country_code?: string | null
  sms_default_calling_code?: string | null
  sms_last_verified_at?: string | null
  sms_last_error?: string | null
  twilio_account_sid?: string | null
  twilio_auth_token?: string | null
  twilio_messaging_service_sid?: string | null
  twilio_from_number?: string | null
  has_twilio_account_sid?: boolean
  has_twilio_auth_token?: boolean
  has_twilio_messaging_service_sid?: boolean
  has_twilio_from_number?: boolean
}

interface AdminSetupPageProps {
  city: string
}

export function AdminSetupPage({ city }: AdminSetupPageProps) {
  const [config, setConfig] = useState<FranchiseConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [activeStep, setActiveStep] = useState(1)
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  
  // State for showing/hiding API keys
  const [showKeys, setShowKeys] = useState({
    resend: false,
    openai: false,
    anthropic: false,
    googlePlaces: false,
    ghl: false,
    walletpush: false,
    stripe_publishable: false,
    stripe_secret: false
  })
  
  // Stripe Connect state
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [stripeMessage, setStripeMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  
  // Check URL params for Stripe callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stripeSuccess = params.get('stripe_success')
    const stripeError = params.get('stripe_error')
    
    if (stripeSuccess) {
      setStripeMessage({ type: 'success', text: 'Stripe account connected successfully!' })
      window.history.replaceState({}, '', window.location.pathname)
    } else if (stripeError) {
      setStripeMessage({ type: 'error', text: decodeURIComponent(stripeError) })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch(`/api/admin/setup?city=${city}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.config) {
            setConfig(data.config)
          }
        } else {
          // Auto-populate smart defaults
          const getDefaultsForCity = (cityName: string) => {
            const cityLower = cityName.toLowerCase()
            const timezoneMap: Record<string, string> = {
              'bournemouth': 'Europe/London',
              'london': 'Europe/London',
              'calgary': 'America/Edmonton',
              'vancouver': 'America/Vancouver',
              'toronto': 'America/Toronto',
              'sydney': 'Australia/Sydney',
              'melbourne': 'Australia/Melbourne'
            }
            return { timezone: timezoneMap[cityLower] || 'Europe/London' }
          }
          
          const cityDefaults = getDefaultsForCity(city)
          
          setConfig({
            city,
            display_name: `${city.charAt(0).toUpperCase() + city.slice(1)} Qwikker`,
            subdomain: city.toLowerCase(),
            owner_name: '',
            owner_email: `owner@${city.toLowerCase()}.qwikker.com`,
            owner_phone: '',
            contact_address: '',
            timezone: cityDefaults.timezone,
            status: 'pending_setup',
            
            // Franchise-Paid Services
            resend_api_key: '',
            resend_from_email: `no-reply@${city.toLowerCase()}.qwikker.com`,
            resend_from_name: `QWIKKER ${city.charAt(0).toUpperCase() + city.slice(1)}`,
            openai_api_key: '',
            anthropic_api_key: '',
            
            // CRM
            ghl_webhook_url: `https://services.leadconnectorhq.com/hooks/${city.toLowerCase()}/qwikker`,
            ghl_update_webhook_url: `https://services.leadconnectorhq.com/hooks/${city.toLowerCase()}/qwikker-updates`,
            ghl_api_key: '',
            
            // Wallet
            walletpush_api_key: '',
            walletpush_template_id: '',
            walletpush_endpoint_url: `https://app.walletpush.io/api/hl-${city.toLowerCase()}`,
            
            // Notifications
            slack_webhook_url: '',
            slack_channel: `#qwikker-${city.toLowerCase()}`,
            
            // Payments
            stripe_account_id: '',
            stripe_publishable_key: '',
            stripe_webhook_secret: '',
            stripe_onboarding_completed: false,
            
            // Legal
            business_registration: '',
            business_address: '',
            billing_email: `billing@${city.toLowerCase()}.qwikker.com`,
            
            // SMS Notifications (disabled by default)
            sms_enabled: false,
            sms_provider: 'none',
            sms_verified: false,
            sms_test_mode: false,
            sms_country_code: null,
            sms_default_calling_code: null,
            sms_last_verified_at: null,
            sms_last_error: null,
            twilio_account_sid: null,
            twilio_auth_token: null,
            twilio_messaging_service_sid: null,
            twilio_from_number: null
          })
        }
      } catch (error) {
        console.error('Error loading config:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadConfig()
  }, [city])

  const saveConfig = async () => {
    if (!config) return
    
    setSaveStatus('saving')
    setMessage('')

    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, config })
      })
      
      if (response.ok) {
        setSaveStatus('saved')
        setMessage('🎉 Configuration saved successfully!')
        
        setTimeout(() => {
          setSaveStatus('idle')
          setMessage('')
        }, 3000)
      } else {
        setSaveStatus('error')
        setMessage('❌ Failed to save configuration')
      }
    } catch (error) {
      setSaveStatus('error')
      setMessage('❌ Error saving configuration')
    }
  }

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('❌ New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setMessage('❌ Password must be at least 8 characters')
      return
    }

    setPasswordStatus('saving')
    setMessage('')

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })
      
      if (response.ok) {
        setPasswordStatus('saved')
        setMessage('✅ Password changed successfully!')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        
        setTimeout(() => {
          setPasswordStatus('idle')
          setMessage('')
        }, 3000)
      } else {
        const data = await response.json()
        setPasswordStatus('error')
        setMessage(`❌ ${data.error || 'Failed to change password'}`)
      }
    } catch (error) {
      setPasswordStatus('error')
      setMessage('❌ Error changing password')
    }
  }

  const steps = [
    { id: 1, name: 'Admin Account', icon: '1', color: 'from-blue-500 to-blue-600' },
    { id: 2, name: 'Franchise Details', icon: '2', color: 'from-purple-500 to-purple-600' },
    { id: 3, name: 'Your API Services', icon: '3', color: 'from-orange-500 to-orange-600' },
    { id: 4, name: 'Integrations', icon: '4', color: 'from-green-500 to-green-600' },
    { id: 5, name: 'Save & Launch', icon: '5', color: 'from-[#00d083] to-[#00b86f]' },
  ]

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00d083] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading franchise setup...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-medium text-white">
            {config.display_name} Configuration
          </h1>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${config.status === 'active' ? 'bg-[#00D083]' : 'bg-slate-500'}`} />
            <span className="text-sm text-slate-400">{config.status || 'setup'}</span>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          API services, integrations, and platform configuration
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-10 pb-6 border-b border-slate-800">
        {steps.map((step, index) => {
          const isActive = activeStep === step.id
          const isComplete = activeStep > step.id
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => setActiveStep(step.id)}
                className="flex items-center gap-3 w-full group"
              >
                <div className={`
                  flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium transition-colors
                  ${isComplete 
                    ? 'bg-[#00D083] text-white' 
                    : isActive 
                      ? 'bg-slate-700 text-white ring-2 ring-slate-600'
                      : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'
                  }
                `}>
                  {isComplete ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className={`text-xs font-medium truncate transition-colors ${
                    isActive ? 'text-white' : isComplete ? 'text-slate-400' : 'text-slate-500 group-hover:text-slate-400'
                  }`}>
                    {step.name}
                  </div>
                </div>
              </button>
              {index < steps.length - 1 && (
                <div className={`h-px w-full mx-2 transition-colors ${
                  isComplete ? 'bg-[#00D083]' : 'bg-slate-800'
                }`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Status Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl border-2 backdrop-blur-sm ${
          message.includes('successfully') || message.includes('✅') || message.includes('🎉')
            ? 'bg-green-900/30 border-green-500/50 text-green-300' 
            : 'bg-red-900/30 border-red-500/50 text-red-300'
        }`}>
          <p className="text-center font-medium">{message}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="space-y-6">
        {/* STEP 1: Admin Account */}
        {activeStep === 1 && (
          <Card className="bg-slate-800/50 border border-slate-700">
            <CardHeader>
              <div className="mb-6">
                <CardTitle className="text-white text-lg font-medium mb-1">Admin Account</CardTitle>
                <p className="text-slate-400 text-sm">Your personal admin login credentials</p>
              </div>
              
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-slate-300 text-sm">
                    Use a strong, unique password and keep your email secure for system notifications.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-slate-300 font-semibold mb-2 block">Owner Name *</Label>
                  <Input
                    value={config.owner_name || ''}
                    onChange={(e) => setConfig({...config, owner_name: e.target.value})}
                    className="bg-slate-700/80 border-slate-600 text-white h-12 rounded-xl"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 font-semibold mb-2 block">Owner Email *</Label>
                  <Input
                    type="email"
                    value={config.owner_email || ''}
                    onChange={(e) => setConfig({...config, owner_email: e.target.value})}
                    className="bg-slate-700/80 border-slate-600 text-white h-12 rounded-xl"
                    placeholder="john@bournemouth.qwikker.com"
                  />
                </div>
              </div>

              {/* Password Change Section */}
              <div className="border-t-2 border-slate-700/50 pt-6 mt-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Change Password
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-300 text-sm mb-2 block">Current Password</Label>
                    <Input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className="bg-slate-700/80 border-slate-600 text-white h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm mb-2 block">New Password</Label>
                    <Input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className="bg-slate-700/80 border-slate-600 text-white h-12 rounded-xl"
                      placeholder="Min 8 characters"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm mb-2 block">Confirm New Password</Label>
                    <Input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className="bg-slate-700/80 border-slate-600 text-white h-12 rounded-xl"
                    />
                  </div>
                </div>
                <Button
                  onClick={changePassword}
                  disabled={passwordStatus === 'saving' || !passwordData.currentPassword || !passwordData.newPassword}
                  className={`mt-4 px-6 py-3 rounded-xl font-bold transition-all ${
                    passwordStatus === 'saved' 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : passwordStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {passwordStatus === 'saving' && 'Changing...'}
                  {passwordStatus === 'saved' && 'Changed!'}
                  {passwordStatus === 'error' && 'Error'}
                  {passwordStatus === 'idle' && 'Change Password'}
                </Button>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setActiveStep(2)}
                  className="bg-[#00D083] hover:bg-[#00b86f] text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
                  Continue
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Franchise Details */}
        {activeStep === 2 && (
          <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-purple-500/50 shadow-2xl backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-white text-2xl">Franchise Details</CardTitle>
                  <p className="text-slate-400 text-sm mt-1">Tell us about your local Qwikker franchise</p>
                </div>
              </div>
              
              <div className="bg-purple-900/30 border-2 border-purple-500/30 rounded-xl p-4 mt-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-purple-300 text-sm font-semibold mb-1">Why This Matters</p>
                    <p className="text-purple-200 text-sm">
                      This information appears on your franchise website, in customer communications, and helps businesses find you. Make it accurate and professional!
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-slate-300 font-semibold mb-2 block">Display Name *</Label>
                  <Input
                    value={config.display_name || ''}
                    disabled
                    className="bg-slate-700/50 border-slate-600/50 text-slate-400 h-12 rounded-xl cursor-not-allowed"
                    placeholder="Bournemouth Qwikker"
                  />
                  <p className="text-xs text-slate-500 mt-1">🔒 Set during franchise creation (cannot be changed)</p>
                </div>
                <div>
                  <Label className="text-slate-300 font-semibold mb-2 block">Subdomain *</Label>
                  <Input
                    value={config.subdomain || ''}
                    disabled
                    className="bg-slate-700/50 border-slate-600/50 text-slate-400 h-12 rounded-xl cursor-not-allowed"
                    placeholder="bournemouth"
                  />
                  <p className="text-xs text-slate-500 mt-1">🔒 Your URL: <span className="text-slate-400">{config.subdomain}.qwikker.com</span></p>
                </div>
                <div>
                  <Label className="text-slate-300 font-semibold mb-2 block">Owner Phone</Label>
                  <Input
                    value={config.owner_phone || ''}
                    onChange={(e) => setConfig({...config, owner_phone: e.target.value})}
                    className="bg-slate-700/80 border-slate-600 text-white h-12 rounded-xl"
                    placeholder="+44 1234 567890"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 font-semibold mb-2 block">Timezone *</Label>
                  <select 
                    className="w-full h-12 px-4 bg-slate-700/80 border border-slate-600 rounded-xl text-white"
                    value={config.timezone || ''}
                    onChange={(e) => setConfig({...config, timezone: e.target.value})}
                  >
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="America/Toronto">America/Toronto (EST/EDT)</option>
                    <option value="America/Vancouver">America/Vancouver (PST/PDT)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                    <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-slate-300 font-semibold mb-2 block">Contact Address</Label>
                <Textarea
                  value={config.contact_address || ''}
                  onChange={(e) => setConfig({...config, contact_address: e.target.value})}
                  className="bg-slate-700/80 border-slate-600 text-white rounded-xl"
                  placeholder="123 High Street, Bournemouth, BH1 2AB"
                  rows={3}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  onClick={() => setActiveStep(1)}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 px-6 py-3 rounded-xl font-bold"
                >
                  ← Back
                </Button>
                <button
                  onClick={() => setActiveStep(3)}
                  className="bg-[#00D083] hover:bg-[#00b86f] text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
                  Continue
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Franchise-Paid API Services */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-orange-500/50 shadow-2xl backdrop-blur-sm">
              <CardHeader>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-white text-2xl">Your API Services</CardTitle>
                  <p className="text-slate-400 text-sm mt-1">Configure the services YOU manage and pay for</p>
                </div>
              </div>
                
                <div className="bg-orange-900/30 border-2 border-orange-500/30 rounded-xl p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  <div>
                    <p className="text-orange-300 text-sm font-semibold mb-1">Franchise Owner Responsibility</p>
                    <p className="text-orange-200 text-sm">
                      These services are <span className="font-bold">paid for and managed by YOU</span>, the franchise owner. Qwikker HQ only covers hosting and the database. 
                      This keeps your operating costs transparent and gives you full control!
                    </p>
                  </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                
                {/* Resend (Email) */}
                <div className="border-2 border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-colors bg-slate-800/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">Email Service</h3>
                      <p className="text-slate-400 text-sm">Transactional emails (claims, approvals, notifications)</p>
                    </div>
                    <a 
                      href="https://resend.com/signup" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Sign Up to Resend
                    </a>
                  </div>

                  {/* Architecture explanation */}
                  <div className="mb-6 p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-200 mb-2">Domain & Email Setup</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      QWIKKER manages all franchise subdomains and DNS centrally to ensure deliverability, security, and consistent sending reputation.
                    </p>
                    <p className="text-xs text-slate-300 font-medium mb-2">How email sending works:</p>
                    <ol className="text-xs text-slate-400 leading-relaxed space-y-2 mb-4 ml-4 list-decimal">
                      <li>Create a Resend account and generate an API key</li>
                      <li>In Resend, add your sending domain: <span className="text-slate-300 font-mono">{config.subdomain || 'yourcity'}.qwikker.com</span></li>
                      <li>Resend will provide DNS records for verification</li>
                      <li>Send those DNS records to <span className="text-slate-300 font-medium">support@qwikker.com</span> — we'll apply them for you</li>
                      <li>Once verified, paste your Resend API key below</li>
                    </ol>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      You pay Resend directly for email usage. QWIKKER handles domain configuration and ongoing DNS management.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 block">Resend API Key *</Label>
                      <div className="relative">
                        <Input
                          type={showKeys.resend ? "text" : "password"}
                          value={config.resend_api_key || ''}
                          onChange={(e) => setConfig({...config, resend_api_key: e.target.value})}
                          className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm pr-10"
                          placeholder="re_..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeys({...showKeys, resend: !showKeys.resend})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                        >
                          {showKeys.resend ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Create at <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:underline">resend.com/api-keys</a>
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-300 text-sm mb-2 block">From Name</Label>
                        <Input
                          value={config.resend_from_name || ''}
                          onChange={(e) => setConfig({...config, resend_from_name: e.target.value})}
                          className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg"
                          placeholder="QWIKKER Bournemouth"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Example: {config.subdomain ? config.subdomain.charAt(0).toUpperCase() + config.subdomain.slice(1) : 'Bournemouth'} Qwikker
                        </p>
                      </div>
                      <div>
                        <Label className="text-slate-300 text-sm mb-2 block">From Email Address</Label>
                        <Input
                          type="email"
                          value={config.resend_from_email || ''}
                          onChange={(e) => setConfig({...config, resend_from_email: e.target.value})}
                          className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg"
                          placeholder={`no-reply@${config.subdomain || 'yourcity'}.qwikker.com`}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Use <span className="font-mono text-slate-300">no-reply@{config.subdomain || 'yourcity'}.qwikker.com</span> once verified (You can use <span className="font-mono text-slate-300">onboarding@resend.dev</span> temporarily for testing)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* OpenAI */}
                <div className="border-2 border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-colors bg-slate-800/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      AI
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">OpenAI (AI Features)</h3>
                      <p className="text-slate-400 text-sm">Power AI chat support, content generation, and embeddings</p>
                    </div>
                    <a 
                      href="https://platform.openai.com/signup" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Sign Up →
                    </a>
                  </div>

                  <div>
                    <Label className="text-slate-300 text-sm mb-2 block">OpenAI API Key *</Label>
                    <div className="relative">
                      <Input
                        type={showKeys.openai ? "text" : "password"}
                        value={config.openai_api_key || ''}
                        onChange={(e) => setConfig({...config, openai_api_key: e.target.value})}
                        className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm pr-10"
                        placeholder="sk-proj-..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys({...showKeys, openai: !showKeys.openai})}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                      >
                        {showKeys.openai ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Used for: AI Support Chat, Social Wizard, Knowledge Base</p>
                  </div>
                </div>

                {/* Anthropic (Claude) */}
                <div className="border-2 border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-colors bg-slate-800/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      CL
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">Anthropic Claude (Advanced AI)</h3>
                      <p className="text-slate-400 text-sm">Premium AI for advanced features and hybrid mode</p>
                    </div>
                    <a 
                      href="https://console.anthropic.com/signup" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Sign Up →
                    </a>
                  </div>

                  <div>
                    <Label className="text-slate-300 text-sm mb-2 block">Anthropic API Key (Optional)</Label>
                    <div className="relative">
                      <Input
                        type={showKeys.anthropic ? "text" : "password"}
                        value={config.anthropic_api_key || ''}
                        onChange={(e) => setConfig({...config, anthropic_api_key: e.target.value})}
                        className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm pr-10"
                        placeholder="sk-ant-..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys({...showKeys, anthropic: !showKeys.anthropic})}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                      >
                        {showKeys.anthropic ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Used for: Hybrid AI Mode (falls back to OpenAI if not set)</p>
                  </div>
                </div>

                {/* Google Places API */}
                <div className="border-2 border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-colors bg-slate-800/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">Google Places API</h3>
                      <p className="text-slate-400 text-sm">Import businesses from Google</p>
                    </div>
                    <a 
                      href="https://console.cloud.google.com/apis/credentials" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Get API Key
                    </a>
                  </div>

                  <div>
                    <Label className="text-slate-300 text-sm mb-2 block">API Key</Label>
                    {config.has_google_places_api_key && !config.google_places_api_key?.startsWith('AIza') ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg">
                          <svg className="w-4 h-4 text-[#00D083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-slate-300">API key configured</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfig({...config, google_places_api_key: '', has_google_places_api_key: false})}
                          className="text-sm text-slate-400 hover:text-slate-300"
                        >
                          Replace key
                        </button>
                      </div>
                    ) : (
                      <Input
                        type="text"
                        value={config.google_places_api_key || ''}
                        onChange={(e) => setConfig({...config, google_places_api_key: e.target.value})}
                        className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm"
                        placeholder="AIzaSy..."
                      />
                    )}
                    <div className="mt-3 p-3 bg-slate-800/80 border border-slate-700 rounded-lg">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Used for importing businesses via Google Places API. Enable "Places API (new)" in Google Cloud Console, create an API key, and restrict it to Places API only.
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Cost: ~£0.075 per business
                      </p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                onClick={() => setActiveStep(2)}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 px-6 py-3 rounded-xl font-bold"
              >
                ← Back
              </Button>
              <button
                onClick={() => setActiveStep(4)}
                className="bg-[#00D083] hover:bg-[#00b86f] text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Platform Integrations */}
        {activeStep === 4 && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-green-500/50 shadow-2xl backdrop-blur-sm">
              <CardHeader>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-white text-2xl">Platform Integrations</CardTitle>
                  <p className="text-slate-400 text-sm mt-1">Connect CRM, payments, notifications & more</p>
                </div>
              </div>
                
                <div className="bg-green-900/30 border-2 border-green-500/30 rounded-xl p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  <div>
                    <p className="text-green-300 text-sm font-semibold mb-1">Automate Everything</p>
                    <p className="text-green-200 text-sm">
                      These integrations power your franchise operations. Connect your tools once and let Qwikker handle the rest automatically!
                    </p>
                  </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                
                {/* GoHighLevel (CRM) */}
                <div className="border-2 border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-colors bg-slate-800/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      GHL
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">GoHighLevel (CRM)</h3>
                      <p className="text-slate-400 text-sm">Automatically add new businesses to your CRM</p>
                    </div>
                  </div>
                  
                  <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-3 mb-4">
                    <p className="text-purple-200 text-xs">
                      <span className="font-semibold">What gets synced:</span> Business signups, profile updates, offers, status changes - all automatically
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 block">Main Webhook URL *</Label>
                      <Input
                        value={config.ghl_webhook_url || ''}
                        onChange={(e) => setConfig({...config, ghl_webhook_url: e.target.value})}
                        className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm"
                        placeholder="https://services.leadconnectorhq.com/hooks/..."
                      />
                      <p className="text-xs text-slate-400 mt-1">Used for new business signups</p>
                    </div>
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 block">Update Webhook URL</Label>
                      <Input
                        value={config.ghl_update_webhook_url || ''}
                        onChange={(e) => setConfig({...config, ghl_update_webhook_url: e.target.value})}
                        className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm"
                        placeholder="https://services.leadconnectorhq.com/hooks/..."
                      />
                      <p className="text-xs text-slate-400 mt-1">Used for business profile updates (optional)</p>
                    </div>
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 block">GHL API Key</Label>
                      <div className="relative">
                        <Input
                          type={showKeys.ghl ? "text" : "password"}
                          value={config.ghl_api_key || ''}
                          onChange={(e) => setConfig({...config, ghl_api_key: e.target.value})}
                          className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm pr-10"
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeys({...showKeys, ghl: !showKeys.ghl})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                        >
                          {showKeys.ghl ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">For advanced CRM authentication and two-way sync</p>
                    </div>
                  </div>
                </div>

                {/* WalletPush (Mobile Passes) */}
                <div className="border-2 border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-colors bg-slate-800/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">WalletPush (Mobile Passes)</h3>
                      <p className="text-slate-400 text-sm">Create Apple Wallet & Google Pay passes for customers</p>
                    </div>
                    <a 
                      href="https://walletpush.io" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Learn More →
                    </a>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-300 text-sm mb-2 block">WalletPush API Key</Label>
                        <div className="relative">
                          <Input
                            type={showKeys.walletpush ? "text" : "password"}
                            value={config.walletpush_api_key || ''}
                            onChange={(e) => setConfig({...config, walletpush_api_key: e.target.value})}
                            className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm pr-10"
                            placeholder="wp_live_..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeys({...showKeys, walletpush: !showKeys.walletpush})}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                          >
                            {showKeys.walletpush ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-300 text-sm mb-2 block">Template ID</Label>
                        <Input
                          value={config.walletpush_template_id || ''}
                          onChange={(e) => setConfig({...config, walletpush_template_id: e.target.value})}
                          className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg"
                          placeholder="template_12345"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 block">Endpoint URL</Label>
                      <Input
                        value={config.walletpush_endpoint_url || ''}
                        onChange={(e) => setConfig({...config, walletpush_endpoint_url: e.target.value})}
                        className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg"
                        placeholder="https://app.walletpush.io/api/hl-yourfranchise"
                      />
                    </div>
                  </div>
                </div>

                {/* Slack (Notifications) */}
                <div className="border-2 border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-colors bg-slate-800/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">Slack (Team Notifications)</h3>
                      <p className="text-slate-400 text-sm">Get instant alerts when businesses sign up or need attention</p>
                    </div>
                    <a 
                      href="https://api.slack.com/messaging/webhooks" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Setup Guide →
                    </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 block">Slack Webhook URL</Label>
                      <Input
                        type="password"
                        value={config.slack_webhook_url || ''}
                        onChange={(e) => setConfig({...config, slack_webhook_url: e.target.value})}
                        className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm"
                        placeholder="https://hooks.slack.com/services/..."
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 block">Default Channel</Label>
                      <Input
                        value={config.slack_channel || ''}
                        onChange={(e) => setConfig({...config, slack_channel: e.target.value})}
                        className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg"
                        placeholder="#qwikker-alerts"
                      />
                    </div>
                  </div>
                </div>

                {/* Stripe (Payments) - Connect Integration */}
                <div className="border-2 border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-colors bg-slate-800/30">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#635BFF] to-[#8B5CF6] rounded-xl flex items-center justify-center shadow-lg">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">Payment Processing</h3>
                      <p className="text-slate-400 text-sm">Connect your Stripe account to receive subscription payments</p>
                    </div>
                    <img src="/stripe-logo.svg" alt="Stripe" className="h-8 opacity-60" />
                  </div>

                  {/* Stripe Message */}
                  {stripeMessage && (
                    <div className={`mb-4 p-3 rounded-lg ${
                      stripeMessage.type === 'success' 
                        ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                        : 'bg-red-500/20 border border-red-500/30 text-red-400'
                    }`}>
                      <p className="text-sm flex items-center gap-2">
                        {stripeMessage.type === 'success' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        {stripeMessage.text}
                      </p>
                    </div>
                  )}

                  {/* Connected State */}
                  {config.stripe_account_id && config.stripe_onboarding_completed ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-green-400 font-semibold text-lg">Stripe Connected</p>
                            <p className="text-slate-400 text-sm">Your account is ready to accept payments</p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-500 text-xs uppercase tracking-wide">Account ID</p>
                            <p className="text-slate-300 font-mono text-sm">{config.stripe_account_id}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <a
                          href="https://dashboard.stripe.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View Dashboard
                        </a>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to disconnect your Stripe account?')) {
                              setConfig({...config, stripe_account_id: '', stripe_onboarding_completed: false})
                              setStripeMessage({ type: 'success', text: 'Stripe account disconnected. Remember to save your changes.' })
                            }
                          }}
                          className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium transition-colors border border-red-500/20"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Not Connected */
                    <div className="space-y-5">
                      <div className="bg-slate-700/30 rounded-xl p-5">
                        <p className="text-slate-300 text-sm leading-relaxed">
                          Connect your Stripe account to accept subscription payments from businesses in your franchise. 
                          Payments go directly to your account with no platform fees.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Secure payments
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Automatic invoicing
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Full dashboard access
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            No platform fees
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={async () => {
                          setStripeConnecting(true)
                          setStripeMessage(null)
                          try {
                            const response = await fetch('/api/admin/billing/stripe-connect', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ city })
                            })
                            const data = await response.json()
                            if (data.url) {
                              window.location.href = data.url
                            } else {
                              setStripeMessage({ type: 'error', text: data.error || 'Failed to connect Stripe' })
                              setStripeConnecting(false)
                            }
                          } catch (err) {
                            setStripeMessage({ type: 'error', text: 'Failed to initiate Stripe connection' })
                            setStripeConnecting(false)
                          }
                        }}
                        disabled={stripeConnecting}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] hover:from-[#5851DB] hover:to-[#7C3AED] text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50"
                      >
                        {stripeConnecting ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Connecting...
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                            </svg>
                            Connect with Stripe
                          </>
                        )}
                      </button>
                      
                      <p className="text-center text-slate-500 text-xs">
                        Don&apos;t have a Stripe account? You&apos;ll create one during the connection process.
                      </p>
                    </div>
                  )}
                </div>

                {/* SMS Notifications (Twilio) - OPTIONAL */}
                <div className="border-2 border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-colors bg-slate-800/30">
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">SMS Notifications (Optional)</h3>
                        <p className="text-slate-400 text-sm">Transactional SMS for Claim Submitted & Claim Approved</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfig({...config, sms_enabled: !config.sms_enabled})}
                      className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                        config.sms_enabled ? 'bg-blue-600' : 'bg-slate-600'
                      }`}
                    >
                      <span className="sr-only">Enable SMS</span>
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          config.sms_enabled ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {config.sms_enabled && (
                    <>
                      {/* Architecture explanation */}
                      <div className="mb-6 p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg">
                        <h4 className="text-sm font-semibold text-slate-200 mb-2">SMS Service Setup</h4>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                          QWIKKER manages phone number configuration and compliance requirements centrally. You connect your Twilio account and pay for usage directly.
                        </p>
                        <p className="text-xs text-slate-300 font-medium mb-2">How SMS sending works:</p>
                        <ol className="text-xs text-slate-400 leading-relaxed space-y-2 mb-4 ml-4 list-decimal">
                          <li>Create a Twilio account and purchase a phone number</li>
                          <li>Set up a Messaging Service in Twilio</li>
                          <li>Copy your Account SID, Auth Token, and Messaging Service SID</li>
                          <li>Paste your credentials below and run a test</li>
                          <li>Once verified, SMS opt-in will automatically appear in your claim form</li>
                        </ol>
                        <p className="text-xs text-slate-400 leading-relaxed mb-2">
                          You pay Twilio directly for SMS usage. QWIKKER handles compliance configuration and opt-out management.
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          <a href="/api/admin/sms/guide.pdf" target="_blank" className="text-[#00D083] hover:underline font-medium">Download full setup guide (PDF)</a> · Need help with compliance? Email support@qwikker.com
                        </p>
                      </div>

                      {/* Country Selection (Optional, for guidance) */}
                      <div className="mb-6">
                        <Label className="text-slate-300 text-sm mb-2 block">Country (Optional)</Label>
                        <select
                          value={config.sms_country_code || ''}
                          onChange={(e) => setConfig({...config, sms_country_code: e.target.value})}
                          className="w-full bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg px-4"
                        >
                          <option value="">Select country (for guidance)</option>
                          <option value="GB">🇬🇧 United Kingdom (+44)</option>
                          <option value="US">🇺🇸 United States (+1)</option>
                          <option value="CA">🇨🇦 Canada (+1)</option>
                          <option value="AU">🇦🇺 Australia (+61)</option>
                          <option value="NZ">🇳🇿 New Zealand (+64)</option>
                          <option value="IE">🇮🇪 Ireland (+353)</option>
                          <option value="FR">🇫🇷 France (+33)</option>
                          <option value="DE">🇩🇪 Germany (+49)</option>
                          <option value="ES">🇪🇸 Spain (+34)</option>
                          <option value="IT">🇮🇹 Italy (+39)</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Used to tailor setup guidance and default calling codes</p>
                      </div>

                      {/* Twilio Credentials */}
                      <div className="space-y-4 mb-6">
                        <div>
                          <Label className="text-slate-300 text-sm mb-2 block">Twilio Account SID</Label>
                          <Input
                            value={config.twilio_account_sid || ''}
                            onChange={(e) => setConfig({...config, twilio_account_sid: e.target.value})}
                            className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm"
                            placeholder="AC..."
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 text-sm mb-2 block">Twilio Auth Token</Label>
                          <Input
                            type="password"
                            value={config.twilio_auth_token || ''}
                            onChange={(e) => setConfig({...config, twilio_auth_token: e.target.value})}
                            className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm"
                            placeholder="••••••••••••••••••••••••••••••••"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300 text-sm mb-2 block">Messaging Service SID (Recommended)</Label>
                          <Input
                            value={config.twilio_messaging_service_sid || ''}
                            onChange={(e) => setConfig({...config, twilio_messaging_service_sid: e.target.value})}
                            className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm"
                            placeholder="MG..."
                          />
                          <p className="text-xs text-slate-400 mt-1">Best for compliance: supports multiple senders and auto-routing</p>
                        </div>
                        <div>
                          <Label className="text-slate-300 text-sm mb-2 block">From Number (Alternative)</Label>
                          <Input
                            value={config.twilio_from_number || ''}
                            onChange={(e) => setConfig({...config, twilio_from_number: e.target.value})}
                            className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm"
                            placeholder="+447700900123"
                          />
                          <p className="text-xs text-slate-400 mt-1">Use if not using Messaging Service. Must be E.164 format (+country...)</p>
                        </div>
                      </div>

                      {/* Setup Guide */}
                      <div className="mb-6">
                        <a 
                          href="/api/admin/sms/guide.pdf" 
                          target="_blank" 
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download Twilio Setup Guide (PDF)
                        </a>
                      </div>

                      {/* Status */}
                      <div className="mb-6 flex items-center gap-2 text-sm">
                        <span className="text-slate-400">Status:</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            config.sms_verified ? 'bg-[#00D083]' : 'bg-slate-500'
                          }`} />
                          <span className={config.sms_verified ? 'text-white' : 'text-slate-400'}>
                            {config.sms_verified ? 'Verified' : 'Not verified'}
                          </span>
                        </div>
                      </div>

                      {/* Test Buttons */}
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={async () => {
                            const result = confirm('This will simulate an SMS send without actually sending. Continue?')
                            if (!result) return
                            
                            try {
                              const res = await fetch('/api/admin/sms/test?mode=simulated', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({})
                              })
                              const data = await res.json()
                              if (data.success) {
                                alert(`Simulated Test Successful\n\nMessage Preview:\n${data.message}`)
                              } else {
                                alert(`Test failed: ${data.error}`)
                              }
                            } catch (err) {
                              alert('Test failed: Network error')
                            }
                          }}
                          className="w-full px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors border border-slate-600"
                        >
                          Simulated Test
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const phone = prompt('Enter phone number to send test SMS (E.164 format, e.g., +447700900123):')
                            if (!phone) return
                            
                            try {
                              const res = await fetch('/api/admin/sms/test?mode=real', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ to_e164: phone })
                              })
                              const data = await res.json()
                              if (data.success) {
                                alert(`Real SMS Sent\n\nYour SMS is now verified.\nClaim form will show SMS opt-in checkbox.`)
                                location.reload()
                              } else {
                                alert(`Failed to send SMS:\n\n${data.error}\n\n${data.troubleshooting ? data.troubleshooting.join('\n• ') : ''}`)
                              }
                            } catch (err) {
                              alert('Test failed: Network error')
                            }
                          }}
                          className="w-full px-4 py-2.5 border border-[#00D083] text-[#00D083] hover:bg-[#00D083]/10 rounded-lg text-sm font-medium transition-colors"
                        >
                          Send Real Test SMS
                        </button>
                      </div>
                    </>
                  )}
                </div>

              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                onClick={() => setActiveStep(3)}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 px-6 py-3 rounded-xl font-bold"
              >
                ← Back
              </Button>
              <button
                onClick={() => setActiveStep(5)}
                className="bg-[#00D083] hover:bg-[#00b86f] text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Review & Save */}
        {activeStep === 5 && (
          <Card className="bg-slate-800/50 border border-slate-700">
            <CardHeader>
              <div className="mb-6">
                <CardTitle className="text-white text-lg font-medium mb-1">Review & Save</CardTitle>
                <p className="text-slate-400 text-sm">
                  Your configuration will be saved and applied immediately.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-6">
                <h3 className="text-white font-medium text-sm mb-4">Configuration Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-300">Admin Account</p>
                      <p className="text-slate-500 text-xs">Owner details and credentials</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-300">Franchise Info</p>
                      <p className="text-slate-500 text-xs">Display name, subdomain, contact details</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-300">API Services</p>
                      <p className="text-slate-500 text-xs">Resend, OpenAI, Anthropic</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-300">Integrations</p>
                      <p className="text-slate-500 text-xs">CRM, wallet, notifications, payments</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-4 pt-6">
                <button
                  onClick={saveConfig}
                  disabled={saveStatus === 'saving'}
                  className={`px-8 py-2.5 text-sm font-medium text-white transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    saveStatus === 'saved' 
                      ? 'bg-[#00D083] hover:bg-[#00b86f]' 
                      : saveStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-[#00D083] hover:bg-[#00b86f]'
                  }`}
                >
                  {saveStatus === 'saving' && (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  )}
                  {saveStatus === 'saved' && 'Saved'}
                  {saveStatus === 'error' && 'Error - Try Again'}
                  {saveStatus === 'idle' && 'Save Configuration'}
                </button>
                
                <Button
                  onClick={() => setActiveStep(4)}
                  variant="ghost"
                  className="text-slate-400 hover:text-white"
                >
                  ← Back to review settings
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
