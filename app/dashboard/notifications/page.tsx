import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  // Get user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', data.claims.sub)
    .single()

  return (
    <DashboardLayout currentSection="notifications" profile={profile}>
    <div className="space-y-6 relative">
      {/* Upgrade Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="bg-slate-800 border-slate-700 max-w-md w-full relative">
          {/* Close Button */}
          <Link 
            href="/dashboard"
            className="absolute top-4 right-4 w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-colors z-10"
          >
            <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <CardTitle className="text-2xl text-white mb-2">Unlock Push Notifications</CardTitle>
            <p className="text-gray-400">
              Send targeted push notifications to engage customers and promote your offers.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Announce offers & secret items instantly</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Target all followers or loyalty members</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Schedule notifications or send now</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Track performance in analytics</span>
              </div>
            </div>
            <Button asChild className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold">
              <Link href="/dashboard/settings">Upgrade to Spotlight</Link>
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Available on Spotlight plan • Users can opt in/out at any time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Blurred Background Content */}
      <div className="blur-[8px] select-none pointer-events-none">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Push Notifications</h1>
          <p className="text-gray-400">Engage your customers with targeted notifications</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <div className="text-2xl font-bold text-white">12,547</div>
              <p className="text-xs text-[#00d083] flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
                +8.7% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Open Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">24.3%</div>
              <p className="text-xs text-[#00d083] flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
                +2.1% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Click Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">8.7%</div>
              <p className="text-xs text-[#00d083] flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
                +1.3% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Create Notification */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Send New Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Compose */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message Title</label>
                  <div className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white">
                    New Offer Alert! 🎉
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message Content</label>
                  <div className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white min-h-[80px]">
                    Get 20% off your next coffee order! Limited time offer - claim now before it expires.
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
                  <div className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white">
                    All Subscribers (2,847 users)
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Schedule</label>
                  <div className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white">
                    Send Immediately
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-4">
                <h3 className="font-medium text-white">Notification Preview</h3>
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-600">
                  <div className="bg-slate-800 rounded-lg p-4 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-[#00d083] rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-white text-sm">Your Business Name</h4>
                          <span className="text-xs text-gray-400">now</span>
                        </div>
                        <h3 className="font-medium text-white mt-1">New Offer Alert! 🎉</h3>
                        <p className="text-sm text-gray-300 mt-1">
                          Get 20% off your next coffee order! Limited time offer - claim now before it expires.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <Button className="bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold px-8">
                    Send Notification
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
                <div className="w-12 h-12 bg-[#00d083] rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white">Weekend Special Offer</h4>
                  <p className="text-sm text-gray-400">Buy 2 get 1 free on all pastries this weekend!</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Sent 2 hours ago</span>
                    <span>•</span>
                    <span>2,847 delivered</span>
                    <span>•</span>
                    <span className="text-[#00d083]">28.3% opened</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-2 h-2 bg-[#00d083] rounded-full"></div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 12a8 8 0 1116 0c0 3-2 5-2 5H6s-2-2-2-5zM9 21h6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white">New Menu Item Alert</h4>
                  <p className="text-sm text-gray-400">Try our new signature burger - now available!</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Sent 1 day ago</span>
                    <span>•</span>
                    <span>2,834 delivered</span>
                    <span>•</span>
                    <span className="text-[#00d083]">31.7% opened</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white">Birthday Reward Reminder</h4>
                  <p className="text-sm text-gray-400">Don't forget to claim your free birthday treat!</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Sent 3 days ago</span>
                    <span>•</span>
                    <span>147 delivered</span>
                    <span>•</span>
                    <span className="text-[#00d083]">67.2% opened</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Templates */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Quick Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <h4 className="font-medium text-white mb-2">New Offer</h4>
                <p className="text-sm text-gray-400 mb-3">Announce special deals and limited-time offers</p>
                <Button className="w-full bg-slate-600 hover:bg-slate-500 text-white text-sm">
                  Use Template
                </Button>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <h4 className="font-medium text-white mb-2">Menu Update</h4>
                <p className="text-sm text-gray-400 mb-3">Share new menu items and seasonal specials</p>
                <Button className="w-full bg-slate-600 hover:bg-slate-500 text-white text-sm">
                  Use Template
                </Button>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <h4 className="font-medium text-white mb-2">Event Reminder</h4>
                <p className="text-sm text-gray-400 mb-3">Remind customers about upcoming events</p>
                <Button className="w-full bg-slate-600 hover:bg-slate-500 text-white text-sm">
                  Use Template
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </DashboardLayout>
  )
}
