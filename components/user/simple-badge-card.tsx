'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface SimpleBadgeCardProps {
  walletPassId?: string
  userProfile?: any
}

// Expanded badge system with challenging achievements
const simpleBadges = [
  // COMMON BADGES
  { id: 'welcome', name: 'Welcome!', description: 'Joined Qwikker', icon: 'star', rarity: 'common' },
  { id: 'first_offer', name: 'Deal Hunter', description: 'Claimed your first offer', icon: 'target', rarity: 'common' },
  { id: 'chat_starter', name: 'Chat Master', description: 'Used AI chat feature', icon: 'chat', rarity: 'common' },
  { id: 'browser', name: 'Window Shopper', description: 'Browsed businesses page', icon: 'eye', rarity: 'common' },
  
  // RARE BADGES
  { id: 'secret_seeker', name: 'Secret Seeker', description: 'Unlocked your first secret menu', icon: 'search', rarity: 'rare' },
  { id: 'offer_master', name: 'Offer Master', description: 'Claimed 10 different offers', icon: 'trophy', rarity: 'rare' },
  { id: 'social_sharer', name: 'Social Butterfly', description: 'Shared 5 businesses or offers', icon: 'share', rarity: 'rare' },
  { id: 'night_owl', name: 'Night Owl', description: 'Used app after midnight', icon: 'moon', rarity: 'rare' },
  { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Active every weekend for a month', icon: 'calendar', rarity: 'rare' },
  
  // EPIC BADGES
  { id: 'secret_master', name: 'Secret Master', description: 'Unlocked 25 secret menu items', icon: 'key', rarity: 'epic' },
  { id: 'deal_legend', name: 'Deal Legend', description: 'Claimed 50 offers total', icon: 'crown', rarity: 'epic' },
  { id: 'loyalty_champion', name: 'Loyalty Champion', description: 'Active for 30 consecutive days', icon: 'fire', rarity: 'epic' },
  { id: 'early_bird', name: 'Early Bird', description: 'Used app before 6am 10 times', icon: 'sunrise', rarity: 'epic' },
  { id: 'chat_enthusiast', name: 'Chat Enthusiast', description: 'Had 100+ AI chat conversations', icon: 'message', rarity: 'epic' },
  { id: 'local_expert', name: 'Local Expert', description: 'Visited 20+ different businesses', icon: 'map', rarity: 'epic' },
  
  // LEGENDARY BADGES
  { id: 'qwikker_legend', name: 'Qwikker Legend', description: 'Earned ALL other badges', icon: 'diamond', rarity: 'legendary' },
  { id: 'city_champion', name: 'City Champion', description: 'Active for 365 consecutive days', icon: 'trophy-star', rarity: 'legendary' }
]

export function SimpleBadgeCard({ walletPassId, userProfile }: SimpleBadgeCardProps) {
  
  // Helper function to append wallet_pass_id to navigation URLs
  const getNavUrl = (href: string) => {
    if (!walletPassId) {
      return href
    }
    return `${href}?wallet_pass_id=${walletPassId}`
  }

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
  
  const totalBadges = simpleBadges.length
  const earnedCount = badgeProgress.filter(b => b.earned).length
  const earnedBadgeIds = badgeProgress.filter(b => b.earned).map(b => b.id)

  const renderBadgeIcon = (iconName: string, className: string = "w-5 h-5") => {
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
      default: return 'from-gray-500 to-gray-600'
    }
  }

  return (
    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 shadow-lg shadow-slate-900/20">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30">
              {renderBadgeIcon('star', "w-6 h-6 text-blue-400")}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-100">Achievements</h3>
              <p className="text-slate-400">Your progress milestones</p>
            </div>
          </div>
          
          {/* Badge Progress */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-300">Badges Earned</span>
              <span className="text-slate-300 font-bold">{earnedCount}/{totalBadges}</span>
            </div>
            
            <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden border border-slate-600/50">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${(earnedCount / totalBadges) * 100}%` }}
              />
            </div>
          </div>

          {/* Recent Badges */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-300">Recent Achievements</h4>
            <div className="flex gap-2 flex-wrap">
              {simpleBadges.slice(0, 4).map((badge) => {
                const isEarned = earnedBadgeIds.includes(badge.id)
                return (
                  <div 
                    key={badge.id}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      bg-gradient-to-br ${getRarityColor(badge.rarity)}
                      ${isEarned 
                        ? 'border border-blue-400/50 shadow-sm' 
                        : 'border border-slate-600/50 opacity-30'}
                      transition-all duration-300
                    `}
                    title={badge.name}
                  >
                    <div className={`${isEarned ? 'text-white' : 'text-slate-500'}`}>
                      {renderBadgeIcon(badge.icon, "w-4 h-4")}
                    </div>
                  </div>
                )
              })}
              {totalBadges > 4 && (
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-700/50 border border-slate-600/50 text-slate-400 text-xs">
                  +{totalBadges - 4}
                </div>
              )}
            </div>
          </div>

          {/* View All Button */}
          <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 shadow-lg transition-all duration-200">
            <Link href={getNavUrl("/user/badges")}>View All Badges</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
