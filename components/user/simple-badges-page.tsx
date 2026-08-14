'use client'

import React, { useState, useEffect } from 'react'

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

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return {
          label: 'Common',
          bar: 'from-[#00d083] to-teal-400',
          stamp: 'from-zinc-500 to-zinc-600',
          border: 'border-zinc-400/40',
          ink: 'text-zinc-100',
          glow: 'shadow-[#00d083]/20',
          header: 'border-[#00d083]/30 bg-[#00d083]/10',
        }
      case 'rare':
        return {
          label: 'Rare',
          bar: 'from-sky-400 to-blue-500',
          stamp: 'from-sky-500 to-blue-600',
          border: 'border-sky-400/50',
          ink: 'text-sky-100',
          glow: 'shadow-sky-500/25',
          header: 'border-sky-500/30 bg-sky-500/10',
        }
      case 'epic':
        return {
          label: 'Epic',
          bar: 'from-violet-400 to-purple-600',
          stamp: 'from-violet-500 to-purple-600',
          border: 'border-violet-400/50',
          ink: 'text-violet-100',
          glow: 'shadow-violet-500/25',
          header: 'border-violet-500/30 bg-violet-500/10',
        }
      case 'legendary':
        return {
          label: 'Legendary',
          bar: 'from-amber-400 to-orange-500',
          stamp: 'from-amber-400 to-orange-500',
          border: 'border-amber-400/50',
          ink: 'text-amber-50',
          glow: 'shadow-amber-500/30',
          header: 'border-amber-500/30 bg-amber-500/10',
        }
      default:
        return {
          label: rarity,
          bar: 'from-zinc-500 to-zinc-600',
          stamp: 'from-zinc-500 to-zinc-600',
          border: 'border-zinc-500/40',
          ink: 'text-zinc-100',
          glow: 'shadow-zinc-500/20',
          header: 'border-zinc-600 bg-zinc-800/60',
        }
    }
  }

  const percentComplete = Math.round((earnedCount / simpleBadges.length) * 100)

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8 px-1">
      {/* Compact branded header */}
      <div className="rounded-2xl border border-[#00d083]/30 bg-gradient-to-br from-[#00d083]/15 via-zinc-800 to-zinc-900 px-5 py-5 sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#00d083] font-semibold mb-1">
          Collectibles
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight">Achievements</h1>
        <p className="text-sm text-zinc-300 mt-1">
          Stamp your card as you explore Qwikker
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#00d083]">{earnedCount}</span>
            <span className="text-sm text-zinc-400">/ {simpleBadges.length} stamped</span>
          </div>
          <span className="text-xs font-semibold text-[#9dffc0] bg-[#00d083]/15 border border-[#00d083]/30 px-2.5 py-1 rounded-full">
            {percentComplete}%
          </span>
        </div>
        <div className="mt-3 w-full bg-zinc-900/80 rounded-full h-2 overflow-hidden border border-zinc-700/60">
          <div
            className="h-full bg-gradient-to-r from-[#00d083] to-teal-400 rounded-full transition-all duration-700"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Stamp cards by rarity */}
      <div className="space-y-5">
        {(['common', 'rare', 'epic', 'legendary'] as const).map((rarity) => {
          const styles = getRarityStyles(rarity)
          const categoryBadges = simpleBadges.filter((b) => b.rarity === rarity)
          const categoryEarned = categoryBadges.filter((b) => earnedBadgeIds.includes(b.id)).length
          const categoryPct = Math.round((categoryEarned / categoryBadges.length) * 100)

          return (
            <section
              key={rarity}
              className="rounded-2xl border border-zinc-700/80 bg-zinc-800/80 overflow-hidden shadow-md shadow-black/30"
            >
              <div className={`flex items-center justify-between gap-3 px-5 py-3.5 border-b border-zinc-700/60 ${styles.header}`}>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                    {styles.label}
                  </h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {categoryEarned}/{categoryBadges.length} stamped
                  </p>
                </div>
                <div className="w-20 h-1.5 rounded-full bg-zinc-900/70 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${styles.bar} rounded-full`}
                    style={{ width: `${categoryPct}%` }}
                  />
                </div>
              </div>

              {/* Stamp sheet — room around the grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-4 sm:p-5">
                {categoryBadges.map((badge) => {
                  const progressBadge = badgeProgress.find((b) => b.id === badge.id)
                  const isEarned = progressBadge?.earned || false
                  const hasProgress =
                    !isEarned &&
                    progressBadge?.progress &&
                    progressBadge.progress.target > 0

                  return (
                    <div
                      key={badge.id}
                      title={badge.description}
                      className={`
                        relative flex flex-col items-center text-center rounded-xl px-2.5 pt-3.5 pb-3
                        border transition-all duration-200
                        ${isEarned
                          ? `bg-zinc-900/40 border-transparent bg-gradient-to-b from-zinc-700/40 to-zinc-900/60 ${styles.border} shadow-md ${styles.glow}`
                          : 'bg-zinc-900/50 border-dashed border-zinc-600/70 opacity-75'}
                      `}
                    >
                      {/* Stamp circle */}
                      <div
                        className={`
                          relative w-14 h-14 rounded-full flex items-center justify-center
                          ${isEarned
                            ? `bg-gradient-to-br ${styles.stamp} border-2 ${styles.border} shadow-inner`
                            : 'bg-zinc-800 border-2 border-dashed border-zinc-600'}
                        `}
                      >
                        <div className={isEarned ? styles.ink : 'text-zinc-600'}>
                          {renderBadgeIcon(badge.icon, 'w-6 h-6')}
                        </div>
                        {isEarned && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#00d083] rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-sm">
                            <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <p className={`mt-2 text-[11px] font-semibold leading-tight line-clamp-2 ${isEarned ? 'text-white' : 'text-zinc-500'}`}>
                        {badge.name}
                      </p>

                      {isEarned ? (
                        <p className="mt-1 text-[10px] font-medium text-[#00d083]">Stamped</p>
                      ) : hasProgress ? (
                        <div className="mt-1.5 w-full px-0.5">
                          <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${styles.bar} rounded-full`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  (progressBadge.progress.current / progressBadge.progress.target) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <p className="mt-0.5 text-[9px] text-zinc-500">
                            {progressBadge.progress.current}/{progressBadge.progress.target}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-[10px] text-zinc-600">Locked</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
