'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ElegantModal } from '@/components/ui/elegant-modal'
import { Bell, Send, Users, MousePointer, TrendingUp, Info, Plus } from 'lucide-react'

interface NotificationsPageClientProps {
  profile: any
}

interface NotificationStats {
  eligiblePasses: number
  sentCount: number
  clickThroughRate: number
}

export function NotificationsPageClient({ profile }: NotificationsPageClientProps) {
  const [showModal, setShowModal] = useState(true)
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('all')
  const [destination, setDestination] = useState('offers')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Stats state
  const [stats, setStats] = useState<NotificationStats>({
    eligiblePasses: 0,
    sentCount: 0,
    clickThroughRate: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  
  // Check if user has Spotlight or Pro subscription
  const hasSpotlightAccess = profile?.plan === 'spotlight' || profile?.plan === 'pro'

  // Fetch stats on mount
  useEffect(() => {
    if (!hasSpotlightAccess) {
      setStatsLoading(false)
      return
    }

    fetchStats()
  }, [hasSpotlightAccess])

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      setStatsError(null)
      
      const response = await fetch('/api/dashboard/notification-stats')
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats({
        eligiblePasses: data.eligiblePasses || 0,
        sentCount: data.sentCount || 0,
        clickThroughRate: data.clickThroughRate || 0
      })
    } catch (err: any) {
      console.error('Error fetching notification stats:', err)
      setStatsError(err.message || 'Failed to load stats')
    } finally {
      setStatsLoading(false)
    }
  }

  const handleAddFirstName = () => {
    setMessage(prev => prev + '{first_name}')
  }

  const handleSendNotification = async () => {
    if (!message.trim()) {
      setError('Message is required')
      return
    }

    if (message.length > 200) {
      setError('Message must be 200 characters or less')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      const payload: any = {
        message: message.trim(),
        audience: { type: audience },
        destination: { type: destination }
      }

      const response = await fetch('/api/walletpass/push-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send notification')
      }

      setSuccess(`✅ Notification sent to ${data.sentCount} pass holders!`)
      setMessage('')
      
      // Refresh stats after successful send
      await fetchStats()

    } catch (err: any) {
      setError(err.message || 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Show upgrade modal for non-Spotlight users */}
      {!hasSpotlightAccess && (
        <ElegantModal
          isOpen={showModal}
          onClose={() => {
            window.location.href = '/dashboard'
          }}
          title="Push Notifications"
          description="Send targeted push notifications to engage customers and promote your offers."
          type="info"
          size="md"
          actions={[
            {
              label: 'Upgrade to Spotlight',
              onClick: () => {
                window.location.href = '/dashboard/settings'
              },
              variant: 'default',
              className: 'bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold'
            }
          ]}
        >
          <div className="space-y-4">
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <h4 className="font-medium text-orange-400 mb-3">Engage Your Customers</h4>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Announce offers & secret items instantly</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Target all pass holders or offer claimers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Track clicks & engagement</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Short tracking links embedded automatically</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">
              Available on Spotlight • Users can opt in/out at any time
            </p>
          </div>
        </ElegantModal>
      )}

      {/* Content - blurred for non-Spotlight users */}
      <div className={!hasSpotlightAccess && showModal ? "blur-[8px] select-none pointer-events-none" : ""}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Push Notifications</h1>
          <p className="text-gray-400">Engage customers with targeted messaging</p>
        </div>

        {/* Instructional Banner */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm text-blue-300 leading-relaxed">
                <strong>How it works:</strong> Push notifications appear instantly on users' phones. 
                The Wallet pass shows only the latest message, but users can view the full history 
                in their Notifications tab.
              </p>
              <p className="text-xs text-blue-300/70">
                <strong>Limits:</strong> 20 pushes per month • 60 second cooldown between city pushes
              </p>
            </div>
          </div>
        </div>

        {/* Notification Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Eligible Passes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {statsLoading ? '--' : stats.eligiblePasses.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Active pass holders with marketing consent
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Send className="w-4 h-4" />
                Sent (30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {statsLoading ? '--' : stats.sentCount.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Total notifications sent this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <MousePointer className="w-4 h-4" />
                Click-Through Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {statsLoading ? '--' : `${stats.clickThroughRate}%`}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                % of recipients who tapped links
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Error */}
        {statsError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
            <p className="text-sm text-red-300">
              Failed to load stats: {statsError}
            </p>
          </div>
        )}

        {/* Eligible Passes Info */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-slate-300 mb-2">Who receives notifications?</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Eligible Pass Holders</strong> are users in your city with:
            (1) an active wallet pass, and (2) marketing consent enabled. 
            Users can toggle this in their Settings at any time.
          </p>
        </div>

        {/* Send Notification Form */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Send New Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Success/Error Messages */}
            {success && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm text-green-300">
                {success}
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Message Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">Message</label>
                <button
                  type="button"
                  onClick={handleAddFirstName}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add First Name
                </button>
              </div>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                maxLength={200}
                placeholder="We just added a new secret menu item! Come and check it out, {first_name}!"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-500">
                  <span className="text-slate-400">💡 Your business name is auto-added.</span> Use <code className="bg-slate-700 px-1 py-0.5 rounded text-blue-400">{'{first_name}'}</code> for personalization
                </p>
                <p className={`text-xs ${message.length > 180 ? 'text-yellow-400' : 'text-slate-500'}`}>
                  {message.length}/200
                </p>
              </div>
            </div>

            {/* Audience and Destination */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
                <select 
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Eligible Passes in City</option>
                  <option value="claimed">Users Who've Claimed Offers</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Destination</label>
                <select 
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="offers">Offers Page</option>
                  <option value="secret-menu">Secret Menu</option>
                  <option value="events">Events Page</option>
                  <option value="chat">Start Chat</option>
                  <option value="business">Business Page</option>
                </select>
              </div>
            </div>

            {/* Send Button */}
            <Button 
              onClick={handleSendNotification}
              disabled={sending || !message.trim()}
              className="w-full bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Send Notification'}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No notifications sent yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Your sent notifications will appear here
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tips for Effective Notifications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#00d083]" />
                Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#00d083] mt-1">•</span>
                  <span>Keep messages under 100 characters for best impact</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d083] mt-1">•</span>
                  <span>Use personalization: <code className="bg-slate-700 px-1 rounded text-xs">{'{first_name}'}</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d083] mt-1">•</span>
                  <span>Send during business hours for higher CTR</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MousePointer className="w-5 h-5 text-[#00d083]" />
                Tracking Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every notification includes a short tracking link automatically. 
                When users tap it, you'll see click-through metrics and they'll land on your chosen destination.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-[#00d083]" />
                Rate Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#00d083] mt-1">•</span>
                  <span><strong className="text-slate-300">20 pushes per month</strong> (Spotlight)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d083] mt-1">•</span>
                  <span><strong className="text-slate-300">60 second cooldown</strong> between city pushes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d083] mt-1">•</span>
                  <span>Protects users from spam</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
