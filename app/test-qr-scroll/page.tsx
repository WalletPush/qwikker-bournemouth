import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestQRScrollPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            🎯 QR Auto-Scroll Test Page
          </h1>
          <p className="text-slate-400 mb-8">
            Test the auto-scroll and highlight functionality for QR deep linking
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Offers Test */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-orange-400">📋 Test Offers Page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300 text-sm">
                Test auto-scroll to specific business offers
              </p>
              <div className="space-y-2">
                <Link 
                  href="/user/offers?highlight=the-seaside-bistro"
                  className="block w-full p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg hover:bg-orange-500/20 transition-colors"
                >
                  <div className="text-orange-400 font-semibold">The Seaside Bistro Offer</div>
                  <div className="text-slate-400 text-xs">Should scroll to and highlight Seaside Bistro offer card</div>
                </Link>
                <Link 
                  href="/user/offers?highlight=artisan-coffee-co"
                  className="block w-full p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg hover:bg-orange-500/20 transition-colors"
                >
                  <div className="text-orange-400 font-semibold">Artisan Coffee Co. Offer</div>
                  <div className="text-slate-400 text-xs">Should scroll to and highlight Coffee Co. offer card</div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Secret Menu Test */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-purple-400">🤫 Test Secret Menu Page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300 text-sm">
                Test auto-scroll to specific business secret menus
              </p>
              <div className="space-y-2">
                <Link 
                  href="/user/secret-menu?highlight=the-seaside-bistro"
                  className="block w-full p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition-colors"
                >
                  <div className="text-purple-400 font-semibold">The Seaside Bistro Secret Menu</div>
                  <div className="text-slate-400 text-xs">Should scroll to and highlight Seaside Bistro secret menu</div>
                </Link>
                <Link 
                  href="/user/secret-menu?highlight=artisan-coffee-co"
                  className="block w-full p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition-colors"
                >
                  <div className="text-purple-400 font-semibold">Artisan Coffee Co. Secret Menu</div>
                  <div className="text-slate-400 text-xs">Should scroll to and highlight Coffee Co. secret menu</div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-[#00d083]">🚀 How the Auto-Scroll System Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-[#00d083] font-semibold mb-2">1. QR Code Scan</div>
                <div className="text-slate-400">
                  User scans Jerry's QR code → Goes to <code>/intent/jerry-offers-001</code>
                </div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-[#00d083] font-semibold mb-2">2. Intent Routing</div>
                <div className="text-slate-400">
                  System redirects to <code>/user/offers?highlight=jerry-s-burgers</code>
                </div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-[#00d083] font-semibold mb-2">3. Auto-Scroll & Highlight</div>
                <div className="text-slate-400">
                  Page loads → Finds Jerry's card → Scrolls smoothly → Glows green for 3 seconds
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Admin */}
        <div className="text-center">
          <Link 
            href="/admin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
