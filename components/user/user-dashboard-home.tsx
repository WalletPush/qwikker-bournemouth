'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { SimpleBadgeCard } from '@/components/user/simple-badge-card'
import { useState, useEffect } from 'react'

interface UserDashboardHomeProps {
  stats?: {
    totalBusinesses: number
    totalOffers: number
    totalSecretMenus: number
  }
  currentUser?: any
  walletPassId?: string
  franchiseCity?: string
  currentCity?: string
  cityDisplayName?: string
  atlasEnabled?: boolean
}

export function UserDashboardHome({ stats, currentUser, walletPassId, franchiseCity, currentCity = 'bournemouth', cityDisplayName = 'Bournemouth', atlasEnabled = false }: UserDashboardHomeProps) {
  
  // Helper function to append wallet_pass_id to navigation URLs
  const getNavUrl = (href: string) => {
    if (!walletPassId) {
      return href
    }
    return `${href}?wallet_pass_id=${walletPassId}`
  }
  // Use real stats (no mock data fallback)
  const businessCount = stats?.totalBusinesses ?? 0
  const offerCount = stats?.totalOffers ?? 0
  const secretMenuCount = stats?.totalSecretMenus ?? 0
  
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
  const [savedItemsCount, setSavedItemsCount] = useState(0)
  
  useEffect(() => {
    const loadActivity = async () => {
      // Get real user activity from database
      const { getUserActivity } = await import('@/lib/actions/user-activity-actions')
      const userActivity = await getUserActivity(walletPassId, 8)
      
      // Get real business activity from database
      const { getRecentBusinessActivity } = await import('@/lib/actions/recent-activity-actions')
      const businessActivity = await getRecentBusinessActivity(franchiseCity)
      
      // Get saved items count
      const { getUserSavedItems } = await import('@/lib/actions/user-saved-actions')
      const savedResult = await getUserSavedItems(walletPassId)
      if (savedResult.success) {
        setSavedItemsCount(savedResult.count || 0)
      }
      
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
  
  // How It Works steps
  const [visibleStep, setVisibleStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleStep(prev => (prev + 1) % 4)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  const steps = [
    {
      number: "01",
      title: "Discover Amazing Places",
      description: `Explore ${cityDisplayName}'s best restaurants, cafes, bars, and hidden gems — all carefully curated by locals`,
      icon: (
        <svg className="w-16 h-16 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      color: "from-emerald-500 to-teal-500",
      bgColor: "from-emerald-500/20 to-teal-500/20",
      borderColor: "border-emerald-500/30"
    },
    {
      number: "02", 
      title: "Chat with Your AI Guide",
      description: "Ask our intelligent AI anything about menus, deals, secret items, or get personalized recommendations",
      icon: (
        <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: "from-blue-500 to-cyan-500",
      bgColor: "from-blue-500/20 to-cyan-500/20",
      borderColor: "border-blue-500/30"
    },
    {
      number: "03",
      title: "Grab Exclusive Deals",
      description: "Access special offers and add them to your mobile wallet — deals you won't find anywhere else",
      icon: (
        <svg className="w-16 h-16 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      color: "from-orange-500 to-red-500",
      bgColor: "from-orange-500/20 to-red-500/20",
      borderColor: "border-orange-500/30"
    },
    {
      number: "04",
      title: "Unlock Secret Menus",
      description: "Discover hidden menu items and off-menu specialties that only insiders know about",
      icon: (
        <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      color: "from-purple-500/30 to-pink-500/30",
      bgColor: "from-purple-500/10 to-pink-500/10",
      borderColor: "border-purple-500/20"
    }
  ]
  
  return (
    <div className="space-y-12">
      {/* Welcome Header */}
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="relative bg-slate-800/50 border border-slate-700 rounded-3xl p-12">
            <h1 className="text-5xl font-semibold tracking-tight text-white mb-6">
              Welcome to Qwikker, {userName}
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Your intelligent companion for discovering {franchiseCity ? franchiseCity.charAt(0).toUpperCase() + franchiseCity.slice(1) + "'s" : 'your city\'s'} best dining experiences. 
              We connect you with amazing local businesses through AI-powered recommendations, 
              exclusive deals, and insider knowledge.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100 mb-4">How Qwikker Works</h2>
          <p className="text-lg text-slate-300">Four simple steps to unlock {franchiseCity ? franchiseCity.charAt(0).toUpperCase() + franchiseCity.slice(1) + "'s" : 'your city\'s'} culinary secrets</p>
        </div>

        {/* Interactive Steps - Now Clickable */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            // Determine which page each step links to
            const stepLinks = [
              getNavUrl("/user/discover"), // Step 1: Discover
              getNavUrl("/user/chat"),     // Step 2: AI Chat
              getNavUrl("/user/offers"),   // Step 3: Offers
              getNavUrl("/user/secret-menu") // Step 4: Secret Menu
            ]
            
            return (
              <Link href={stepLinks[index]} key={index}>
                <Card 
                  className={`relative overflow-hidden transition-all duration-700 cursor-pointer ${
                    visibleStep === index 
                      ? `bg-gradient-to-br ${step.bgColor} border ${step.borderColor}` 
                      : 'bg-slate-800/50 border-slate-600/50 hover:border-slate-500/50'
                  }`}
                  style={{ 
                    height: '380px',
                    boxShadow: visibleStep === index 
                      ? '0 25px 50px -12px rgba(0, 208, 131, 0.15)' 
                      : '0 10px 25px -3px rgba(0, 0, 0, 0.3)'
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    setVisibleStep(index)
                    // Delay navigation to show the animation
                    setTimeout(() => {
                      window.location.href = stepLinks[index]
                    }, 300)
                  }}
                >
              <div className={`absolute inset-0 bg-gradient-to-r ${step.color} transition-opacity duration-700 ${
                visibleStep === index ? 'opacity-10' : 'opacity-0'
              }`}></div>
              
              <CardContent className="relative p-6 text-center h-full">
                {/* Step Number */}
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                    visibleStep === index 
                      ? `bg-gradient-to-r ${step.color} text-black` 
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {step.number}
                  </div>
                </div>

                {/* Icon */}
                <div className="absolute top-24 left-1/2 transform -translate-x-1/2">
                  <div className={`${visibleStep === index ? 'opacity-100' : 'opacity-60'}`}>
                    {step.icon}
                  </div>
                </div>

                {/* Title */}
                <div className="absolute top-44 left-6 right-6">
                  <h3 className={`text-lg font-bold ${
                    visibleStep === index ? 'text-slate-100' : 'text-slate-300'
                  }`}>
                    {step.title}
                  </h3>
                </div>

                {/* Description */}
                <div className="absolute top-56 left-6 right-6 bottom-6">
                  <p className={`text-sm leading-relaxed ${
                    visibleStep === index ? 'text-slate-200' : 'text-slate-400'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </CardContent>
            </Card>
              </Link>
            )
          })}
        </div>
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
                href={`${getNavUrl("/user/chat")}${walletPassId ? '&' : '?'}message=${encodeURIComponent("Best place for dinner tonight")}`}
                className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 hover:border-emerald-500/50 rounded-lg text-xs text-slate-300 hover:text-emerald-300 transition-all cursor-pointer"
              >
                "Best place for dinner tonight"
              </Link>
              <Link 
                href={`${getNavUrl("/user/chat")}${walletPassId ? '&' : '?'}message=${encodeURIComponent("Where can I get pizza?")}`}
                className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 hover:border-emerald-500/50 rounded-lg text-xs text-slate-300 hover:text-emerald-300 transition-all cursor-pointer"
              >
                "Where can I get pizza?"
              </Link>
              <Link 
                href={`${getNavUrl("/user/chat")}${walletPassId ? '&' : '?'}message=${encodeURIComponent("Show me all current deals")}`}
                className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 hover:border-emerald-500/50 rounded-lg text-xs text-slate-300 hover:text-emerald-300 transition-all cursor-pointer"
              >
                "Show me all current deals"
              </Link>
              <Link 
                href={`${getNavUrl("/user/chat")}${walletPassId ? '&' : '?'}message=${encodeURIComponent("What's happening this weekend?")}`}
                className="hidden sm:inline-flex px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 hover:border-emerald-500/50 rounded-lg text-xs text-slate-300 hover:text-emerald-300 transition-all cursor-pointer"
              >
                "What's happening this weekend?"
              </Link>
              <Link 
                href={`${getNavUrl("/user/chat")}${walletPassId ? '&' : '?'}message=${encodeURIComponent("Find me a good cocktail bar")}`}
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

      {/* Atlas Intro Card - Only show if enabled for this city */}
      {atlasEnabled && (
        <Card className="bg-slate-800/50 border border-slate-700 relative overflow-hidden group hover:border-slate-600 transition-all duration-300">
          <CardContent className="relative p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Icon */}
              <div className="relative flex-shrink-0">
                <div className="p-4 bg-slate-700/50 rounded-2xl border border-slate-600">
                  <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                {/* Title */}
                <h2 className="text-2xl font-bold text-white mb-2">
                  Explore {franchiseCity ? franchiseCity.charAt(0).toUpperCase() + franchiseCity.slice(1) : 'Your City'} with Atlas
                </h2>
                
                {/* Description */}
                <p className="text-slate-300 text-sm mb-4">
                  A live, AI-guided map that shows you exactly where to go — based on what you want, right now.
                </p>
                
                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Button asChild variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40">
                    <Link href={getNavUrl("/user/chat")}>
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Open Atlas
                      </span>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="border-slate-600 hover:border-slate-500 text-slate-300 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-700/50">
                    <Link href={`${getNavUrl("/user/chat")}${walletPassId ? '&' : '?'}message=${encodeURIComponent("Show me the best coffee shops on the map")}`}>
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Ask Atlas something
                      </span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Cards - Bigger */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Discover Places */}
        <Link href={getNavUrl("/user/discover")} className="group">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors duration-200 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-xl mx-auto mb-4 flex items-center justify-center border border-emerald-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500/30 to-amber-500/30 rounded-xl mx-auto mb-4 flex items-center justify-center border border-orange-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl mx-auto mb-4 flex items-center justify-center border border-purple-500/30">
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

        {/* Events */}
        <Link href={getNavUrl("/user/events")} className="group">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-colors duration-200 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-xl mx-auto mb-4 flex items-center justify-center border border-blue-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-100 text-base mb-2">Events</h3>
              <p className="text-blue-400 font-bold text-2xl">0</p>
              <p className="text-sm text-slate-400">upcoming</p>
            </CardContent>
          </Card>
        </Link>

        {/* Saved */}
        <Link href={getNavUrl("/user/saved")} className="group">
          <Card className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/20 hover:border-pink-500/40 transition-colors duration-200 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500/30 to-rose-500/30 rounded-xl mx-auto mb-4 flex items-center justify-center border border-pink-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-100 text-base mb-2">Saved</h3>
              <p className="text-pink-400 font-bold text-2xl">{savedItemsCount}</p>
              <p className="text-sm text-slate-400">places</p>
            </CardContent>
          </Card>
        </Link>

        {/* Achievements */}
        <Link href={getNavUrl("/user/badges")} className="group">
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors duration-200 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/30 to-amber-500/30 rounded-xl mx-auto mb-4 flex items-center justify-center border border-yellow-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
