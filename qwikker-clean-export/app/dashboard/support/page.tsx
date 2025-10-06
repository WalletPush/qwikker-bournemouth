import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'

export default async function SupportPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  // Get user profile data
  const { data: profile } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', data.claims.sub)
    .single()

  const actionItemsCount = calculateActionItemsCount(profile)

  return (
    <DashboardLayout currentSection="support" profile={profile} actionItemsCount={actionItemsCount}>
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Support Center</h1>
        <p className="text-gray-400">Get help with your QWIKKER account and features</p>
      </div>

      {/* Contact Support */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.83-.46l-3.17 1.59c-.36.18-.76-.02-.76-.43v-3.7c-1.74-1.93-2.9-4.41-2.9-7.17 0-4.418 3.582-8 8-8s8 3.582 8 8z" />
            </svg>
            Contact Our Support Team
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300">
            Our support team is here to help you get the most out of QWIKKER. Whether you need help setting up your account, uploading files, or understanding features, we're here for you.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Support
              </h3>
              <p className="text-gray-400 text-sm">Get detailed help via email</p>
              <Button asChild className="w-full bg-[#00d083] hover:bg-[#00b86f] text-black">
                <a href="mailto:support@qwikker.com">Email Support</a>
              </Button>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.83-.46l-3.17 1.59c-.36.18-.76-.02-.76-.43v-3.7c-1.74-1.93-2.9-4.41-2.9-7.17 0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                </svg>
                Live Chat
              </h3>
              <p className="text-gray-400 text-sm">Chat with us in real-time</p>
              <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700">
                Start Live Chat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Issues */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="border-l-2 border-[#00d083] pl-4">
              <h4 className="font-semibold text-white mb-2">How do I upload my business logo?</h4>
              <p className="text-gray-300 text-sm mb-2">
                Go to the Files page in your dashboard and click "Upload Logo". Supported formats: PNG, JPG, SVG (max 5MB).
              </p>
              <Button asChild variant="link" className="text-[#00d083] p-0 h-auto">
                <Link href="/dashboard/files">Go to Files →</Link>
              </Button>
            </div>
            
            <div className="border-l-2 border-[#00d083] pl-4">
              <h4 className="font-semibold text-white mb-2">How do I create my first offer?</h4>
              <p className="text-gray-300 text-sm mb-2">
                Visit the Offers page to create exclusive deals for your customers. You can create up to 3 offers during your free trial.
              </p>
              <Button asChild variant="link" className="text-[#00d083] p-0 h-auto">
                <Link href="/dashboard/offers">Go to Offers →</Link>
              </Button>
            </div>
            
            <div className="border-l-2 border-[#00d083] pl-4">
              <h4 className="font-semibold text-white mb-2">What happens when my free trial ends?</h4>
              <p className="text-gray-300 text-sm mb-2">
                Your 120-day free trial includes all Featured plan benefits. Before it ends, you can upgrade to continue accessing premium features.
              </p>
              <Button asChild variant="link" className="text-[#00d083] p-0 h-auto">
                <Link href="/dashboard/settings">View Plans →</Link>
              </Button>
            </div>
            
            <div className="border-l-2 border-[#00d083] pl-4">
              <h4 className="font-semibold text-white mb-2">How do I add secret menu items?</h4>
              <p className="text-gray-300 text-sm mb-2">
                Secret menu items are exclusive offerings that only your loyal customers know about. Create them in the Secret Menu section.
              </p>
              <Button asChild variant="link" className="text-[#00d083] p-0 h-auto">
                <Link href="/dashboard/secret-menu">Go to Secret Menu →</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started Guide */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Getting Started Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300 mb-4">
            Follow this checklist to get the most out of your QWIKKER experience:
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
              <div className="w-6 h-6 bg-[#00d083] rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-white">Complete your business profile information</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
              <div className="w-6 h-6 border-2 border-gray-400 rounded-full"></div>
              <span className="text-gray-300">Upload your business logo</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
              <div className="w-6 h-6 border-2 border-gray-400 rounded-full"></div>
              <span className="text-gray-300">Add your menu or service price list</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
              <div className="w-6 h-6 border-2 border-gray-400 rounded-full"></div>
              <span className="text-gray-300">Create your first exclusive offer</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
              <div className="w-6 h-6 border-2 border-gray-400 rounded-full"></div>
              <span className="text-gray-300">Add a secret menu item</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
              <div className="w-6 h-6 border-2 border-gray-400 rounded-full"></div>
              <span className="text-gray-300">Complete your social media links</span>
            </div>
          </div>
          <Button asChild className="w-full mt-4 bg-[#00d083] hover:bg-[#00b86f] text-black">
            <Link href="/dashboard/action-items">View Action Items →</Link>
          </Button>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Platform Status</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#00d083] rounded-full animate-pulse"></div>
              <span className="text-[#00d083] text-sm">All Systems Operational</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">File Upload Service</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#00d083] rounded-full animate-pulse"></div>
              <span className="text-[#00d083] text-sm">Online</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Dashboard</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#00d083] rounded-full animate-pulse"></div>
              <span className="text-[#00d083] text-sm">Online</span>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  )
}
