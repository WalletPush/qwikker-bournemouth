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
  franchiseCity?: string
}

export function UserDashboardHome({ stats, currentUser, walletPassId, franchiseCity }: UserDashboardHomeProps) {
  
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
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  
  useEffect(() => {
    const loadActivity = async () => {
      // Get real user activity from database
      const { getUserActivity } = await import('@/lib/actions/user-activity-actions')
      const userActivity = await getUserActivity(walletPassId, 8)
      
      // Get real business activity from database
      const { getRecentBusinessActivity } = await import('@/lib/actions/recent-activity-actions')
      const businessActivity = await getRecentBusinessActivity(franchiseCity)
      
      if (typeof window !== 'undefined') {
        // Get actual badge count from badge tracker
        const { getBadgeTracker } = require('@/lib/utils/simple-badge-tracker')
        const tracker = getBadgeTracker(walletPassId)
        const progress = tracker.getBadgeProgress()
        const earnedCount = progress.filter(b => b.earned).length
        setBadgeCount(earnedCount)
        
        // Get claimed offers count from real database data
        const claimedCount = userActivity.filter(activity => activity.type === 'offer_claim').length
        setClaimedOffersCount(claimedCount)
        
        // Convert user activity to display format
        const formattedUserActivity = userActivity.map(activity => ({
          id: activity.id,
          type: activity.type,
          icon: activity.iconType,
          text: activity.message,
          subtext: activity.business_name ? `at ${activity.business_name}` : '',
          color: activity.color.replace('text-', '').replace('-400', ''),
          href: activity.type === 'offer_claim' ? '/user/offers?filter=claimed' : 
                activity.type === 'business_visit' ? '/user/discover' : 
                activity.type === 'secret_unlock' ? '/user/discover' : '#',
          time: activity.time,
          timestamp: activity.timestamp
        }))
        
        // Legacy localStorage fallback for badges and other features
        const userId = walletPassId || 'anonymous-user'
        const claimedKey = `qwikker-claimed-${userId}`
        const claimed = JSON.parse(localStorage.getItem(claimedKey) || '[]')
        
        // Secret menu unlocks (still using localStorage until we migrate this)
        const unlockedKey = `qwikker-unlocked-secrets-${userId}`
        const unlocked = JSON.parse(localStorage.getItem(unlockedKey) || '[]')
        if (unlocked.length > 0 && !formattedUserActivity.some(a => a.type === 'secret_unlock')) {
          formattedUserActivity.push({
            id: 'recent-secrets',
            type: 'secret',
            icon: 'lock',
            text: `You unlocked ${unlocked.length} secret menu item${unlocked.length > 1 ? 's' : ''}`,
            subtext: 'Explore secret menus',
            color: 'purple',
            href: '/user/secret-menu',
            time: 'Recently',
            timestamp: new Date()
          })
        }
        
        // Badge achievements
        if (earnedCount > 0) {
          formattedUserActivity.push({
            id: 'recent-badges',
            type: 'achievement',
            icon: 'badge',
            text: `You earned ${earnedCount} achievement${earnedCount > 1 ? 's' : ''}`,
            subtext: 'View your progress',
            color: 'yellow',
            href: '/user/settings',
            time: 'Recently',
            timestamp: new Date()
          })
        }
        
        // Mix business activity with user activity
        const allActivity = [...businessActivity, ...formattedUserActivity]
        
        // Sort by timestamp (most recent first)
        allActivity.sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
        
        // If no activity at all, show welcome message
        if (allActivity.length === 0) {
          allActivity.push({
            id: 'welcome',
            type: 'welcome',
            icon: 'sparkles',
            text: 'Welcome to Qwikker!',
            subtext: 'Start exploring offers and businesses',
            color: 'green',
            href: '/user/offers',
            time: 'Now'
          })
        }
        
        setRecentActivity(allActivity.slice(0, 4)) // Show max 4 items
      }
    }
    
    loadActivity()
  }, [walletPassId])
  
  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Hello, <span className="bg-gradient-to-r from-[#00d083] to-[#00b86f] bg-clip-text text-transparent">{userName}</span>
        </h1>
        <p className="text-slate-400">Your AI companion is ready to help you discover {franchiseCity ? franchiseCity.charAt(0).toUpperCase() + franchiseCity.slice(1) : 'your city'}</p>
      </div>

      {/* AI Companion - Beautiful & Engaging */}
      <Card className="bg-gradient-to-br from-slate-900/50 via-emerald-900/20 to-slate-900/50 border border-emerald-500/40 relative overflow-hidden group hover:border-emerald-400/60 transition-all duration-300">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10 animate-pulse"></div>
        
        <CardContent className="relative p-6">
          <div className="text-center max-w-2xl mx-auto">
            {/* Icon */}
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl blur-xl opacity-60 animate-pulse"></div>
              <div className="relative p-4 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-2xl border-2 border-emerald-400/50 backdrop-blur-sm">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-white mb-2">
              Your AI Local Guide
            </h2>
            
            {/* Description */}
            <p className="text-slate-300 text-sm mb-5">
              Instant answers about {franchiseCity ? franchiseCity.charAt(0).toUpperCase() + franchiseCity.slice(1) : 'your city'}. Find restaurants, grab exclusive deals, discover events, and get personalized recommendations.
            </p>
            
            {/* Quick Suggestions - Clickable */}
            <div className="flex flex-wrap gap-2 justify-center mb-5">
              <Link 
                href={getNavUrl("/user/chat") + "&message=" + encodeURIComponent("Best place for dinner tonight")}
                className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 hover:border-emerald-500/50 rounded-lg text-xs text-slate-300 hover:text-emerald-300 transition-all cursor-pointer"
              >
                "Best place for dinner tonight"
              </Link>
              <Link 
                href={getNavUrl("/user/chat") + "&message=" + encodeURIComponent("Where can I get pizza?")}
                className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 hover:border-emerald-500/50 rounded-lg text-xs text-slate-300 hover:text-emerald-300 transition-all cursor-pointer"
              >
                "Where can I get pizza?"
              </Link>
              <Link 
                href={getNavUrl("/user/chat") + "&message=" + encodeURIComponent("Show me all current deals")}
                className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 hover:border-emerald-500/50 rounded-lg text-xs text-slate-300 hover:text-emerald-300 transition-all cursor-pointer"
              >
                "Show me all current deals"
              </Link>
              <Link 
                href={getNavUrl("/user/chat") + "&message=" + encodeURIComponent("What's happening this weekend?")}
                className="hidden sm:inline-flex px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 hover:border-emerald-500/50 rounded-lg text-xs text-slate-300 hover:text-emerald-300 transition-all cursor-pointer"
              >
                "What's happening this weekend?"
              </Link>
              <Link 
                href={getNavUrl("/user/chat") + "&message=" + encodeURIComponent("Find me a good cocktail bar")}
                className="hidden md:inline-flex px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 hover:border-emerald-500/50 rounded-lg text-xs text-slate-300 hover:text-emerald-300 transition-all cursor-pointer"
              >
                "Find me a good cocktail bar"
              </Link>
            </div>
            
            {/* CTA Button */}
            <Button asChild className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold px-8 py-6 text-base rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-200 hover:scale-105">
              <Link href={getNavUrl("/user/chat")}>
                <span className="flex items-center gap-2">
                  Start Chatting
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Cards - Bigger */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Discover Places */}
        <Link href={getNavUrl("/user/discover")} className="group">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors duration-200 cursor-pointer">
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
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 hover:border-orange-500/40 transition-colors duration-200 cursor-pointer">
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
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-colors duration-200 cursor-pointer">
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
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors duration-200 cursor-pointer">
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
            {/* Real Activity Items */}
            {recentActivity.map((activity) => {
              const getIconAndColor = (type: string, color: string) => {
                const colors = {
                  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
                  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
                  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
                  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' }
                }
                
                const icons = {
                  tag: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />,
                  lock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
                  badge: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 713.138-3.138z" />,
                  location: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></>,
                  sparkles: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                }
                
                return {
                  colorClasses: colors[color as keyof typeof colors] || colors.green,
                  icon: icons[activity.icon as keyof typeof icons] || icons.sparkles
                }
              }
              
              const { colorClasses, icon } = getIconAndColor(activity.type, activity.color)
              
              return (
                <Link key={activity.id} href={getNavUrl(activity.href)} className="group">
                  <div className={`flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:bg-slate-700/50 hover:${colorClasses.border} transition-all duration-200 cursor-pointer hover:opacity-80`}>
                    <div className={`w-8 h-8 ${colorClasses.bg} rounded-full flex items-center justify-center`}>
                      <svg className={`w-4 h-4 ${colorClasses.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {icon}
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">{activity.text}</p>
                      <p className="text-xs text-slate-400">{activity.subtext} • {activity.time}</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )
            })}
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
