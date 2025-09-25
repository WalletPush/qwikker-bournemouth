'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { mockBusinesses, mockOffers } from '@/lib/mock-data/user-mock-data'
import { SimpleBadgeCard } from '@/components/user/simple-badge-card'
import { useState, useEffect } from 'react'

interface UserDashboardHomeProps {
  stats?: {
    totalBusinesses: number
    totalOffers: number
    totalSecretMenus: number
    realBusinesses: number
    realOffers: number
  }
  currentUser?: any
  walletPassId?: string
}

export function UserDashboardHome({ stats, currentUser, walletPassId }: UserDashboardHomeProps) {
  
  // Helper function to append wallet_pass_id to navigation URLs
  const getNavUrl = (href: string) => {
    if (!walletPassId) {
      return href
    }
    return `${href}?wallet_pass_id=${walletPassId}`
  }
  // Use real stats or fallback to mock data
  const businessCount = stats?.totalBusinesses ?? mockBusinesses.length
  const offerCount = stats?.totalOffers ?? mockOffers.length
  const secretMenuCount = stats?.totalSecretMenus ?? mockBusinesses.filter(b => b.hasSecretMenu).length
  
  // Use real user data - currentUser should ALWAYS be provided by the dashboard page
  const userProfile = currentUser || {
    name: 'Welcome to Qwikker!',
    badges_earned: [],
    total_visits: 0,
    offers_claimed: 0,
    secret_menus_unlocked: 0
  }
  const userName = userProfile.name
  
  // Dynamic badge count using badge tracker
  const [badgeCount, setBadgeCount] = useState(0)
  const [claimedOffersCount, setClaimedOffersCount] = useState(0)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get actual badge count from badge tracker
      const { getBadgeTracker } = require('@/lib/utils/simple-badge-tracker')
      const tracker = getBadgeTracker(walletPassId)
      const progress = tracker.getBadgeProgress()
      const earnedCount = progress.filter(b => b.earned).length
      setBadgeCount(earnedCount)
      
      // Get claimed offers count from localStorage
      const userId = walletPassId || 'anonymous-user'
      const claimedKey = `qwikker-claimed-${userId}`
      const claimed = JSON.parse(localStorage.getItem(claimedKey) || '[]')
      setClaimedOffersCount(claimed.length)
    }
  }, [walletPassId])
  
  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Hello, <span className="bg-gradient-to-r from-[#00d083] to-[#00b86f] bg-clip-text text-transparent">{userName}</span>
        </h1>
        <p className="text-slate-400">Your AI companion is ready to help you discover Bournemouth</p>
      </div>

      {/* AI Companion Hero - Streamlined */}
      <Card className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5"></div>
        
        <CardContent className="relative p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-shrink-0 hidden xs:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-md opacity-30 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-xl opacity-20 animate-ping"></div>
                <div className="relative p-2 sm:p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 mb-1">Your AI Companion</h2>
              <p className="text-slate-300 text-xs sm:text-sm">Ask me anything about Bournemouth</p>
            </div>
            <div className="flex-shrink-0">
              <Button asChild className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-bold px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:shadow-emerald-500/30 touch-manipulation min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm md:text-base">
                <Link href={getNavUrl("/user/chat")}>Chat</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Cards - Bigger */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Discover Places */}
        <Link href={getNavUrl("/user/discover")} className="group">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200 hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-100 text-base mb-2">Discover</h3>
              <p className="text-emerald-400 font-bold text-2xl">{businessCount}</p>
              <p className="text-sm text-slate-400">places</p>
            </CardContent>
          </Card>
        </Link>

        {/* Offers */}
        <Link href={getNavUrl("/user/offers")} className="group">
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-200 hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-100 text-base mb-2">Offers</h3>
              <p className="text-orange-400 font-bold text-2xl">{offerCount}</p>
              <p className="text-sm text-slate-400">deals</p>
            </CardContent>
          </Card>
        </Link>

        {/* Secret Menu */}
        <Link href={getNavUrl("/user/secret-menu")} className="group">
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-200 hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-100 text-base mb-2">Secrets</h3>
              <p className="text-purple-400 font-bold text-2xl">{secretMenuCount}</p>
              <p className="text-sm text-slate-400">hidden</p>
            </CardContent>
          </Card>
        </Link>

        {/* Achievements */}
        <Link href={getNavUrl("/user/badges")} className="group">
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-200 hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-100 text-base mb-2">Badges</h3>
              <p className="text-yellow-400 font-bold text-2xl">{badgeCount}</p>
              <p className="text-sm text-slate-400">earned</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Activity Feed */}
      <Card className="bg-slate-800/40 border border-slate-700/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Recent Activity
            </CardTitle>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-[#00d083] rounded-full animate-pulse"></div>
              <span className="text-xs text-[#00d083] font-medium">LIVE</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Sample Activity Items - Clickable */}
            <Link href={getNavUrl("/user/business/the-seaside-bistro?highlight=offer-1")} className="group">
              <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:bg-slate-700/50 hover:border-orange-500/30 transition-all duration-200 cursor-pointer group-hover:scale-[1.02]">
                <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-200">New 2-for-1 offer at <span className="font-medium text-[#00d083]">The Seaside Bistro</span></p>
                  <p className="text-xs text-slate-400">2 minutes ago</p>
                </div>
                <svg className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link href={getNavUrl("/user/business/artisan-coffee-co?highlight=secret-menu")} className="group">
              <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:bg-slate-700/50 hover:border-purple-500/30 transition-all duration-200 cursor-pointer group-hover:scale-[1.02]">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-200">Secret menu item unlocked at <span className="font-medium text-[#00d083]">Artisan Coffee Co.</span></p>
                  <p className="text-xs text-slate-400">1 hour ago</p>
                </div>
                <svg className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link href={getNavUrl("/user/business/ocean-view-cafe?highlight=new-business")} className="group">
              <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:bg-slate-700/50 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer group-hover:scale-[1.02]">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-200">New business <span className="font-medium text-[#00d083]">Ocean View Cafe</span> joined Qwikker</p>
                  <p className="text-xs text-slate-400">3 hours ago</p>
                </div>
                <svg className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link href={getNavUrl("/user/badges?highlight=explorer")} className="group">
              <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:bg-slate-700/50 hover:border-yellow-500/30 transition-all duration-200 cursor-pointer group-hover:scale-[1.02]">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-200">Achievement unlocked: <span className="font-medium text-yellow-400">Explorer Badge</span></p>
                  <p className="text-xs text-slate-400">1 day ago</p>
                </div>
                <svg className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>

          {/* View All Activity Button */}
          <div className="mt-4 pt-3 border-t border-slate-600/30">
            <Button asChild variant="ghost" className="w-full text-slate-400 hover:text-slate-300 hover:bg-slate-700/50">
              <Link href={getNavUrl("/user/chat")}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Ask AI about recent updates
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
