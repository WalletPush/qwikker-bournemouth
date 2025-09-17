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

      {/* AI Companion - Smaller Hero Card */}
      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 border border-slate-700/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5"></div>
        
        <CardContent className="relative p-8">
          <div className="text-center space-y-4">
            {/* Smaller AI Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-lg opacity-30"></div>
                <div className="relative p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
                  <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Simplified Title */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-100">
                Your AI Companion
              </h2>
              <p className="text-slate-300 max-w-md mx-auto">
                Ask me anything about Bournemouth!
              </p>
            </div>

            {/* CTA Button */}
            <Button asChild className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-bold px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:shadow-emerald-500/30">
              <Link href="/user/chat">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Start Chatting
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400 mb-1">{mockBusinesses.length}</p>
          <p className="text-sm text-slate-400">Places</p>
          <p className="text-xs text-slate-500 mt-1">to discover</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-400 mb-1">{mockBusinesses.filter(b => b.hasSecretMenu).length}</p>
          <p className="text-sm text-slate-400">Secrets</p>
          <p className="text-xs text-slate-500 mt-1">to unlock</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-orange-400 mb-1">{mockOffers.length}</p>
          <p className="text-sm text-slate-400">Offers</p>
          <p className="text-xs text-slate-500 mt-1">to explore</p>
        </div>
      </div>

      {/* Hero Explore Places Card */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600 hover:border-[#00d083]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#00d083]/20 hover:scale-[1.02] overflow-hidden group">
        <div className="relative">
          {/* Enhanced Background with Animation */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#00d083]/20 to-[#00b86f]/10 group-hover:from-[#00d083]/30 group-hover:to-[#00b86f]/20 transition-all duration-500"></div>
          <div className="absolute top-4 right-4">
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-xs px-3 py-1.5 rounded-full font-bold shadow-lg animate-pulse flex items-center gap-1">
              ⭐ {qwikkerPicks.length} Staff Picks!
            </span>
          </div>
        </div>
        
        <CardContent className="relative p-8">
          <div className="flex items-center gap-6">
            {/* Large Icon with Pulse Effect */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-3xl blur-lg opacity-40 animate-pulse"></div>
                <div className="relative p-6 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-3xl shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-16 h-16 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-3xl font-bold text-slate-100 mb-2">Explore Places</h3>
                <p className="text-lg text-slate-300 mb-3">Discover amazing spots in Bournemouth</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-bold text-[#00d083]">{mockBusinesses.length}</p>
                  <p className="text-slate-400">places waiting for you</p>
                </div>
              </div>

              <Button asChild className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:brightness-110 text-black font-bold text-lg px-8 py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:shadow-emerald-500/40 hover:scale-105">
                <Link href="/user/discover">Start Exploring</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Offers Card with Previews */}
        <Card className="bg-gradient-to-br from-orange-900/20 to-amber-900/20 border-orange-700/30 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 hover:scale-105 overflow-hidden group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-amber-500/10 group-hover:from-orange-500/30 group-hover:to-amber-500/20 transition-all duration-500"></div>
            <div className="absolute top-3 right-3">
              <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg animate-bounce">
                🔥 NEW
              </span>
            </div>
          </div>
          
          <CardContent className="relative p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-100 mb-1">Exclusive Offers</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <p className="text-2xl font-bold text-orange-400">{mockOffers.length}</p>
                  <p className="text-xs text-slate-400">hot deals</p>
                </div>
              </div>

              {/* Mini Offer Previews */}
              <div className="space-y-2">
                {recentOffers.slice(0, 2).map((offer) => (
                  <div key={offer.id} className="bg-slate-800/50 rounded-lg p-2 hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{offer.value.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{offer.title}</p>
                        <p className="text-xs text-orange-400 font-bold">{offer.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button asChild className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white font-semibold shadow-lg shadow-orange-500/20 transition-all duration-200 hover:shadow-orange-500/30 text-sm py-2">
                <Link href="/user/offers">View All Offers</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rewards Card with Progress */}
        <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 overflow-hidden group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/10 group-hover:from-purple-500/30 group-hover:to-blue-500/20 transition-all duration-500"></div>
            <div className="absolute top-3 right-3">
              <span className="bg-gradient-to-r from-gray-400 to-gray-600 text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg flex items-center gap-1">
                🥈 {mockUserCredits.tier}
              </span>
            </div>
          </div>
          
          <CardContent className="relative p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-100 mb-1">Your Rewards</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    {mockUserCredits.balance}
                  </p>
                  <p className="text-xs text-slate-400">credits</p>
                </div>
              </div>

              {/* Progress to Next Tier */}
              <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-300">Next: Gold</span>
                  <span className="text-xs text-yellow-400 font-bold">{mockUserCredits.pointsToNextTier} to go</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
                    style={{ width: '60%' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Perk Preview */}
              <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg p-2">
                <p className="text-xs text-yellow-300 font-medium">🎁 Next perk: Free drink at Artisan Coffee</p>
              </div>

              <Button asChild className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:brightness-110 text-white font-semibold shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/30 text-sm py-2">
                <Link href="/user/credits">Claim Rewards</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Secret Menu - Mysterious Card */}
        <Card className="bg-gradient-to-br from-slate-900/80 to-black/60 border-amber-700/30 hover:border-amber-500/50 transition-all duration-500 hover:shadow-lg hover:shadow-amber-500/20 hover:scale-105 overflow-hidden group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 group-hover:from-amber-500/20 group-hover:to-yellow-500/10 transition-all duration-500"></div>
          
          {/* Mysterious Lock Overlay */}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-500 flex items-center justify-center opacity-60 group-hover:opacity-30">
            <svg className="w-16 h-16 text-amber-500/30 group-hover:text-amber-500/50 transition-all duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <div className="absolute top-3 right-3">
            <span className="bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg flex items-center gap-1 animate-pulse">
              🔑 VIP
            </span>
          </div>
          
          <CardContent className="relative p-4 z-10">
            <div className="space-y-3">
              {/* Header */}
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-100 mb-1">Secret Menu Club</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <p className="text-2xl font-bold text-amber-400">{mockBusinesses.filter(b => b.hasSecretMenu).length}</p>
                  <p className="text-xs text-slate-400">hidden dishes</p>
                </div>
              </div>

              {/* Mystique Tagline */}
              <div className="bg-slate-800/70 rounded-lg p-3 border border-amber-500/20">
                <p className="text-xs text-amber-300 font-medium text-center leading-relaxed">
                  "Exclusive dishes you won't find on the menu"
                </p>
              </div>

              <Button asChild className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:brightness-110 text-black font-semibold shadow-lg shadow-amber-500/20 transition-all duration-200 hover:shadow-amber-500/30 text-sm py-2">
                <Link href="/user/secret-menu">Unlock Secrets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* AI Chat Widget */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-[1.01] group">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-100 mb-1">Ask Qwikker AI</h3>
              <p className="text-sm text-slate-300">"Where should I eat tonight?"</p>
            </div>
            <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold shadow-lg">
              <Link href="/user/chat">Ask AI</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
