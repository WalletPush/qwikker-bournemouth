'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FranchiseConfig {
  city: string
  display_name: string
  subdomain: string
  owner_name: string
  owner_email: string
  owner_phone: string
  contact_address: string
  ghl_webhook_url: string
  ghl_update_webhook_url: string
  walletpush_api_key: string
  walletpush_template_id: string
  walletpush_endpoint_url: string
  slack_webhook_url: string
  slack_channel: string
  timezone: string
  status: string
  stripe_account_id: string
  stripe_publishable_key: string
  stripe_webhook_secret: string
  stripe_onboarding_completed: boolean
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
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

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
          // Auto-populate based on detected city
          const getDefaultsForCity = (cityName: string) => {
            const cityLower = cityName.toLowerCase()
            
            // Timezone mapping
            const timezoneMap: Record<string, string> = {
              'bournemouth': 'Europe/London',
              'london': 'Europe/London',
              'calgary': 'America/Edmonton',
              'vancouver': 'America/Vancouver',
              'toronto': 'America/Toronto',
              'sydney': 'Australia/Sydney',
              'melbourne': 'Australia/Melbourne'
            }
            
            return {
              timezone: timezoneMap[cityLower] || 'Europe/London'
            }
          }
          
          const cityDefaults = getDefaultsForCity(city)
          
          // Set smart defaults based on city
          setConfig({
            city,
            display_name: `${city.charAt(0).toUpperCase() + city.slice(1)} Qwikker`,
            subdomain: city.toLowerCase(),
            owner_name: '',
            owner_email: `owner@${city.toLowerCase()}.qwikker.com`,
            owner_phone: '',
            contact_address: '',
            ghl_webhook_url: `https://services.leadconnectorhq.com/hooks/${city.toLowerCase()}/qwikker`,
            ghl_update_webhook_url: `https://services.leadconnectorhq.com/hooks/${city.toLowerCase()}/qwikker-updates`,
            walletpush_api_key: '',
            walletpush_template_id: '',
            walletpush_endpoint_url: `https://app.walletpush.io/api/hl-${city.toLowerCase()}`,
            slack_webhook_url: '',
            slack_channel: `#qwikker-${city.toLowerCase()}`,
            timezone: cityDefaults.timezone,
            status: 'pending_setup',
            stripe_account_id: '',
            stripe_publishable_key: '',
            stripe_webhook_secret: '',
            stripe_onboarding_completed: false,
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
        setMessage('Franchise configuration saved successfully!')
        
        setTimeout(() => {
          setSaveStatus('idle')
        }, 2000)
      } else {
        setSaveStatus('error')
        setMessage('Failed to save configuration')
      }
    } catch (error) {
      setSaveStatus('error')
      setMessage('Error saving configuration')
    }
  }

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setMessage('Password must be at least 8 characters')
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
        setMessage('Password changed successfully!')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        
        setTimeout(() => {
          setPasswordStatus('idle')
        }, 2000)
      } else {
        const data = await response.json()
        setPasswordStatus('error')
        setMessage(`${data.error || 'Failed to change password'}`)
      }
    } catch (error) {
      setPasswordStatus('error')
      setMessage('Error changing password')
    }
  }

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Loading franchise setup...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-full mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          Welcome to Your Qwikker Franchise!
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
          Let's get your franchise set up in just a few simple steps. This will only take 5-10 minutes!
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl p-6 border border-slate-600/50">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Setup Progress
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
            <div className="w-8 h-8 bg-[#00d083] rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
            <span className="text-slate-300 text-sm">Admin Account</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-slate-400 font-bold text-sm">2</div>
            <span className="text-slate-400 text-sm">Franchise Info</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-slate-400 font-bold text-sm">3</div>
            <span className="text-slate-400 text-sm">Integrations</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-slate-400 font-bold text-sm">4</div>
            <span className="text-slate-400 text-sm">Go Live!</span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('successfully') || message.includes('saved') ? 'bg-green-900/30 border border-green-500/30 text-green-300' :
          'bg-red-900/30 border border-red-500/30 text-red-300'
        }`}>
          {message}
        </div>
      )}

      {/* Step 1: Admin Account Settings */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-[#00d083]/30 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#00d083] rounded-full flex items-center justify-center text-white font-bold">1</div>
            <div>
              <CardTitle className="text-white text-xl">
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Your Admin Account
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Set up your personal admin login details
              </p>
            </div>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-blue-300 text-sm font-medium">Quick Tip</p>
                <p className="text-blue-200 text-sm">
                  This is YOUR personal admin account. Use a strong password and keep your email updated for important notifications!
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Owner Name</Label>
              <Input
                value={config.owner_name}
                onChange={(e) => setConfig({...config, owner_name: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label className="text-slate-300">Owner Email</Label>
              <Input
                type="email"
                value={config.owner_email}
                onChange={(e) => setConfig({...config, owner_email: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="owner@yourfranchise.com"
              />
            </div>
          </div>

          {/* Password Change Section */}
          <div className="border-t border-slate-600 pt-4 mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-300">Current Password</Label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">New Password</Label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <Label className="text-slate-300">Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <Button
              onClick={changePassword}
              disabled={passwordStatus === 'saving' || !passwordData.currentPassword || !passwordData.newPassword}
              className={`mt-4 px-6 py-2 text-white transition-colors ${
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
        </CardContent>
      </Card>

      {/* Step 2: Franchise Information */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-orange-500/30 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">2</div>
            <div>
              <CardTitle className="text-white text-xl">
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Your Franchise Details
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Tell us about your local Qwikker franchise
              </p>
            </div>
          </div>
          <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-orange-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-orange-300 text-sm font-medium">Why This Matters</p>
                <p className="text-orange-200 text-sm">
                  This info helps businesses and customers find you! It appears on your franchise website and in communications.
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Display Name</Label>
              <Input
                value={config.display_name}
                onChange={(e) => setConfig({...config, display_name: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Bournemouth Qwikker"
              />
            </div>
            <div>
              <Label className="text-slate-300">Subdomain</Label>
              <Input
                value={config.subdomain}
                onChange={(e) => setConfig({...config, subdomain: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="bournemouth"
              />
            </div>
            <div>
              <Label className="text-slate-300">Owner Phone</Label>
              <Input
                value={config.owner_phone}
                onChange={(e) => setConfig({...config, owner_phone: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="+44 1234 567890"
              />
            </div>
          </div>
          <div>
            <Label className="text-slate-300">Contact Address</Label>
            <Input
              value={config.contact_address}
              onChange={(e) => setConfig({...config, contact_address: e.target.value})}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="123 High Street, Bournemouth, BH1 2AB"
            />
          </div>
          <div>
            <Label className="text-slate-300">Timezone</Label>
            <select 
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
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
        </CardContent>
      </Card>

      {/* Step 3: Integrations */}
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3">3</div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connect Your Tools
          </h2>
          <p className="text-slate-400">
            Link your existing business tools to automate everything! Don't worry - we'll guide you through each one.
          </p>
        </div>

        {/* GoHighLevel Integration */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-purple-500/30 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">GHL</span>
              </div>
              <div>
                <CardTitle className="text-white text-lg">GoHighLevel (CRM)</CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  Automatically add new businesses to your CRM
                </p>
              </div>
            </div>
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-purple-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
                <div>
                  <p className="text-purple-300 text-sm font-medium">How to Find These</p>
                  <p className="text-purple-200 text-sm">
                    In GoHighLevel: Settings → Integrations → API → Copy your API Key and Location ID
                  </p>
                </div>
              </div>
            </div>
            
            {/* GHL Configuration Info */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="w-full">
                  <p className="text-blue-300 text-sm font-medium mb-2">Don't Worry About Technical Setup!</p>
                  <p className="text-blue-200 text-xs">
                    Qwikker HQ will handle all the technical configuration (DNS, webhooks, funnels). 
                    You just need to provide your GHL webhook URLs below and we'll do the rest!
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">GHL Webhook URL</Label>
              <Input
                value={config.ghl_webhook_url}
                onChange={(e) => setConfig({...config, ghl_webhook_url: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="https://services.leadconnectorhq.com/hooks/yourfranchise/qwikker"
              />
            </div>
            <div>
              <Label className="text-slate-300">GHL Update Webhook URL</Label>
              <Input
                value={config.ghl_update_webhook_url}
                onChange={(e) => setConfig({...config, ghl_update_webhook_url: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="https://services.leadconnectorhq.com/hooks/yourfranchise/qwikker-updates"
              />
            </div>
          </div>
        </CardContent>
      </Card>

        {/* WalletPush Integration */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-green-500/30 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-white text-lg">WalletPush (Mobile Passes)</CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  Create mobile wallet passes for your customers
                </p>
              </div>
            </div>
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-green-300 text-sm font-medium">What This Does</p>
                  <p className="text-green-200 text-sm">
                    Creates Apple Wallet & Google Pay passes for customers. They can add offers, loyalty cards, and more right to their phone!
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">WalletPush API Key</Label>
              <Input
                type="password"
                value={config.walletpush_api_key}
                onChange={(e) => setConfig({...config, walletpush_api_key: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="wp_live_..."
              />
            </div>
            <div>
              <Label className="text-slate-300">Template ID</Label>
              <Input
                value={config.walletpush_template_id}
                onChange={(e) => setConfig({...config, walletpush_template_id: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="template_12345"
              />
            </div>
          </div>
          <div>
            <Label className="text-slate-300">Endpoint URL</Label>
            <Input
              value={config.walletpush_endpoint_url}
              onChange={(e) => setConfig({...config, walletpush_endpoint_url: e.target.value})}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="https://app.walletpush.io/api/hl-yourfranchise"
            />
          </div>
        </CardContent>
      </Card>

        {/* Slack Integration */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-yellow-500/30 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-white text-lg">Slack (Team Notifications)</CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  Get instant alerts when businesses sign up or need attention
                </p>
              </div>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div>
                <p className="text-yellow-300 text-sm font-medium">Stay In The Loop</p>
                  <p className="text-yellow-200 text-sm">
                    Get notified instantly when new businesses join, offers are created, or issues need your attention!
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Slack Webhook URL</Label>
              <Input
                type="password"
                value={config.slack_webhook_url}
                onChange={(e) => setConfig({...config, slack_webhook_url: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
            <div>
              <Label className="text-slate-300">Default Channel</Label>
              <Input
                value={config.slack_channel}
                onChange={(e) => setConfig({...config, slack_channel: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="#qwikker-alerts"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Integration */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-indigo-500/30 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-white text-lg">Stripe (Payment Processing)</CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Handle subscription payments for your franchise
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Stripe Account ID</Label>
              <Input
                value={config.stripe_account_id}
                onChange={(e) => setConfig({...config, stripe_account_id: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="acct_..."
              />
            </div>
            <div>
              <Label className="text-slate-300">Publishable Key</Label>
              <Input
                value={config.stripe_publishable_key}
                onChange={(e) => setConfig({...config, stripe_publishable_key: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="pk_live_..."
              />
            </div>
          </div>
          <div>
            <Label className="text-slate-300">Webhook Secret</Label>
            <Input
              type="password"
              value={config.stripe_webhook_secret}
              onChange={(e) => setConfig({...config, stripe_webhook_secret: e.target.value})}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="whsec_..."
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.stripe_onboarding_completed}
              onChange={(e) => setConfig({...config, stripe_onboarding_completed: e.target.checked})}
              className="rounded"
            />
            <Label className="text-slate-300">Stripe onboarding completed</Label>
          </div>
        </CardContent>
      </Card>

      {/* Business Registration */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Legal & Billing</CardTitle>
          <p className="text-sm text-slate-400">
            Business registration and billing information
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Business Registration</Label>
              <Input
                value={config.business_registration}
                onChange={(e) => setConfig({...config, business_registration: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Company House Number, ABN, etc."
              />
            </div>
            <div>
              <Label className="text-slate-300">Billing Email</Label>
              <Input
                type="email"
                value={config.billing_email}
                onChange={(e) => setConfig({...config, billing_email: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="billing@yourfranchise.com"
              />
            </div>
          </div>
          <div>
            <Label className="text-slate-300">Business Address</Label>
            <Input
              value={config.business_address}
              onChange={(e) => setConfig({...config, business_address: e.target.value})}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Registered business address"
            />
          </div>
        </CardContent>
      </Card>

      </div>

      {/* Step 4: Go Live! */}
      <Card className="bg-gradient-to-br from-[#00d083]/10 to-[#00b86f]/10 border-[#00d083]/50 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 bg-[#00d083] rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">4</div>
          <CardTitle className="text-white text-2xl mb-2">Ready to Launch!</CardTitle>
          <p className="text-slate-300">
            You're all set! Click the button below to save your configuration and start your Qwikker franchise journey.
          </p>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-[#00d083]/10 border border-[#00d083]/30 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-2">What Happens Next?</h3>
            <div className="text-slate-300 text-sm space-y-2">
              <p>Your franchise will be configured and ready</p>
              <p>Businesses can start signing up immediately</p>
              <p>You'll receive notifications in Slack</p>
              <p>Mobile wallet passes will work automatically</p>
            </div>
          </div>
          
          <Button
            onClick={saveConfig}
            disabled={saveStatus === 'saving'}
            className={`px-12 py-4 text-lg font-bold text-white transition-all duration-300 transform hover:scale-105 ${
              saveStatus === 'saved' 
                ? 'bg-green-500 hover:bg-green-600 shadow-green-500/25' 
                : saveStatus === 'error'
                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/25'
                : 'bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00d083] shadow-[#00d083]/25'
            } shadow-xl`}
          >
            {saveStatus === 'saving' && (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Setting Up Your Franchise...
              </>
            )}
            {saveStatus === 'saved' && 'Welcome to Qwikker!'}
            {saveStatus === 'error' && 'Try Again'}
            {saveStatus === 'idle' && 'Launch My Qwikker Franchise!'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
