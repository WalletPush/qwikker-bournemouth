'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
interface UserSettingsPageProps {
  currentUser?: {
    id: string
    name: string
    email: string
    city?: string
    wallet_pass_id?: string
  }
  currentCity?: string
  cityDisplayName?: string
  stats?: {
    totalBusinesses: number
    totalOffers: number
  }
}

export function UserSettingsPage({ currentUser, currentCity = 'bournemouth', cityDisplayName = 'Bournemouth', stats }: UserSettingsPageProps) {
  // Marketing consent state
  const [pushConsent, setPushConsent] = useState(false)
  const [emailConsent, setEmailConsent] = useState(false)
  const [consentLoading, setConsentLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [preferences, setPreferences] = useState({
    categories: ['Restaurant', 'Cafe', 'Bar'],
    days: ['Friday', 'Saturday', 'Sunday'],
    radius: '3 miles',
    priceRange: 'All'
  })

  // Fetch current consent status on mount
  useEffect(() => {
    fetchConsent()
  }, [])

  const fetchConsent = async () => {
    try {
      const url = currentUser?.wallet_pass_id 
        ? `/api/user/marketing-consent?wallet_pass_id=${currentUser.wallet_pass_id}`
        : '/api/user/marketing-consent'
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setPushConsent(data.marketing_push_consent || false)
        setEmailConsent(data.email_marketing_consent || false)
      }
    } catch (error) {
      console.error('Error fetching consent:', error)
    } finally {
      setConsentLoading(false)
    }
  }

  const updateConsent = async (type: 'push' | 'email', value: boolean) => {
    setSaving(true)
    try {
      const payload = {
        ...(type === 'push' ? { marketing_push_consent: value } : { email_marketing_consent: value }),
        ...(currentUser?.wallet_pass_id ? { wallet_pass_id: currentUser.wallet_pass_id } : {})
      }

      const response = await fetch('/api/user/marketing-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        if (type === 'push') {
          setPushConsent(value)
        } else {
          setEmailConsent(value)
        }
      } else {
        throw new Error('Failed to update consent')
      }
    } catch (error) {
      console.error('Error updating consent:', error)
      alert('Failed to update preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const shareQwikker = () => {
    const text = `Hey! I've been discovering amazing local businesses with Qwikker in ${cityDisplayName}. Check it out!`
    
    if (navigator.share) {
      navigator.share({
        title: 'Check out Qwikker!',
        text: text,
        url: `https://${currentCity}.qwikker.com`
      })
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(text)
      alert('Message copied! Paste it anywhere to share!')
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center text-2xl font-bold text-black">
              {currentUser?.name?.charAt(0).toUpperCase() || 'Q'}
            </div>
            <div>
              <CardTitle className="text-slate-100 text-xl">{currentUser?.name || 'Qwikker User'}</CardTitle>
              <p className="text-slate-400">{currentUser?.email || 'user@qwikker.com'}</p>
              <p className="text-[#00d083] text-sm font-medium">Qwikker Member</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Share Section */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-cyan-500/10 animate-pulse"></div>
        <CardHeader>
          <CardTitle className="text-slate-100 text-xl flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            Share Qwikker
          </CardTitle>
            <p className="text-slate-300">
              Help your friends discover amazing local businesses in {cityDisplayName}!
            </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={shareQwikker}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            >
              Share Qwikker
            </Button>
          </div>

          <div className="text-center text-sm text-slate-400">
            <p>Spread the word about great local businesses!</p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            Marketing Preferences
          </CardTitle>
          <p className="text-slate-400">Control promotional notifications from businesses</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {consentLoading ? (
            <div className="text-center py-4 text-slate-400">Loading preferences...</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                <div>
                  <p className="text-white font-medium">Wallet Pass Promotions</p>
                  <p className="text-slate-400 text-sm">Receive promotional push notifications from businesses on your wallet pass</p>
                </div>
                <button
                  onClick={() => updateConsent('push', !pushConsent)}
                  disabled={saving}
                  className={`w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${
                    pushConsent ? 'bg-[#00d083]' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    pushConsent ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                <div>
                  <p className="text-white font-medium">Email Promotions</p>
                  <p className="text-slate-400 text-sm">Receive weekly digest and promotional emails about offers and events</p>
                </div>
                <button
                  onClick={() => updateConsent('email', !emailConsent)}
                  disabled={saving}
                  className={`w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${
                    emailConsent ? 'bg-[#00d083]' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    emailConsent ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-300 leading-relaxed">
                  <strong>Note:</strong> Service notifications (offer claimed, reward updates) will still be sent regardless of these settings. 
                  These toggles only control promotional messages.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
        <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
            Preferences
          </CardTitle>
          <p className="text-slate-400">Customize your Qwikker experience</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-white font-medium mb-3">Favorite Categories</p>
            <div className="flex flex-wrap gap-2">
              {['Restaurant', 'Cafe', 'Bar', 'Takeaway', 'Family', 'Fine Dining', 'Fast Food'].map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setPreferences(prev => ({
                      ...prev,
                      categories: prev.categories.includes(category)
                        ? prev.categories.filter(c => c !== category)
                        : [...prev.categories, category]
                    }))
                  }}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    preferences.categories.includes(category)
                      ? 'bg-[#00d083] text-black'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-white font-medium mb-3">Preferred Days</p>
            <div className="flex flex-wrap gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <button
                  key={day}
                  onClick={() => {
                    setPreferences(prev => ({
                      ...prev,
                      days: prev.days.includes(day)
                        ? prev.days.filter(d => d !== day)
                        : [...prev.days, day]
                    }))
                  }}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    preferences.days.includes(day)
                      ? 'bg-[#00d083] text-black'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-white font-medium mb-3">Search Radius</p>
            <div className="flex gap-2">
              {['1 mile', '3 miles', '5 miles', '10 miles'].map((radius) => (
                <button
                  key={radius}
                  onClick={() => setPreferences(prev => ({ ...prev, radius }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    preferences.radius === radius
                      ? 'bg-[#00d083] text-black'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {radius}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* City & Location */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
        <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
            City & Location
          </CardTitle>
          <p className="text-slate-400">Manage your city settings and location preferences</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg">
            <div>
              <p className="text-white font-medium">Current City</p>
              <p className="text-blue-400 text-lg font-semibold">{cityDisplayName}</p>
              <p className="text-slate-400 text-sm">
                {stats ? `${stats.totalBusinesses} businesses • ${stats.totalOffers} active offers` : 'Loading...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {cityDisplayName[0].toUpperCase()}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
            <p className="text-white font-medium mb-2">Traveling?</p>
            <p className="text-slate-400 text-sm mb-3">
              If you're visiting another city, we can suggest installing additional Qwikker passes for those locations.
            </p>
            <Button variant="outline" className="border-slate-500 text-slate-300 hover:bg-slate-700">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Detect My Location
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
        <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start border-slate-500 text-slate-300 hover:bg-slate-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Profile
          </Button>
          
          <Button variant="outline" className="w-full justify-start border-slate-500 text-slate-300 hover:bg-slate-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Privacy Settings
          </Button>
          
          <Button variant="outline" className="w-full justify-start border-slate-500 text-slate-300 hover:bg-slate-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Help & Support
          </Button>
          
          <Button variant="outline" className="w-full justify-start border-red-500/50 text-red-400 hover:bg-red-500/10">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
