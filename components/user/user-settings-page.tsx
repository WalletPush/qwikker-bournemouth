'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockUserProfile } from '@/lib/mock-data/user-mock-data'

export function UserSettingsPage() {
  const [notifications, setNotifications] = useState({
    geoOffers: true,
    newBusinesses: true,
    secretMenus: false,
    weeklyDigest: true,
    sms: false
  })

  const [preferences, setPreferences] = useState({
    categories: ['Restaurant', 'Cafe', 'Bar'],
    days: ['Friday', 'Saturday', 'Sunday'],
    radius: '3 miles',
    priceRange: 'All'
  })

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const copyReferralLink = () => {
    const referralLink = `https://bournemouth.qwikker.com/join?ref=${mockUserProfile.referralCode}`
    navigator.clipboard.writeText(referralLink)
    alert('Referral link copied! Share it to earn 500 points per friend.')
  }

  const shareReferralLink = () => {
    const referralLink = `https://bournemouth.qwikker.com/join?ref=${mockUserProfile.referralCode}`
    const text = `Hey! I've been discovering amazing local businesses with Qwikker in Bournemouth. Join me and we'll both get rewards! ${referralLink}`
    
    if (navigator.share) {
      navigator.share({
        title: 'Join me on Qwikker!',
        text: text,
        url: referralLink
      })
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(text)
      alert('Referral message copied! Paste it anywhere to share!')
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center text-2xl font-bold text-black">
              D
            </div>
            <div>
              <CardTitle className="text-slate-100 text-xl">{mockUserProfile.name}</CardTitle>
              <p className="text-slate-400">{mockUserProfile.email}</p>
              <p className="text-[#00d083] text-sm font-medium">Level {mockUserProfile.level} • {mockUserProfile.totalPoints} points</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Referral Section - Highest Priority */}
      <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10 animate-pulse"></div>
        <CardHeader>
          <CardTitle className="text-slate-100 text-xl flex items-center gap-2">
            Refer Friends & Earn Big
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs px-2 py-1 rounded-full font-bold">
              500 POINTS EACH
            </span>
          </CardTitle>
            <p className="text-slate-300">
              Share Qwikker with friends and you'll both get 500 points when they join. 
              It's the fastest way to earn credits and unlock rewards.
            </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
            <p className="text-sm text-slate-400 mb-2">Your referral code:</p>
            <div className="flex items-center gap-2">
              <code className="bg-slate-700 text-[#00d083] px-3 py-2 rounded font-mono text-lg flex-1">
                {mockUserProfile.referralCode}
              </code>
              <Button
                onClick={copyReferralLink}
                variant="outline"
                className="border-[#00d083]/50 text-[#00d083] hover:bg-[#00d083]/10"
              >
                Copy Link
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={shareReferralLink}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              Share with Friends
            </Button>
            
            <div className="text-center p-3 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg">
              <p className="text-green-400 font-bold text-lg">{mockUserProfile.stats.friendsReferred}</p>
              <p className="text-slate-400 text-sm">Friends Referred</p>
            </div>
          </div>

            <div className="text-center text-sm text-slate-400">
              <p>Pro tip: Friends who join through your link get 100 bonus points too</p>
            </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600">
        <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
            Notifications
          </CardTitle>
          <p className="text-slate-400">Choose what updates you'd like to receive</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <div>
                <p className="text-white font-medium">Location-based Offers</p>
                <p className="text-slate-400 text-sm">Get notified when you're near businesses with active offers</p>
              </div>
              <button
                onClick={() => toggleNotification('geoOffers')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications.geoOffers ? 'bg-[#00d083]' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  notifications.geoOffers ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <div>
                <p className="text-white font-medium">New Businesses</p>
                <p className="text-slate-400 text-sm">Be the first to know when new businesses join Qwikker</p>
              </div>
              <button
                onClick={() => toggleNotification('newBusinesses')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications.newBusinesses ? 'bg-[#00d083]' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  notifications.newBusinesses ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <div>
                <p className="text-white font-medium">Secret Menu Updates</p>
                <p className="text-slate-400 text-sm">Get notified when new secret menu items are added</p>
              </div>
              <button
                onClick={() => toggleNotification('secretMenus')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications.secretMenus ? 'bg-[#00d083]' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  notifications.secretMenus ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <div>
                <p className="text-white font-medium">Weekly Digest</p>
                <p className="text-slate-400 text-sm">A summary of new offers, businesses, and your activity</p>
              </div>
              <button
                onClick={() => toggleNotification('weeklyDigest')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications.weeklyDigest ? 'bg-[#00d083]' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  notifications.weeklyDigest ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
              <div>
                <p className="text-white font-medium">SMS Notifications</p>
                <p className="text-slate-400 text-sm">Receive important updates via text message</p>
              </div>
              <button
                onClick={() => toggleNotification('sms')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications.sms ? 'bg-[#00d083]' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  notifications.sms ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
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
              <p className="text-blue-400 text-lg font-semibold">Bournemouth</p>
              <p className="text-slate-400 text-sm">4 businesses • 12 active offers</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
              B
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
