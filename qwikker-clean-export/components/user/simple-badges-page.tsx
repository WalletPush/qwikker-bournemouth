'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SimpleBadgesPageProps {
  walletPassId?: string
}

// Expanded badge system with challenging achievements
const simpleBadges = [
  // COMMON BADGES - Easy to get
  {
    id: 'welcome',
    name: 'Welcome!',
    description: 'Joined Qwikker',
    icon: 'star',
    rarity: 'common',
    autoAward: true
  },
  {
    id: 'first_offer',
    name: 'Deal Hunter',
    description: 'Claimed your first offer',
    icon: 'target',
    rarity: 'common',
    trigger: 'offer_claimed'
  },
  {
    id: 'chat_starter',
    name: 'Chat Master',
    description: 'Used AI chat feature',
    icon: 'chat',
    rarity: 'common',
    trigger: 'ai_chat_used'
  },
  {
    id: 'browser',
    name: 'Window Shopper',
    description: 'Browsed businesses page',
    icon: 'eye',
    rarity: 'common',
    trigger: 'discover_page_visited'
  },
  
  // RARE BADGES - Moderate challenge
  {
    id: 'secret_seeker',
    name: 'Secret Seeker',
    description: 'Unlocked your first secret menu',
    icon: 'search',
    rarity: 'rare',
    trigger: 'secret_menu_unlocked'
  },
  {
    id: 'offer_master',
    name: 'Offer Master',
    description: 'Claimed 10 different offers',
    icon: 'trophy',
    rarity: 'rare',
    trigger: 'ten_offers_claimed'
  },
  {
    id: 'social_sharer',
    name: 'Social Butterfly',
    description: 'Shared 5 businesses or offers',
    icon: 'share',
    rarity: 'rare',
    trigger: 'five_shares_completed'
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Used app after midnight',
    icon: 'moon',
    rarity: 'rare',
    trigger: 'used_after_midnight'
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Active every weekend for a month',
    icon: 'calendar',
    rarity: 'rare',
    trigger: 'weekend_streak_month'
  },
  
  // EPIC BADGES - Hard to achieve
  {
    id: 'secret_master',
    name: 'Secret Master',
    description: 'Unlocked 25 secret menu items',
    icon: 'key',
    rarity: 'epic',
    trigger: 'twenty_five_secrets_unlocked'
  },
  {
    id: 'deal_legend',
    name: 'Deal Legend',
    description: 'Claimed 50 offers total',
    icon: 'crown',
    rarity: 'epic',
    trigger: 'fifty_offers_claimed'
  },
  {
    id: 'loyalty_champion',
    name: 'Loyalty Champion',
    description: 'Active for 30 consecutive days',
    icon: 'fire',
    rarity: 'epic',
    trigger: 'thirty_day_streak'
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Used app before 6am 10 times',
    icon: 'sunrise',
    rarity: 'epic',
    trigger: 'ten_early_morning_uses'
  },
  {
    id: 'chat_enthusiast',
    name: 'Chat Enthusiast',
    description: 'Had 100+ AI chat conversations',
    icon: 'message',
    rarity: 'epic',
    trigger: 'hundred_chat_conversations'
  },
  {
    id: 'local_expert',
    name: 'Local Expert',
    description: 'Visited 20+ different businesses',
    icon: 'map',
    rarity: 'epic',
    trigger: 'twenty_businesses_visited'
  },
  
  // LEGENDARY BADGES - Ultra Rare
  {
    id: 'qwikker_legend',
    name: 'Qwikker Legend',
    description: 'Earned ALL other badges',
    icon: 'diamond',
    rarity: 'legendary'
  },
  {
    id: 'city_champion',
    name: 'City Champion',
    description: 'Active for 365 consecutive days',
    icon: 'trophy-star',
    rarity: 'legendary'
  }
]

