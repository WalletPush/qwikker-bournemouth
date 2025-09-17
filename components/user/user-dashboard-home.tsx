'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { mockBusinesses, mockOffers, mockUserCredits } from '@/lib/mock-data/user-mock-data'

export function UserDashboardHome() {
  // Get featured businesses for quick access
  const qwikkerPicks = mockBusinesses.filter(b => b.tier === 'qwikker_picks').slice(0, 2)
  const recentOffers = mockOffers.slice(0, 2)
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Welcome back!</h1>
        <p className="text-gray-400 mt-1">Discover amazing local businesses and exclusive offers in Bournemouth.</p>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Quick Discover Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-lg">🌍</span>
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Discover Nearby
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-[#00d083]">{mockBusinesses.length}</p>
                <p className="text-sm text-gray-400">Local businesses</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm text-gray-300">{qwikkerPicks.length} Qwikker Picks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#00d083] rounded-full animate-pulse"></div>
                  <span className="text-sm text-[#00d083]">{mockBusinesses.filter(b => b.activeOffers > 0).length} with active offers</span>
                </div>
              </div>
              
              <Button asChild className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white">
                <Link href="/user/discover">Explore Businesses</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Offers Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-lg">💸</span>
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Latest Offers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-[#00d083]">{mockOffers.length}</p>
                <p className="text-sm text-gray-400">Active offers</p>
              </div>
              
              <div className="space-y-2">
                {recentOffers.map((offer) => (
                  <div key={offer.id} className="bg-slate-700/50 rounded-lg p-2">
                    <p className="font-medium text-white text-sm">{offer.title}</p>
                    <p className="text-xs text-gray-400">{offer.businessName}</p>
                  </div>
                ))}
              </div>
              
              <Button asChild variant="outline" className="w-full border-slate-600 text-gray-300 hover:bg-slate-700">
                <Link href="/user/offers">View All Offers</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Qwikker Credits Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Your Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-[#00d083]">{mockUserCredits.balance}</p>
                <p className="text-sm text-gray-400">{mockUserCredits.tier} tier</p>
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-300">Next tier</span>
                  <span className="text-sm text-[#00d083]">{mockUserCredits.pointsToNextTier} points to go</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[#00d083] to-[#00b86f] h-2 rounded-full" 
                    style={{ width: '60%' }}
                  ></div>
                </div>
              </div>
              
              <Button asChild className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white">
                <Link href="/user/credits">View Rewards</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Secret Menu Club Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-lg">🔑</span>
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secret Menu Club
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-[#00d083]">{mockBusinesses.filter(b => b.hasSecretMenu).length}</p>
                <p className="text-sm text-gray-400">Secret menus available</p>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✨</span>
                  <p className="text-sm text-purple-300 font-medium">
                    Exclusive items not on the regular menu
                  </p>
                </div>
                <p className="text-xs text-purple-200">
                  Discover hidden gems from your favorite businesses
                </p>
              </div>
              
              <Button asChild variant="outline" className="w-full border-purple-500 text-purple-300 hover:bg-purple-500/10">
                <Link href="/user/secret-menu">Explore Secret Menus</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Chat Preview Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              AI Companion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                <div className="bg-slate-600 rounded-lg p-2 text-sm text-gray-300">
                  Hi! I can help you discover amazing local businesses. What are you looking for?
                </div>
                <div className="bg-[#00d083] rounded-lg p-2 text-sm text-black ml-auto max-w-[80%]">
                  Show me the best coffee shops
                </div>
                <div className="bg-slate-600 rounded-lg p-2 text-sm text-gray-300">
                  I found 3 great coffee shops near you! ☕
                </div>
              </div>
              
              <Button asChild className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white">
                <Link href="/user/chat">Start Chatting</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Your Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-[#00d083]">12</p>
                <p className="text-xs text-gray-400">Businesses Visited</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[#00d083]">8</p>
                <p className="text-xs text-gray-400">Offers Claimed</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[#00d083]">5</p>
                <p className="text-xs text-gray-400">Reviews Written</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[#00d083]">3</p>
                <p className="text-xs text-gray-400">Secret Items Tried</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
