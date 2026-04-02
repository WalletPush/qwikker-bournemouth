'use client'

import { useState, useEffect } from 'react'
import { AdminSetupPage } from './admin-setup-page'
import { PricingCardEditor } from './pricing-card-editor'
import { LandingPageEditor } from './landing-page-editor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface CityConfigurationPageProps {
  city: string
}

const SUB_TABS = [
  { id: 'setup', label: 'Setup', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
  { id: 'pricing', label: 'Pricing & Billing', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { id: 'trial', label: 'Trial & Onboarding', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { id: 'landing', label: 'Landing Page', icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  )},
] as const

type SubTabId = typeof SUB_TABS[number]['id']

export function CityConfigurationPage({ city }: CityConfigurationPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('setup')

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="border-b border-slate-700/50">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="City configuration tabs">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'border-[#00d083] text-[#00d083]'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Sub-tab content */}
      {activeSubTab === 'setup' && (
        <AdminSetupPage city={city} />
      )}

      {activeSubTab === 'pricing' && (
        <PricingCardEditor city={city} />
      )}

      {activeSubTab === 'trial' && (
        <TrialConfigSection city={city} />
      )}

      {activeSubTab === 'landing' && (
        <LandingPageEditor city={city} />
      )}
    </div>
  )
}

interface TrialConfigSectionProps {
  city: string
}

const TIER_OPTIONS = [
  { value: 'starter', label: 'Starter' },
  { value: 'featured', label: 'Featured' },
  { value: 'spotlight', label: 'Spotlight' },
]

function TrialConfigSection({ city }: TrialConfigSectionProps) {
  const [defaultTrialTier, setDefaultTrialTier] = useState('featured')
  const [trialDays, setTrialDays] = useState(90)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/admin/franchise')
        const data = await res.json()
        const franchise = data.franchises?.find((f: { city: string }) => f.city === city)
        if (franchise) {
          setDefaultTrialTier(franchise.default_trial_tier || 'featured')
          setTrialDays(franchise.founding_member_trial_days || 90)
        }
      } catch {
        console.error('Failed to load trial config')
      } finally {
        setIsLoading(false)
      }
    }
    loadConfig()
  }, [city])

  async function handleSave() {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      const res = await fetch('/api/admin/billing/trial-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          default_trial_tier: defaultTrialTier,
          founding_member_trial_days: trialDays,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaveMessage({ type: 'success', text: 'Trial configuration saved successfully' })
      } else {
        setSaveMessage({ type: 'error', text: data.error || 'Failed to save' })
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Network error' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-[#00d083] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#00d083]/10">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-white">Trial Configuration</CardTitle>
              <p className="text-sm text-slate-400 mt-1">Set the default trial tier and duration for new business signups</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-slate-300">Default Trial Tier</Label>
            <p className="text-xs text-slate-500">Which tier do new businesses get during their free trial?</p>
            <select
              value={defaultTrialTier}
              onChange={(e) => setDefaultTrialTier(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-slate-900 border border-slate-600 text-white focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083]"
            >
              {TIER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Trial Duration (days)</Label>
            <p className="text-xs text-slate-500">How many days does the free trial last?</p>
            <Input
              type="number"
              min={7}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(parseInt(e.target.value) || 90)}
              className="bg-slate-900 border-slate-600 text-white focus:border-[#00d083]"
            />
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Current Settings</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Trial Tier:</span>
                <span className="ml-2 text-white font-medium">{defaultTrialTier.charAt(0).toUpperCase() + defaultTrialTier.slice(1)}</span>
              </div>
              <div>
                <span className="text-slate-500">Duration:</span>
                <span className="ml-2 text-white font-medium">{trialDays} days</span>
              </div>
            </div>
          </div>

          {saveMessage && (
            <div className={`text-sm px-4 py-3 rounded-lg ${
              saveMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {saveMessage.text}
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-[#00d083] hover:bg-[#00b86f] text-white font-semibold"
          >
            {isSaving ? 'Saving...' : 'Save Trial Configuration'}
          </Button>
        </CardContent>
      </Card>

    </div>
  )
}
