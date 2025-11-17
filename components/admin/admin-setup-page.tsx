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

  // Franchise-Paid API Services (NEW)
  resend_api_key?: string
  resend_from_email?: string
  resend_from_name?: string
  openai_api_key?: string
  anthropic_api_key?: string
  
  // CRM Integration (GHL)
  ghl_webhook_url: string
  ghl_update_webhook_url: string
  ghl_api_key: string
  
  // Mobile Wallet (WalletPush)
  walletpush_api_key: string
  walletpush_template_id: string
  walletpush_endpoint_url: string
  
  // Notifications (Slack)
  slack_webhook_url: string
  slack_channel: string
  
  // Payment Processing (Stripe)
  stripe_account_id: string
  stripe_publishable_key: string
  stripe_webhook_secret: string
  stripe_onboarding_completed: boolean
  
  // Legal & Billing
  business_registration: string
  business_address: string
  billing_email: string
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
    ghl: false,
    walletpush: false,
    stripe_publishable: false,
    stripe_secret: false
  })

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
            resend_from_email: `hello@${city.toLowerCase()}.qwikker.com`,
            resend_from_name: `${city.charAt(0).toUpperCase() + city.slice(1)} Qwikker`,
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
            billing_email: `billing@${city.toLowerCase()}.qwikker.com`
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
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Hero Header - Discover Page Style */}
      <div className="text-center mb-12">
        <div className="flex flex-col items-center gap-6 mb-6">
          <div className="p-4 bg-[#00d083]/10 rounded-full border-2 border-[#00d083]/30 shadow-xl shadow-[#00d083]/20">
            <svg className="w-12 h-12 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-5xl font-bold text-[#00d083] mb-3">
              Franchise Setup
            </h1>
            <div className="h-1 w-48 mx-auto bg-gradient-to-r from-transparent via-[#00d083] to-transparent rounded-full" />
          </div>
        </div>
        <p className="text-slate-300 text-lg max-w-3xl mx-auto leading-relaxed">
          Configure your <span className="text-[#00d083] font-semibold">{config.display_name}</span> franchise. 
          Manage your API services, integrations, and platform settings.
        </p>
      </div>

      {/* Progress Steps - Clickable Filter Cards Style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-12">
        {steps.map((step) => {
          const isActive = activeStep === step.id
          const isComplete = activeStep > step.id
          
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`
                relative p-5 rounded-2xl border-2 transition-all duration-300
                ${isActive 
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-700/80 border-[#00d083] shadow-xl shadow-[#00d083]/20 scale-105' 
                  : isComplete
                  ? 'bg-gradient-to-br from-slate-800/60 to-slate-700/60 border-green-500/50 hover:border-green-500/80'
                  : 'bg-gradient-to-br from-slate-800/40 to-slate-700/40 border-slate-600/50 hover:border-slate-500'
                }
                hover:scale-105 cursor-pointer
              `}
            >
              {isComplete && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-slate-900">
                  ✓
                </div>
              )}
              <div className="text-center">
                <div className={`text-2xl font-bold mb-2 ${isActive ? 'text-[#00d083]' : isComplete ? 'text-green-400' : 'text-slate-400'}`}>{step.icon}</div>
                <div className={`font-bold text-xs ${isActive ? 'text-[#00d083]' : isComplete ? 'text-green-400' : 'text-slate-400'}`}>
                  Step {step.id}
                </div>
                <div className={`text-xs mt-1 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {step.name}
                </div>
              </div>
            </button>
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
          <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-blue-500/50 shadow-2xl backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-white text-2xl">Your Admin Account</CardTitle>
                  <p className="text-slate-400 text-sm mt-1">Manage your personal admin login credentials</p>
                </div>
              </div>
              
              {/* Info Banner */}
              <div className="bg-blue-900/30 border-2 border-blue-500/30 rounded-xl p-4 mt-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-blue-300 text-sm font-semibold mb-1">Security First</p>
                    <p className="text-blue-200 text-sm">
                      This is YOUR admin account for managing your franchise. Use a strong, unique password and keep your email secure for important system notifications.
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-slate-300 font-semibold mb-2 block">Owner Name *</Label>
                  <Input
                    value={config.owner_name}
                    onChange={(e) => setConfig({...config, owner_name: e.target.value})}
                    className="bg-slate-700/80 border-slate-600 text-white h-12 rounded-xl"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 font-semibold mb-2 block">Owner Email *</Label>
                  <Input
                    type="email"
                    value={config.owner_email}
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
                <Button
                  onClick={() => setActiveStep(2)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30"
                >
                  Next: Franchise Details →
                </Button>
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
                    value={config.display_name}
                    disabled
                    className="bg-slate-700/50 border-slate-600/50 text-slate-400 h-12 rounded-xl cursor-not-allowed"
                    placeholder="Bournemouth Qwikker"
                  />
                  <p className="text-xs text-slate-500 mt-1">🔒 Set during franchise creation (cannot be changed)</p>
                </div>
                <div>
                  <Label className="text-slate-300 font-semibold mb-2 block">Subdomain *</Label>
                  <Input
                    value={config.subdomain}
                    disabled
                    className="bg-slate-700/50 border-slate-600/50 text-slate-400 h-12 rounded-xl cursor-not-allowed"
                    placeholder="bournemouth"
                  />
                  <p className="text-xs text-slate-500 mt-1">🔒 Your URL: <span className="text-slate-400">{config.subdomain}.qwikker.com</span></p>
                </div>
                <div>
                  <Label className="text-slate-300 font-semibold mb-2 block">Owner Phone</Label>
                  <Input
                    value={config.owner_phone}
                    onChange={(e) => setConfig({...config, owner_phone: e.target.value})}
                    className="bg-slate-700/80 border-slate-600 text-white h-12 rounded-xl"
                    placeholder="+44 1234 567890"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 font-semibold mb-2 block">Timezone *</Label>
                  <select 
                    className="w-full h-12 px-4 bg-slate-700/80 border border-slate-600 rounded-xl text-white"
                    value={config.timezone}
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
                  value={config.contact_address}
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
                <Button
                  onClick={() => setActiveStep(3)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-purple-500/30"
                >
                  Next: Your API Services →
                </Button>
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
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      RS
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">Resend (Email Service)</h3>
                      <p className="text-slate-400 text-sm">Send transactional emails to businesses and customers</p>
                    </div>
                    <a 
                      href="https://resend.com/signup" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Sign Up →
                    </a>
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
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-300 text-sm mb-2 block">From Name</Label>
                        <Input
                          value={config.resend_from_name || ''}
                          onChange={(e) => setConfig({...config, resend_from_name: e.target.value})}
                          className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg"
                          placeholder="Bournemouth Qwikker"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 text-sm mb-2 block">From Email Address</Label>
                        <Input
                          type="email"
                          value={config.resend_from_email || ''}
                          onChange={(e) => setConfig({...config, resend_from_email: e.target.value})}
                          className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg"
                          placeholder="hello@bournemouth.qwikker.com"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">Note: You'll need to verify this domain in Resend</p>
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
              <Button
                onClick={() => setActiveStep(4)}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30"
              >
                Next: Integrations →
              </Button>
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
                        value={config.ghl_webhook_url}
                        onChange={(e) => setConfig({...config, ghl_webhook_url: e.target.value})}
                        className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm"
                        placeholder="https://services.leadconnectorhq.com/hooks/..."
                      />
                      <p className="text-xs text-slate-400 mt-1">Used for new business signups</p>
                    </div>
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 block">Update Webhook URL</Label>
                      <Input
                        value={config.ghl_update_webhook_url}
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
                          value={config.ghl_api_key}
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
                            value={config.walletpush_api_key}
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
                          value={config.walletpush_template_id}
                          onChange={(e) => setConfig({...config, walletpush_template_id: e.target.value})}
                          className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg"
                          placeholder="template_12345"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 block">Endpoint URL</Label>
                      <Input
                        value={config.walletpush_endpoint_url}
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
                        value={config.slack_webhook_url}
                        onChange={(e) => setConfig({...config, slack_webhook_url: e.target.value})}
                        className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm"
                        placeholder="https://hooks.slack.com/services/..."
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 block">Default Channel</Label>
                      <Input
                        value={config.slack_channel}
                        onChange={(e) => setConfig({...config, slack_channel: e.target.value})}
                        className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg"
                        placeholder="#qwikker-alerts"
                      />
                    </div>
                  </div>
                </div>

                {/* Stripe (Payments) */}
                <div className="border-2 border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-colors bg-slate-800/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">Stripe (Payment Processing)</h3>
                      <p className="text-slate-400 text-sm">Handle subscription payments for your franchise</p>
                    </div>
                    <a 
                      href="https://dashboard.stripe.com/register" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Sign Up →
                    </a>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-300 text-sm mb-2 block">Stripe Account ID</Label>
                        <Input
                          value={config.stripe_account_id}
                          onChange={(e) => setConfig({...config, stripe_account_id: e.target.value})}
                          className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm"
                          placeholder="acct_..."
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 text-sm mb-2 block">Publishable Key</Label>
                        <div className="relative">
                          <Input
                            type={showKeys.stripe_publishable ? "text" : "password"}
                            value={config.stripe_publishable_key}
                            onChange={(e) => setConfig({...config, stripe_publishable_key: e.target.value})}
                            className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm pr-10"
                            placeholder="pk_live_..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeys({...showKeys, stripe_publishable: !showKeys.stripe_publishable})}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                          >
                            {showKeys.stripe_publishable ? (
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
                    </div>
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 block">Webhook Secret</Label>
                      <div className="relative">
                        <Input
                          type={showKeys.stripe_secret ? "text" : "password"}
                          value={config.stripe_webhook_secret}
                          onChange={(e) => setConfig({...config, stripe_webhook_secret: e.target.value})}
                          className="bg-slate-700/80 border-slate-600 text-white h-11 rounded-lg font-mono text-sm pr-10"
                          placeholder="whsec_..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeys({...showKeys, stripe_secret: !showKeys.stripe_secret})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                        >
                          {showKeys.stripe_secret ? (
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
                    <div className="flex items-center space-x-3 pt-2">
                      <input
                        type="checkbox"
                        checked={config.stripe_onboarding_completed}
                        onChange={(e) => setConfig({...config, stripe_onboarding_completed: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-[#00d083] focus:ring-[#00d083]"
                        id="stripe-complete"
                      />
                      <label htmlFor="stripe-complete" className="text-slate-300 text-sm">Stripe onboarding completed</label>
                    </div>
                  </div>
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
              <Button
                onClick={() => setActiveStep(5)}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-green-500/30"
              >
                Next: Save & Launch →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: Save & Launch */}
        {activeStep === 5 && (
          <Card className="bg-gradient-to-br from-[#00d083]/10 to-[#00b86f]/10 border-2 border-[#00d083]/50 shadow-2xl backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#00d083]/30 animate-bounce">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-white text-4xl mb-3">Ready to Save!</CardTitle>
              <p className="text-slate-300 text-lg max-w-2xl mx-auto">
                Review your configuration and save your changes. Your franchise will be updated with the latest settings.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-[#00d083]/10 border-2 border-[#00d083]/30 rounded-xl p-8">
                <h3 className="text-white font-bold text-xl mb-4 text-center">What gets saved?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#00d083] rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="font-semibold text-white">Admin Account</p>
                      <p className="text-slate-400">Owner details and login credentials</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#00d083] rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="font-semibold text-white">Franchise Info</p>
                      <p className="text-slate-400">Display name, subdomain, and contact details</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#00d083] rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="font-semibold text-white">Your API Services</p>
                      <p className="text-slate-400">Resend, OpenAI, and Anthropic keys</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#00d083] rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">4</div>
                    <div>
                      <p className="font-semibold text-white">Integrations</p>
                      <p className="text-slate-400">GHL, WalletPush, Slack, and Stripe settings</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-4 pt-6">
                <Button
                  onClick={saveConfig}
                  disabled={saveStatus === 'saving'}
                  className={`px-16 py-6 text-xl font-bold text-white transition-all rounded-2xl ${
                    saveStatus === 'saved' 
                      ? 'bg-green-500 hover:bg-green-600 shadow-green-500/50' 
                      : saveStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-500/50'
                      : 'bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00d083] shadow-[#00d083]/50'
                  } shadow-2xl hover:scale-105 transition-transform`}
                >
                  {saveStatus === 'saving' && (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving Configuration...
                    </>
                  )}
                  {saveStatus === 'saved' && 'Configuration Saved!'}
                  {saveStatus === 'error' && 'Try Again'}
                  {saveStatus === 'idle' && 'Save Configuration'}
                </Button>
                
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
