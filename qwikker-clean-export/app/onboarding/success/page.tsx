import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface SuccessPageProps {
  searchParams: Promise<{ email?: string }>
}

function SuccessContent({ email }: { email?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-slate-800/90 border-slate-700 backdrop-blur-sm shadow-2xl">
        <CardContent className="p-8 text-center space-y-8">
          {/* Success Animation */}
          <div className="space-y-4">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            {/* QWIKKER Logo */}
            <div className="flex justify-center">
              <img 
                src="/Qwikker Logo web.svg" 
                alt="QWIKKER" 
                className="h-12 w-auto animate-fade-in-down"
              />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
              Welcome to QWIKKER!
            </h1>
            <p className="text-xl text-gray-300">
              Your account has been created successfully
            </p>
            {email && (
              <p className="text-gray-400">
                We've sent a confirmation email to <span className="text-green-400 font-medium">{email}</span>
              </p>
            )}
          </div>

          {/* What's Next */}
          <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700 text-left">
            <h2 className="text-xl font-semibold mb-4 text-center text-[#00d083] flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              What happens next?
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-blue-400 text-sm">1</span>
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">Access Your Dashboard</h3>
                  <p className="text-gray-400 text-sm">
                    Complete your business profile with photos, hours, and description
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-400 text-sm">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">Admin Review</h3>
                  <p className="text-gray-400 text-sm">
                    Our team will review and approve your business (usually within 24 hours)
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-green-400 text-sm">3</span>
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">Go Live!</h3>
                  <p className="text-gray-400 text-sm">
                    Start attracting customers and creating exclusive offers
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Required vs Recommended */}
          <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-lg p-6 text-left">
            <h3 className="font-semibold mb-3 text-yellow-400 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Complete Your Profile
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-red-400 mb-2">Required Actions:</h4>
                <ul className="space-y-1 text-gray-400">
                  <li>• Business hours</li>
                  <li>• Business description</li>
                  <li>• Business tagline</li>
                  <li>• Logo upload</li>
                  <li>• Business photos</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-400 mb-2">Recommended:</h4>
                <ul className="space-y-1 text-gray-400">
                  <li>• Website URL</li>
                  <li>• Social media links</li>
                  <li>• Menu/services upload</li>
                  <li>• Create your first offer</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <Link href="/dashboard">
            <Button className="w-full h-12 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white font-semibold text-lg flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View My Dashboard
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
            </Link>
          </div>

          {/* Support */}
          <div className="text-center text-gray-400 text-sm">
            <p>Need help? Contact us at <span className="text-[#00d083]">support@qwikker.com</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams
  const email = params.email

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#00d083] border-t-transparent rounded-full"></div>
      </div>
    }>
      <SuccessContent email={email} />
    </Suspense>
  )
}