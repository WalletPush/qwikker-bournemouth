'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { mockBusinesses, mockOffers, mockUserCredits, mockUserProfile } from '@/lib/mock-data/user-mock-data'

export function UserDashboardHome() {
  // Get featured businesses for quick access
  const qwikkerPicks = mockBusinesses.filter(b => b.tier === 'qwikker_picks').slice(0, 2)
  const recentOffers = mockOffers.slice(0, 2)
  
  return (
    <div className="space-y-6">
      {/* Personalized Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-100 mb-2">
          Welcome back, <span className="bg-gradient-to-r from-[#00d083] to-[#00b86f] bg-clip-text text-transparent">David</span>
        </h1>
        <p className="text-xl text-slate-300 mb-1">Your Bournemouth adventure continues</p>
        <p className="text-slate-400">Discover amazing places, grab exclusive deals, and chat with your AI companion</p>
      </div>

      {/* AI Companion - Hero Card */}
      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 border border-slate-700/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5"></div>
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
        
        <CardContent className="relative p-12">
          <div className="text-center space-y-8">
            {/* Premium AI Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-3xl blur-xl opacity-30"></div>
                <div className="relative p-8 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-3xl border border-emerald-500/20 backdrop-blur-sm">
                  <svg className="w-16 h-16 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Elegant Title */}
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-slate-100">
                Meet Your AI Companion
              </h2>
              <p className="text-lg text-slate-300 max-w-lg mx-auto leading-relaxed">
                Your intelligent guide to Bournemouth's hidden gems, secret menus, and exclusive offers
              </p>
            </div>

            {/* Premium CTA */}
            <div className="pt-4">
              <Button asChild className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-bold text-lg px-10 py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:shadow-emerald-500/30">
                <Link href="/user/chat">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat with Your AI Companion
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400 mb-1">{mockBusinesses.length}</p>
          <p className="text-sm text-slate-400">Partner Venues</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-400 mb-1">{mockBusinesses.filter(b => b.hasSecretMenu).length}</p>
          <p className="text-sm text-slate-400">Secret Menus</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-orange-400 mb-1">{mockUserProfile.badges.filter(b => b.unlockedDate && b.reward).length}</p>
          <p className="text-sm text-slate-400">Rewards Earned</p>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Explore Local Gems Card */}
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600 hover:border-[#00d083]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#00d083]/10">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-lg">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              Explore Local Gems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-[#00d083] mb-1">{mockBusinesses.length}</p>
                <p className="text-sm text-slate-400">Amazing places to discover</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-yellow-300 font-medium">{qwikkerPicks.length} Qwikker Picks - Staff Favorites!</span>
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 rounded-lg p-2">
                  <div className="w-3 h-3 bg-[#00d083] rounded-full animate-pulse"></div>
                  <span className="text-sm text-[#00d083] font-medium">{mockBusinesses.filter(b => b.activeOffers > 0).length} with exclusive deals</span>
                </div>
              </div>
              
              <Button asChild className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:brightness-110 text-black font-semibold shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:shadow-emerald-500/30">
                <Link href="/user/discover">Start Exploring</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Exclusive Offers Card */}
        <Card className="bg-gradient-to-br from-orange-900/20 to-amber-900/20 border-orange-700/30 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              Exclusive Offers
              <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">NEW</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-orange-400 mb-1">{mockOffers.length}</p>
                <p className="text-sm text-slate-400">Special deals just for you</p>
              </div>
              
              <div className="space-y-2">
                {recentOffers.map((offer) => (
                  <div key={offer.id} className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-lg p-3 hover:from-orange-900/20 hover:to-amber-900/20 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-white text-sm">{offer.title}</p>
                        <p className="text-xs text-slate-400">{offer.businessName}</p>
                      </div>
                      <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        {offer.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button asChild variant="outline" className="w-full border-orange-500 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300">
                <Link href="/user/offers">View All Offers</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Qwikker Credits - Gamified */}
        <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              Your Rewards
              <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">{mockUserCredits.tier}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-1">
                  {mockUserCredits.balance}
                </p>
                <p className="text-sm text-slate-400">Credits earned</p>
              </div>
              
              <div className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-300">Next level</span>
                  <span className="text-sm text-purple-400 font-semibold">{mockUserCredits.pointsToNextTier} to go!</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-1000 ease-out animate-pulse" 
                    style={{ width: '60%' }}
                  ></div>
                </div>
                <p className="text-xs text-center text-slate-400 mt-2">Keep exploring to level up!</p>
              </div>
              
              <Button asChild className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:brightness-110 text-white font-semibold shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/30">
                <Link href="/user/credits">Claim Rewards</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Secret Menu Club - Mysterious */}
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-amber-700/30 hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-amber-600 to-yellow-600 rounded-lg">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              Secret Menu Club
              <span className="bg-amber-500 text-black text-xs px-2 py-1 rounded-full font-bold">VIP</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-amber-400 mb-1">{mockBusinesses.filter(b => b.hasSecretMenu).length}</p>
                <p className="text-sm text-slate-400">Hidden menus unlocked</p>
              </div>
              
              <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <p className="text-sm text-amber-300 font-medium">
                    Exclusive off-menu items
                  </p>
                </div>
                <p className="text-xs text-amber-200">
                  Discover chef's specials and hidden favorites that locals love
                </p>
              </div>
              
              <Button asChild variant="outline" className="w-full border-amber-500 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300">
                <Link href="/user/secret-menu">Unlock Secrets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>


        {/* Your Adventures - Gamified Stats */}
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600 hover:border-[#00d083]/30 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-lg">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              Your Adventures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-400">12</p>
                <p className="text-xs text-slate-400">Places Explored</p>
              </div>
              <div className="text-center bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg p-3">
                <p className="text-2xl font-bold text-red-400">8</p>
                <p className="text-xs text-slate-400">Deals Grabbed</p>
              </div>
              <div className="text-center bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-400">5</p>
                <p className="text-xs text-slate-400">Reviews Shared</p>
              </div>
              <div className="text-center bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-lg p-3">
                <p className="text-2xl font-bold text-amber-400">{mockUserProfile.badges.filter(b => b.unlockedDate).length}</p>
                <p className="text-xs text-slate-400">Badges Earned</p>
              </div>
            </div>
            
            {/* Recent Badge Achievement */}
            {mockUserProfile.badges.filter(b => b.unlockedDate).length > 0 && (
              <div className="mt-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🏆</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">Latest Achievement</p>
                    <p className="text-xs text-slate-400">
                      {mockUserProfile.badges.find(b => b.unlockedDate)?.name || 'Explorer'} - 
                      Keep exploring to unlock more!
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                    <Link href="/user/credits">View All</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
