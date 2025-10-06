'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ElegantModal } from '@/components/ui/elegant-modal'

interface NotificationsPageClientProps {
  profile: any
}

export function NotificationsPageClient({ profile }: NotificationsPageClientProps) {
  const [showModal, setShowModal] = useState(true)
  
  // Check if user has Spotlight or Pro subscription
  const hasSpotlightAccess = profile?.plan === 'spotlight' || profile?.plan === 'pro'
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
                  <span>Target all followers, nearby users, or loyalty members</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Schedule notifications or send immediately</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Track delivery, opens, clicks & redemptions</span>
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

      {/* Notification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">2,847</div>
            <p className="text-xs text-[#00d083] flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
              +12.4% this month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Sent This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">1,247</div>
            <p className="text-xs text-[#00d083] flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
              +28.7% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">68.2%</div>
            <p className="text-xs text-[#00d083] flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
              +5.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Click Through</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">24.8%</div>
            <p className="text-xs text-[#00d083] flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
              +3.2% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Send Notification */}
      <Card className="bg-slate-800/50 border-slate-700 mb-8">
        <CardHeader>
          <CardTitle className="text-white">Send New Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
            <textarea 
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white placeholder-gray-400"
              rows={3}
              placeholder="🎉 New secret menu item just dropped! Limited time only..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
              <select className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white">
                <option>All Subscribers</option>
                <option>Nearby Users Only</option>
                <option>Loyalty Members Only</option>
                <option>Recent Visitors</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Send Time</label>
              <select className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white">
                <option>Send Now</option>
                <option>Schedule for Later</option>
                <option>Best Time (AI Optimized)</option>
              </select>
            </div>
          </div>
          <Button className="w-full bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold">
            Send Notification
          </Button>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card className="bg-slate-800/50 border-slate-700 mb-8">
        <CardHeader>
          <CardTitle className="text-white">Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-white">🎉 New secret menu item just dropped!</h4>
                <p className="text-sm text-gray-400 mt-1">Sent to 2,847 subscribers • 2 hours ago</p>
              </div>
              <div className="text-right">
                <p className="text-[#00d083] font-semibold">72% opened</p>
                <p className="text-xs text-gray-400">28% clicked</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-white">☕ Happy Hour: 20% off all coffee drinks!</h4>
                <p className="text-sm text-gray-400 mt-1">Sent to 1,923 nearby users • 1 day ago</p>
              </div>
              <div className="text-right">
                <p className="text-[#00d083] font-semibold">68% opened</p>
                <p className="text-xs text-gray-400">31% clicked</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-white">🎂 Birthday treat for our loyalty members!</h4>
                <p className="text-sm text-gray-400 mt-1">Sent to 487 loyalty members • 3 days ago</p>
              </div>
              <div className="text-right">
                <p className="text-[#00d083] font-semibold">84% opened</p>
                <p className="text-xs text-gray-400">42% clicked</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Offer Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm">
              Instantly notify customers when new offers go live or when limited-time deals are about to expire.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secret Menu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm">
              Build excitement by announcing secret menu items exclusively to your most loyal customers.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location Based
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm">
              Send targeted messages to users who are nearby or have visited your location recently.
            </p>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}