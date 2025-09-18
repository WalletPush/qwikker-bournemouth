import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OnboardingSuccessPageProps {
  searchParams: Promise<{ email?: string }>
}

export default async function OnboardingSuccessPage({ searchParams }: OnboardingSuccessPageProps) {
  const params = await searchParams
  const userEmail = params.email
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center space-y-8">
          {/* Success Icon */}
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center shadow-lg shadow-[#00d083]/30">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Welcome to QWIKKER!
            </h1>
            <p className="text-xl text-gray-400">
              Your registration is complete and being processed
            </p>
          </div>

          {/* Next Steps Card */}
          <Card className="bg-slate-800/90 border-slate-700 backdrop-blur-sm text-left shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-[#00d083] flex items-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                What happens next?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                  <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="w-8 h-8 bg-[#00d083]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-[#00d083] font-semibold text-sm">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Account Ready</h3>
                    <p className="text-gray-400 text-sm">
                      Your account <strong className="text-white">{userEmail}</strong> is ready to use! You can login immediately.
                    </p>
                  </div>
                </div>

                  <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="w-8 h-8 bg-[#00d083]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-[#00d083] font-semibold text-xs">48h</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Business Verification</h3>
                    <p className="text-gray-400 text-sm">Our team will verify your business details and review your information</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-[#00d083]/10 to-[#00b86f]/10 border border-[#00d083]/30 rounded-lg">
                  <div className="w-8 h-8 bg-[#00d083] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#00d083]">Start Promoting!</h3>
                    <p className="text-gray-300 text-sm">You can now display <strong>table tents and window stickers</strong> to promote your offers and attract customers</p>
                  </div>
                </div>

                  <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="w-8 h-8 bg-[#00d083]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-[#00d083]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Go Live</h3>
                    <p className="text-gray-400 text-sm">Start attracting customers with your first offer and grow your business with QWIKKER</p>
                  </div>
                </div>
              </div>

              <div className="text-center p-6 bg-[#00d083]/10 border border-[#00d083]/30 rounded-lg">
                <p className="text-[#00d083] font-semibold text-lg">
                  📧 Check your email for next steps
                </p>
                <p className="text-gray-300 text-sm mt-2">
                  We'll send you everything you need to get started within the next 2 hours
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] to-[#00a05c] text-white font-semibold">
              <Link href={`/auth/login${userEmail ? `?email=${encodeURIComponent(userEmail)}` : ''}`}>
                Sign In to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <Link href="/">
                Return to Home
              </Link>
            </Button>
          </div>

          {/* Support Contact */}
          <div className="text-center text-sm text-gray-500">
            <p>Questions? Contact us at <a href="mailto:support@qwikker.com" className="text-[#00d083] hover:underline">support@qwikker.com</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}