export function SimpleBadgesPage({ walletPassId }: SimpleBadgesPageProps) {
  
  // Use actual badge tracker
  const [badgeProgress, setBadgeProgress] = useState<any[]>([])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { getBadgeTracker } = require('@/lib/utils/simple-badge-tracker')
      const tracker = getBadgeTracker(walletPassId)
      const progress = tracker.getBadgeProgress()
      setBadgeProgress(progress)
    }
  }, [walletPassId])
  
  const earnedBadges = badgeProgress.filter(b => b.earned)
  const earnedBadgeIds = earnedBadges.map(b => b.id)
  const earnedCount = earnedBadges.length

  const renderBadgeIcon = (iconName: string, className: string = "w-8 h-8") => {
    const iconProps = {
      className,
      fill: "none",
      stroke: "currentColor",
      viewBox: "0 0 24 24",
      strokeWidth: 2,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const
    }

    switch (iconName) {
      case 'star':
        return (
          <svg {...iconProps}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        )
      case 'target':
        return (
          <svg {...iconProps}>
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        )
      case 'chat':
        return (
          <svg {...iconProps}>
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        )
      case 'search':
        return (
          <svg {...iconProps}>
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        )
      case 'map':
        return (
          <svg {...iconProps}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        )
      case 'fire':
        return (
          <svg {...iconProps}>
            <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
          </svg>
        )
      case 'eye':
        return (
          <svg {...iconProps}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )
      case 'trophy':
        return (
          <svg {...iconProps}>
            <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 .55.47.98.97 1.21C12.04 18.75 14 20.24 14 22"/>
            <path d="M14 14.66V17c0 .55-.47.98-.97 1.21C11.96 18.75 10 20.24 10 22"/>
            <path d="M18 2H6v7a6 6 0 0012 0V2Z"/>
          </svg>
        )
      case 'share':
        return (
          <svg {...iconProps}>
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
            <polyline points="16,6 12,2 8,6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
        )
      case 'moon':
        return (
          <svg {...iconProps}>
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        )
      case 'calendar':
        return (
          <svg {...iconProps}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        )
      case 'key':
        return (
          <svg {...iconProps}>
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
        )
      case 'crown':
        return (
          <svg {...iconProps}>
            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm0 16h20"/>
          </svg>
        )
      case 'sunrise':
        return (
          <svg {...iconProps}>
            <path d="M17 18a5 5 0 00-10 0"/>
            <line x1="12" y1="2" x2="12" y2="9"/>
            <line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/>
            <line x1="1" y1="18" x2="3" y2="18"/>
            <line x1="21" y1="18" x2="23" y2="18"/>
            <line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/>
            <line x1="23" y1="22" x2="1" y2="22"/>
            <polyline points="8,6 12,2 16,6"/>
          </svg>
        )
      case 'message':
        return (
          <svg {...iconProps}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        )
      case 'diamond':
        return (
          <svg {...iconProps}>
            <path d="M6 3h12l4 6-10 13L2 9l4-6z"/>
            <path d="M6 3l6 13 6-13"/>
            <path d="M2 9h20"/>
          </svg>
        )
      case 'trophy-star':
        return (
          <svg {...iconProps}>
            <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
            <path d="M4 22h16"/>
            <path d="M18 2H6v7a6 6 0 0012 0V2Z"/>
            <polygon points="12,2 15,8 22,9 17,14 18,21 12,18 6,21 7,14 2,9 9,8"/>
          </svg>
        )
      default:
        return (
          <svg {...iconProps}>
            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
          </svg>
        )
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-500 to-gray-600'
      case 'rare': return 'from-blue-500 to-blue-600' 
      case 'epic': return 'from-purple-500 to-purple-600'
      case 'legendary': return 'from-yellow-400 to-orange-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-500/50'
      case 'rare': return 'border-blue-500/50' 
      case 'epic': return 'border-purple-500/50'
      case 'legendary': return 'border-yellow-400/50'
      default: return 'border-gray-500/50'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Enhanced Header */}
      <div className="relative">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-cyan-500/5 rounded-2xl blur-xl"></div>
        
        <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-center">
          {/* Trophy icon with animation */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-400/20 hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              {/* Floating particles */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full animate-ping"></div>
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-4">
            Your Achievements
          </h1>
          <p className="text-xl text-slate-300 mb-6">Unlock your potential as you explore Qwikker</p>
          
          {/* Quick stats */}
          <div className="flex justify-center items-center gap-6 sm:gap-8">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-400">{earnedCount}</div>
              <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-wide">Earned</div>
            </div>
            <div className="w-px h-10 bg-slate-600"></div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-400">{simpleBadges.length - earnedCount}</div>
              <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-wide">Remaining</div>
            </div>
            <div className="w-px h-10 bg-slate-600"></div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-400">{Math.round((earnedCount / simpleBadges.length) * 100)}%</div>
              <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-wide">Complete</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <Card className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 border-slate-700/50">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl font-bold text-slate-100">Progress Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-300 font-medium">Badges Earned</span>
            <span className="text-slate-300 font-bold">{earnedBadges.length}/{simpleBadges.length}</span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden border border-slate-600/50">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-700 ease-out shadow-lg shadow-blue-500/20"
              style={{ width: `${(earnedBadges.length / simpleBadges.length) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Badges Grid */}
      <div className="space-y-6">
        {['common', 'rare', 'epic', 'legendary'].map(rarity => {
          const categoryBadges = simpleBadges.filter(b => b.rarity === rarity)
          const categoryEarned = categoryBadges.filter(b => earnedBadgeIds.includes(b.id)).length
          
          return (
            <div key={rarity} className="space-y-6">
              <div className="relative">
                {/* Category header with enhanced styling */}
                <div className={`relative bg-gradient-to-r ${getRarityColor(rarity)} p-0.5 rounded-xl`}>
                  <div className="bg-slate-900 rounded-xl px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${getRarityColor(rarity)} shadow-lg`}></div>
                        <h3 className="text-2xl font-bold text-slate-100 capitalize">
                          {rarity} {rarity === 'legendary' ? '✨' : ''} Achievements
                        </h3>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-slate-300">
                          {categoryEarned}/{categoryBadges.length}
                        </div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide">
                          {Math.round((categoryEarned / categoryBadges.length) * 100)}% Complete
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5">
                      <div 
                        className={`h-full bg-gradient-to-r ${getRarityColor(rarity)} rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${(categoryEarned / categoryBadges.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryBadges.map((badge) => {
                  const progressBadge = badgeProgress.find(b => b.id === badge.id)
                  const isEarned = progressBadge?.earned || false
                  
                  return (
                    <Card 
                      key={badge.id}
                      className={`
                        relative transition-all duration-300 hover:scale-[1.02] group cursor-pointer
                        ${isEarned 
                          ? `bg-gradient-to-br from-slate-800/90 to-slate-900/90 border ${getRarityBorder(badge.rarity)} shadow-lg hover:shadow-xl`
                          : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800/70 hover:border-slate-600/70'}
                        h-full overflow-hidden
                      `}
                    >
                      <CardContent className="p-6 text-center space-y-4">
                        {/* Badge Icon */}
                        <div className="relative flex justify-center">
                          <div className={`
                            relative w-16 h-16 rounded-full flex items-center justify-center
                            bg-gradient-to-br ${getRarityColor(badge.rarity)}
                            ${isEarned 
                              ? `border-2 ${getRarityBorder(badge.rarity)} shadow-lg group-hover:shadow-xl group-hover:scale-110` 
                              : 'border-2 border-slate-600/50 opacity-50 group-hover:opacity-70'}
                            transition-all duration-300
                          `}>
                            <div className={`${isEarned ? 'text-white' : 'text-slate-400'} transition-colors duration-300`}>
                              {renderBadgeIcon(badge.icon, "w-7 h-7")}
                            </div>
                            
                            {/* Completion checkmark */}
                            {isEarned && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-slate-800">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Badge Info */}
                        <div>
                          <h4 className={`font-semibold text-lg ${isEarned ? 'text-slate-100' : 'text-slate-400'}`}>
                            {badge.name}
                          </h4>
                          <p className={`text-sm mt-1 ${isEarned ? 'text-slate-300' : 'text-slate-500'}`}>
                            {badge.description}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="pt-2">
                          {isEarned ? (
                            <div className="text-green-400 text-sm font-medium">
                              ✓ Earned
                            </div>
                          ) : progressBadge?.progress ? (
                            <div className="space-y-1">
                              <div className="text-slate-400 text-xs">
                                {progressBadge.progress.current}/{progressBadge.progress.target}
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-1.5">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-300"
                                  style={{ width: `${(progressBadge.progress.current / progressBadge.progress.target) * 100}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-500 text-sm">
                              Not yet earned
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
