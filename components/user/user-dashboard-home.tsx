'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HomeFeedResponse, TonightCard, DishCard, DealCard, PersonalisedCard, RewardCard, TonightLabel } from '@/lib/home-feed/types'
import { StampGrid } from '@/components/loyalty/stamp-grid'
import { STAMP_ICONS, type StampIconKey } from '@/lib/loyalty/loyalty-utils'

interface UserDashboardHomeProps {
  feed: HomeFeedResponse | null
  walletPassId: string | null
  currentCity: string
  cityDisplayName: string
  userName?: string
}

// Prompt chips for the hero section
const PROMPT_CHIPS = [
  { label: 'Burgers near you', icon: 'utensils', prompt: 'Best burgers nearby' },
  { label: 'Cocktails nearby', icon: 'glass', prompt: 'Best cocktail bars near me' },
  { label: 'Deals for you', icon: 'tag', prompt: 'Best deals near me right now' },
  { label: 'Hidden gems', icon: 'sparkle', prompt: 'Hidden gems worth trying near me' },
  { label: "What's on tonight", icon: 'calendar', prompt: "What's happening tonight near me?" },
  { label: 'Secret menus', icon: 'lock', prompt: 'Show me secret menus near me' },
]

const PLACEHOLDER_TEXTS = [
  'Best burger near me',
  'Cheap lunch deals',
  'Cocktails near the beach',
  'Hidden gems worth trying',
  'Where should I eat tonight?',
]

export function UserDashboardHome({ feed, walletPassId, currentCity, cityDisplayName, userName = 'Guest' }: UserDashboardHomeProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [badgeCount, setBadgeCount] = useState(0)
  const [savedItemsCount, setSavedItemsCount] = useState(0)
  const [secretsUnlockedCount, setSecretsUnlockedCount] = useState(0)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [availablePrograms, setAvailablePrograms] = useState<DiscoverProgram[]>([])

  useEffect(() => {
    const loadData = async () => {
      // Saved items
      if (walletPassId) {
        try {
          const { getUserSavedItems } = await import('@/lib/actions/user-saved-actions')
          const savedResult = await getUserSavedItems(walletPassId)
          if (savedResult.success) setSavedItemsCount(savedResult.count || 0)
        } catch { /* safe to ignore */ }
      }

      // Badges (works with or without walletPassId -- tracker falls back to anonymous)
      if (typeof window !== 'undefined') {
        try {
          const { getBadgeTracker } = require('@/lib/utils/simple-badge-tracker')
          const tracker = getBadgeTracker(walletPassId)
          const progress = tracker.getBadgeProgress()
          setBadgeCount(progress.filter((b: any) => b.earned).length)
        } catch { /* safe to ignore */ }

        try {
          const userId = walletPassId || 'anonymous-user'
          const saved = localStorage.getItem(`qwikker-unlocked-secrets-${userId}`)
          if (saved) setSecretsUnlockedCount(JSON.parse(saved).length)
        } catch { /* safe to ignore */ }
      }

      // Activity feed
      try {
        const { getRecentBusinessActivity } = await import('@/lib/actions/recent-activity-actions')
        const businessActivity = await getRecentBusinessActivity(currentCity)
        console.log('[activity] Business activity:', businessActivity?.length || 0, 'items')
        const allActivity: ActivityItem[] = (businessActivity || []).map((a: any) => ({
          id: a.id,
          icon: a.icon || 'sparkles',
          text: a.text || '',
          subtext: a.subtext || '',
          color: a.color || 'green',
          href: a.href || '/user/discover',
          time: a.time || '',
        }))

        if (walletPassId) {
          try {
            const { getUserActivity } = await import('@/lib/actions/user-activity-actions')
            const userActivity = await getUserActivity(walletPassId, 4)
            console.log('[activity] User activity:', userActivity?.length || 0, 'items')
            for (const ua of userActivity) {
              allActivity.push({
                id: ua.id,
                icon: ua.iconType || 'sparkles',
                text: ua.message || '',
                subtext: ua.business_name ? `at ${ua.business_name}` : '',
                color: (ua.color || 'green').replace('text-', '').replace('-400', ''),
                href: ua.type === 'offer_claim' ? '/user/offers?filter=claimed' : '/user/discover',
                time: ua.time || '',
              })
            }
          } catch (err) {
            console.error('[activity] User activity error:', err)
          }
        }

        if (allActivity.length === 0) {
          allActivity.push({
            id: 'welcome',
            icon: 'sparkles',
            text: 'Welcome to Qwikker!',
            subtext: 'Start exploring offers and businesses',
            color: 'green',
            href: '/user/offers',
            time: 'Now',
          })
        }

        setRecentActivity(allActivity.slice(0, 4))
      } catch (err) {
        console.error('[activity] Failed to load activity:', err)
      }

      // Available loyalty programs (for users with no memberships)
      try {
        const res = await fetch('/api/loyalty/discover')
        if (res.ok) {
          const data = await res.json()
          if (data.programs?.length > 0) {
            setAvailablePrograms(data.programs)
          }
        }
      } catch { /* safe to ignore */ }
    }
    loadData()
  }, [walletPassId, currentCity])

  const getNavUrl = useCallback((href: string) => {
    if (!walletPassId) return href
    return `${href}?wallet_pass_id=${walletPassId}`
  }, [walletPassId])

  const getChatUrl = useCallback((message: string) => {
    const base = getNavUrl('/user/chat')
    const separator = walletPassId ? '&' : '?'
    return `${base}${separator}message=${encodeURIComponent(message)}`
  }, [getNavUrl, walletPassId])

  // Rotating placeholder text
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDER_TEXTS.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  // Search submit handler
  const handleSearch = useCallback((query?: string) => {
    const text = query || searchValue.trim()
    if (!text) return
    setIsSearching(true)
    setTimeout(() => {
      router.push(getChatUrl(text))
    }, 400)
  }, [searchValue, router, getChatUrl])

  // Error fallback: if feed failed, show hero only
  if (!feed) {
    return (
      <div className="space-y-6 px-1">
        <HeroSection
          userName={userName}
          greeting={`Hey ${userName}`}
          fancyPrompt="What do you fancy today?"
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          isSearching={isSearching}
          onSearch={handleSearch}
          placeholderText={PLACEHOLDER_TEXTS[placeholderIndex]}
          getChatUrl={getChatUrl}
          getNavUrl={getNavUrl}
        />
      </div>
    )
  }

  const { meta, tonight, dishes, deals, personalised, rewards, secretTeaser, stats } = feed
  const hasRewards = rewards.length > 0
  const showRewardsEmpty = !!walletPassId && rewards.length === 0
  const isNewUser = personalised.length === 0

  // Build greeting client-side so the user name is always correct
  const greetingMap: Record<string, string> = {
    morning: `Good morning, ${userName}`,
    lunch: `Good afternoon, ${userName}`,
    afternoon: `Good afternoon, ${userName}`,
    evening: `Good evening, ${userName}`,
    late_night: `Good evening, ${userName}`,
  }
  const displayGreeting = greetingMap[meta.timeOfDay] || meta.greeting

  // Dynamic Tonight title based on content type
  const tonightTitle = tonight.some(c => c.label === 'happening_tonight' || c.label === 'tonights_deal')
    ? `Tonight in ${meta.cityDisplayName}`
    : `What's hot in ${meta.cityDisplayName}`

  const fancyPromptMap: Record<string, string> = {
    morning: 'What do you fancy this morning?',
    lunch: 'What do you fancy for lunch?',
    afternoon: 'What do you fancy this afternoon?',
    evening: 'What do you fancy tonight?',
    late_night: 'What do you fancy right now?',
  }
  const fancyPrompt = fancyPromptMap[meta.timeOfDay] || 'What do you fancy today?'

  return (
    <div className="space-y-10 sm:space-y-12 pb-8">
      {/* Hero Section */}
      <HeroSection
        userName={userName}
        greeting={displayGreeting}
        greetingSubtitle={meta.greetingSubtitle}
        fancyPrompt={fancyPrompt}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        isSearching={isSearching}
        onSearch={handleSearch}
        placeholderText={PLACEHOLDER_TEXTS[placeholderIndex]}
        getChatUrl={getChatUrl}
        getNavUrl={getNavUrl}
      />

      {/* Navigation Stat Cards */}
      <NavigationCards
        businessCount={stats.totalBusinesses}
        offerCount={stats.totalOffers}
        secretMenuCount={stats.totalSecretMenus}
        secretsUnlockedCount={secretsUnlockedCount}
        savedItemsCount={savedItemsCount}
        badgeCount={badgeCount}
        getNavUrl={getNavUrl}
      />

      {/* Tonight / Discover */}
      {tonight.length > 0 ? (
        <FeedSection title={tonightTitle}>
          <CardRail>
            {tonight.map(card => (
              <TonightCardComponent key={card.id} card={card} getNavUrl={getNavUrl} />
            ))}
          </CardRail>
        </FeedSection>
      ) : (
        <div className="text-center py-4">
          <Link href={getChatUrl("What's good tonight?")} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            Ask Qwikker what's good tonight →
          </Link>
        </div>
      )}

      {/* Based on What You Like */}
      {personalised.length > 0 && (
        <FeedSection title="Based on what you like">
          <CardRail>
            {personalised.map(card => (
              <PersonalisedCardComponent key={card.id} card={card} getNavUrl={getNavUrl} />
            ))}
          </CardRail>
        </FeedSection>
      )}

      {/* Must-Try Dishes */}
      {dishes.length > 0 && (
        <FeedSection title="Must-try dishes">
          <CardRail>
            {dishes.map(card => (
              <DishCardComponent key={card.id} card={card} getNavUrl={getNavUrl} />
            ))}
            {secretTeaser && secretTeaser.count > 0 && (
              <SecretTeaserCard count={secretTeaser.count} getNavUrl={getNavUrl} />
            )}
          </CardRail>
        </FeedSection>
      )}

      {/* Deals */}
      {deals.length > 0 && (
        <FeedSection title="Deals nearby">
          <CardRail>
            {deals.map(card => (
              <DealCardComponent key={card.id} card={card} getNavUrl={getNavUrl} />
            ))}
          </CardRail>
        </FeedSection>
      )}

      {/* Your Rewards */}
      {hasRewards && (
        <FeedSection title="Your rewards">
          <CardRail>
            {rewards.map(card => (
              <RewardCardComponent key={card.id} card={card} getNavUrl={getNavUrl} />
            ))}
          </CardRail>
        </FeedSection>
      )}
      {!hasRewards && availablePrograms.length > 0 && (
        <FeedSection title="Loyalty cards available">
          <CardRail>
            {availablePrograms.map(program => (
              <AvailableLoyaltyCard key={program.id} program={program} />
            ))}
          </CardRail>
        </FeedSection>
      )}

      {/* Recent Activity Feed */}
      {recentActivity.length > 0 && (
        <ActivityFeed activity={recentActivity} getNavUrl={getNavUrl} getChatUrl={getChatUrl} />
      )}

      {/* Preferences Card */}
      {isNewUser && (
        <PreferencesCard walletPassId={walletPassId} />
      )}

      {/* How Qwikker Works -- collapsible */}
      <HowItWorksSection cityDisplayName={cityDisplayName} getNavUrl={getNavUrl} />
    </div>
  )
}

// =============================================================================
// Hero Section
// =============================================================================

function HeroSection({
  userName,
  greeting,
  greetingSubtitle,
  fancyPrompt,
  searchValue,
  setSearchValue,
  isSearching,
  onSearch,
  placeholderText,
  getChatUrl,
  getNavUrl,
}: {
  userName: string
  greeting: string
  greetingSubtitle?: string
  fancyPrompt: string
  searchValue: string
  setSearchValue: (v: string) => void
  isSearching: boolean
  onSearch: (query?: string) => void
  placeholderText: string
  getChatUrl: (msg: string) => string
  getNavUrl: (href: string) => string
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 sm:p-12 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
          {greeting}
        </h1>
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
          {greetingSubtitle}
        </p>
        <p className="text-lg sm:text-xl text-slate-200 font-medium">
          {fancyPrompt}
        </p>
      </div>

      {/* Search bar */}
      <div className="max-w-lg mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSearch()
          }}
        >
          <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/20 transition-colors">
            <div className="pl-4 text-slate-500">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={placeholderText}
              className="flex-1 bg-transparent text-white placeholder:text-slate-500 px-3 py-4 text-base outline-none"
              disabled={isSearching}
            />
            {isSearching && (
              <div className="pr-4 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse [animation-delay:300ms]" />
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Prompt chips */}
      <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
        {PROMPT_CHIPS.map((chip) => (
          <Link
            key={chip.label}
            href={getChatUrl(chip.prompt)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/8 rounded-full text-xs text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all"
          >
            <ChipIcon name={chip.icon} />
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Feed Section & Card Rail
// =============================================================================

function FeedSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-slate-100 mb-4 px-1">{title}</h2>
      {children}
    </section>
  )
}

function CardRail({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="-mx-4 sm:-mx-6 flex overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hidden"
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorX: 'contain',
        scrollPaddingInlineStart: '1rem',
      }}
    >
      <div className="flex gap-3 px-4 sm:px-6">
        {children}
      </div>
    </div>
  )
}

// =============================================================================
// Card Components
// =============================================================================

function TonightCardComponent({ card, getNavUrl }: { card: TonightCard; getNavUrl: (href: string) => string }) {
  const labelText: Record<TonightLabel, string> = {
    happening_tonight: 'Happening tonight',
    tonights_deal: "Tonight's deal",
    open_now: 'Open now',
    place_to_try: 'Place to try',
  }

  const href = card.eventId
    ? getNavUrl('/user/events')
    : card.offerId
    ? getNavUrl('/user/offers')
    : getNavUrl('/user/discover')

  return (
    <Link href={href} className="snap-start shrink-0 w-[78vw] sm:w-72 block">
      <div
        className="relative h-64 rounded-xl overflow-hidden border border-slate-700/50 hover:border-slate-600 transition-colors group bg-cover bg-center bg-slate-800"
        style={card.businessImage ? { backgroundImage: `url(${card.businessImage})` } : undefined}
      >
        <span className="absolute top-4 left-4 text-[10px] uppercase tracking-wider text-white bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
          {labelText[card.label]}
        </span>
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm px-4 py-3 z-10">
          {card.offerName && (
            <p className="text-white font-medium text-sm mb-0.5">{card.offerName}</p>
          )}
          {card.eventName && (
            <p className="text-white font-medium text-sm mb-0.5">{card.eventName}</p>
          )}
          <p className="text-white/90 text-xs">{card.businessName}</p>
        </div>
      </div>
    </Link>
  )
}

function DishCardComponent({ card, getNavUrl }: { card: DishCard; getNavUrl: (href: string) => string }) {
  return (
    <Link href={getNavUrl('/user/discover')} className="snap-start shrink-0 w-[78vw] sm:w-64 block">
      <div
        className="relative h-48 rounded-xl overflow-hidden border border-slate-700/50 hover:border-slate-600 transition-colors group bg-cover bg-center bg-slate-800"
        style={card.businessImage ? { backgroundImage: `url(${card.businessImage})` } : undefined}
      >
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm px-4 py-3 z-10">
          <p className="text-white font-medium text-sm">{card.dishName}</p>
          <div className="flex items-center justify-between">
            <p className="text-white/90 text-xs">{card.businessName}</p>
            {card.dishPrice && (
              <span className="text-white/90 text-xs">{card.dishPrice}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function DealCardComponent({ card, getNavUrl }: { card: DealCard; getNavUrl: (href: string) => string }) {
  return (
    <Link href={getNavUrl('/user/offers')} className="snap-start shrink-0 w-[78vw] sm:w-64 block">
      <div
        className="relative h-44 rounded-xl overflow-hidden border border-slate-700/50 hover:border-slate-600 transition-colors group bg-cover bg-center bg-slate-800"
        style={card.businessImage ? { backgroundImage: `url(${card.businessImage})` } : undefined}
      >
        <span className="absolute top-4 left-4 text-[10px] uppercase tracking-wider text-white bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
          {formatOfferType(card.offerType)}
        </span>
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm px-4 py-3 z-10">
          <p className="text-white font-medium text-sm">{card.offerName}</p>
          <p className="text-white/90 text-xs">{card.businessName}</p>
        </div>
      </div>
    </Link>
  )
}

function PersonalisedCardComponent({ card, getNavUrl }: { card: PersonalisedCard; getNavUrl: (href: string) => string }) {
  return (
    <Link href={getNavUrl('/user/discover')} className="snap-start shrink-0 w-[78vw] sm:w-64 block">
      <div
        className="relative h-48 rounded-xl overflow-hidden border border-slate-700/50 hover:border-slate-600 transition-colors group bg-cover bg-center bg-slate-800"
        style={card.businessImage ? { backgroundImage: `url(${card.businessImage})` } : undefined}
      >
        <span className="absolute top-4 left-4 text-[10px] uppercase tracking-wider text-white bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
          {card.reason}
        </span>
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm px-4 py-3 z-10">
          <p className="text-white font-medium text-sm">{card.businessName}</p>
          {card.offerName && <p className="text-white/90 text-xs">{card.offerName}</p>}
          {card.dishName && !card.offerName && <p className="text-white/90 text-xs">{card.dishName}</p>}
        </div>
      </div>
    </Link>
  )
}

function RewardCardComponent({ card, getNavUrl }: { card: RewardCard; getNavUrl: (href: string) => string }) {
  const stampIconName = STAMP_ICONS[(card.stampIcon || 'stamp') as StampIconKey]?.icon || 'Stamp'
  const isReady = card.currentBalance >= card.threshold

  return (
    <Link href={getNavUrl('/user/rewards')} className="snap-start shrink-0 w-[78vw] sm:w-64">
      <div className="rounded-xl bg-slate-800 border border-slate-700/50 p-4 space-y-3">
        <div>
          <p className="text-white font-medium text-sm">{card.businessName}</p>
          <p className="text-slate-500 text-xs mt-0.5">{card.rewardDescription}</p>
        </div>
        <StampGrid
          stampIcon={stampIconName}
          filled={card.currentBalance}
          threshold={card.threshold}
          size={18}
        />
        {isReady ? (
          <p className="text-xs text-emerald-400 font-medium">Reward ready</p>
        ) : (
          <p className="text-xs text-slate-500">
            {card.threshold - card.currentBalance} more to go
          </p>
        )}
      </div>
    </Link>
  )
}

interface DiscoverProgram {
  id: string
  public_id: string
  program_name: string
  type: string
  reward_threshold: number
  reward_description: string
  stamp_label?: string
  stamp_icon?: string
  primary_color?: string
  logo_url?: string
  business: {
    business_name: string
    logo: string | null
  }
}

function AvailableLoyaltyCard({ program }: { program: DiscoverProgram }) {
  const stampIconName = STAMP_ICONS[program.stamp_icon as StampIconKey]?.icon || 'Stamp'

  return (
    <Link href={`/loyalty/join/${program.public_id}`} className="snap-start shrink-0 w-[78vw] sm:w-64">
      <div className="rounded-xl bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-colors p-4 space-y-3">
        <div className="flex items-center gap-3">
          {program.business.logo ? (
            <img
              src={program.business.logo}
              alt=""
              className="w-10 h-10 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: program.primary_color || '#475569' }}
            >
              {program.business.business_name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-white font-medium text-sm truncate">{program.business.business_name}</p>
            <p className="text-slate-500 text-xs truncate">{program.reward_description}</p>
          </div>
        </div>
        <StampGrid
          stampIcon={stampIconName}
          filled={0}
          threshold={program.reward_threshold}
          size={18}
        />
        <p className="text-xs text-emerald-400 font-medium">Start collecting</p>
      </div>
    </Link>
  )
}

function SecretTeaserCard({ count, getNavUrl }: { count: number; getNavUrl: (href: string) => string }) {
  return (
    <Link href={getNavUrl('/user/secret-menu')} className="snap-start shrink-0 w-[78vw] sm:w-64">
      <div className="relative h-48 rounded-xl overflow-hidden border border-purple-500/30 flex flex-col items-center justify-center gap-3 group hover:border-purple-500/50 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-slate-900/80 to-slate-900" />
        <div className="relative flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <LockIcon />
          </div>
          <div className="text-center">
            <p className="text-white text-sm font-semibold">{count} secret items nearby</p>
            <p className="text-purple-300/70 text-xs mt-1">Tap to unlock hidden menus</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

// =============================================================================
// Preferences Card
// =============================================================================

const CATEGORY_OPTIONS = [
  'Restaurants', 'Cafes', 'Bars', 'Takeaway', 'Family', 'Fine Dining', 'Brunch', 'Late Night',
]

function PreferencesCard({ walletPassId }: { walletPassId: string | null }) {
  const [selected, setSelected] = useState<string[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load existing preferences from database
  useEffect(() => {
    if (!walletPassId) return
    const load = async () => {
      try {
        const res = await fetch(`/api/user/preferences?walletPassId=${walletPassId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.preferred_categories?.length > 0) {
            setSelected(data.preferred_categories)
          }
        }
      } catch { /* safe to ignore */ }
      setLoaded(true)
    }
    load()
  }, [walletPassId])

  if (dismissed) return null

  const toggle = async (cat: string) => {
    const updated = selected.includes(cat)
      ? selected.filter(c => c !== cat)
      : [...selected, cat]
    setSelected(updated)

    // Save to database
    if (!walletPassId) return
    setSaving(true)
    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletPassId, preferred_categories: updated }),
      })
    } catch { /* safe to ignore */ }
    setSaving(false)
  }

  return (
    <section className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Help us find places you'll love</h3>
          <p className="text-xs text-slate-500 mt-0.5">Tap categories that interest you</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-600 hover:text-slate-400 transition-colors p-1"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map(cat => (
          <button
            key={cat}
            onClick={() => toggle(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selected.includes(cat)
                ? 'bg-white text-slate-900'
                : 'bg-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      {saving && (
        <p className="text-[11px] text-slate-600 mt-2">Saving...</p>
      )}
      {!saving && selected.length > 0 && loaded && (
        <p className="text-[11px] text-slate-500 mt-2">Saved</p>
      )}
    </section>
  )
}

// =============================================================================
// Navigation Stat Cards
// =============================================================================

function NavigationCards({
  businessCount,
  offerCount,
  secretMenuCount,
  secretsUnlockedCount,
  savedItemsCount,
  badgeCount,
  getNavUrl,
}: {
  businessCount: number
  offerCount: number
  secretMenuCount: number
  secretsUnlockedCount: number
  savedItemsCount: number
  badgeCount: number
  getNavUrl: (href: string) => string
}) {
  const cards = [
    { href: '/user/discover', label: 'Discover', count: businessCount, sub: 'places', color: 'emerald', gradient: 'from-emerald-500/30 to-teal-500/30', border: 'border-emerald-500/30', card: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40', text: 'text-emerald-400', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> },
    { href: '/user/offers', label: 'Offers', count: offerCount, sub: 'available', color: 'orange', gradient: 'from-orange-500/30 to-amber-500/30', border: 'border-orange-500/30', card: 'from-orange-500/10 to-orange-500/5 border-orange-500/20 hover:border-orange-500/40', text: 'text-orange-400', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /> },
    { href: '/user/secret-menu', label: 'Secrets', count: `${secretsUnlockedCount} / ${secretMenuCount}`, sub: 'unlocked', color: 'purple', gradient: 'from-purple-500/30 to-pink-500/30', border: 'border-purple-500/30', card: 'from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:border-purple-500/40', text: 'text-purple-400', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> },
    { href: '/user/events', label: 'Events', count: 0, sub: 'upcoming', color: 'blue', gradient: 'from-blue-500/30 to-cyan-500/30', border: 'border-blue-500/30', card: 'from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40', text: 'text-blue-400', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { href: '/user/saved', label: 'Saved', count: savedItemsCount, sub: 'saved', color: 'pink', gradient: 'from-pink-500/30 to-rose-500/30', border: 'border-pink-500/30', card: 'from-pink-500/10 to-pink-500/5 border-pink-500/20 hover:border-pink-500/40', text: 'text-pink-400', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /> },
    { href: '/user/badges', label: 'Badges', count: badgeCount, sub: 'earned', color: 'yellow', gradient: 'from-yellow-500/30 to-amber-500/30', border: 'border-yellow-500/30', card: 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40', text: 'text-yellow-400', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /> },
  ]

  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [showRightFade, setShowRightFade] = useState(true)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    const progress = maxScroll > 0 ? el.scrollLeft / maxScroll : 0
    setActiveIndex(progress > 0.4 ? 1 : 0)
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }, [])

  const scrollToCard = useCallback((idx: number) => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = 128 + 12
    el.scrollTo({ left: idx * cardWidth, behavior: 'smooth' })
  }, [])

  return (
    <>
      {/* Mobile: horizontal scroll with indicators */}
      <div className="sm:hidden">
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="-mx-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hidden"
            style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain', scrollPaddingInlineStart: '1rem' }}
          >
            <div className="flex gap-3 px-4">
              {cards.map(c => (
                <Link key={c.label} href={getNavUrl(c.href)} className="snap-start shrink-0 w-32">
                  <Card className={`bg-gradient-to-br ${c.card} transition-colors duration-200 cursor-pointer`}>
                    <CardContent className="p-5 text-center">
                      <div className={`w-14 h-14 bg-gradient-to-br ${c.gradient} rounded-xl mx-auto mb-3 flex items-center justify-center border ${c.border}`}>
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {c.icon}
                        </svg>
                      </div>
                      <h3 className="font-semibold text-slate-100 text-sm mb-1">{c.label}</h3>
                      <p className={`${c.text} font-bold text-2xl`}>{c.count}</p>
                      <p className="text-xs text-slate-400">{c.sub}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
          {showRightFade && (
            <div className="absolute top-0 right-0 bottom-2 w-8 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
          )}
        </div>
        <div className="flex justify-center gap-1.5 pt-3">
          {[0, 1].map(i => {
            const isActive = (activeIndex === i)
            return (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  isActive ? 'w-4 h-1.5 bg-white/90' : 'w-1.5 h-1.5 bg-slate-600'
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* Desktop: grid */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c => (
          <Link key={c.label} href={getNavUrl(c.href)} className="group">
            <Card className={`bg-gradient-to-br ${c.card} transition-colors duration-200 cursor-pointer`}>
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${c.gradient} rounded-xl mx-auto mb-4 flex items-center justify-center border ${c.border}`}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {c.icon}
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-100 text-base mb-2">{c.label}</h3>
                <p className={`${c.text} font-bold text-2xl`}>{c.count}</p>
                <p className="text-sm text-slate-400">{c.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}

// =============================================================================
// Activity Feed
// =============================================================================

interface ActivityItem {
  id: string
  icon: string
  text: string
  subtext: string
  color: string
  href: string
  time: string
}

const ACTIVITY_COLORS: Record<string, { bg: string; text: string }> = {
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400' },
}

const ACTIVITY_ICONS: Record<string, JSX.Element> = {
  tag: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />,
  lock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
  badge: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
  location: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></>,
  sparkles: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />,
}

function ActivityFeed({ activity, getNavUrl, getChatUrl }: { activity: ActivityItem[]; getNavUrl: (href: string) => string; getChatUrl: (msg: string) => string }) {
  return (
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
            <div className="w-2 h-2 bg-[#00d083] rounded-full animate-pulse" />
            <span className="text-xs text-[#00d083] font-medium">LIVE</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {activity.map((item) => {
            const colors = ACTIVITY_COLORS[item.color] || ACTIVITY_COLORS.green
            const iconPath = ACTIVITY_ICONS[item.icon] || ACTIVITY_ICONS.sparkles

            return (
              <Link key={item.id} href={getNavUrl(item.href)} className="group">
                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:bg-slate-700/50 transition-all duration-200 cursor-pointer">
                  <div className={`w-8 h-8 ${colors.bg} rounded-full flex items-center justify-center shrink-0`}>
                    <svg className={`w-4 h-4 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {iconPath}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{item.text}</p>
                    <p className="text-xs text-slate-400 truncate">{item.subtext} {item.time && `· ${item.time}`}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-600/30">
          <Link
            href={getChatUrl('What happened recently?')}
            className="flex items-center justify-center gap-2 w-full py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Ask AI about recent updates
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// How Qwikker Works (Collapsible)
// =============================================================================

function HowItWorksSection({ cityDisplayName, getNavUrl }: { cityDisplayName: string; getNavUrl: (href: string) => string }) {
  const [isOpen, setIsOpen] = useState(false)

  const steps = [
    {
      number: '01',
      title: 'Discover Amazing Places',
      description: `Explore ${cityDisplayName}'s best restaurants, cafes, bars, and hidden gems -- all carefully curated by locals`,
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
      color: 'emerald',
    },
    {
      number: '02',
      title: 'Chat with Your AI Guide',
      description: 'Ask our intelligent AI anything about menus, deals, secret items, or get personalized recommendations',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
      color: 'blue',
    },
    {
      number: '03',
      title: 'Grab Exclusive Deals',
      description: "Access special offers and add them to your mobile wallet -- deals you won't find anywhere else",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />,
      color: 'orange',
    },
    {
      number: '04',
      title: 'Unlock Secret Menus',
      description: 'Discover hidden menu items and off-menu specialties that only insiders know about',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
      color: 'purple',
    },
  ]

  const colorMap: Record<string, { border: string; bg: string; text: string; number: string }> = {
    emerald: { border: 'border-emerald-500/30', bg: 'from-emerald-500/20 to-teal-500/20', text: 'text-emerald-400', number: 'bg-emerald-500 text-white' },
    blue: { border: 'border-blue-500/30', bg: 'from-blue-500/20 to-cyan-500/20', text: 'text-blue-400', number: 'bg-blue-500 text-white' },
    orange: { border: 'border-orange-500/30', bg: 'from-orange-500/20 to-red-500/20', text: 'text-orange-400', number: 'bg-orange-500 text-white' },
    purple: { border: 'border-purple-500/20', bg: 'from-purple-500/10 to-pink-500/10', text: 'text-purple-400', number: 'bg-purple-500 text-white' },
  }

  return (
    <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-800/60 transition-colors"
      >
        <h3 className="text-lg font-semibold text-slate-100">How Qwikker Works</h3>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-5 pb-5">
          <p className="text-sm text-slate-400 mb-6">Four simple steps to unlock {cityDisplayName}&apos;s culinary secrets</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step) => {
              const colors = colorMap[step.color]
              return (
                <div
                  key={step.number}
                  className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${colors.bg} border ${colors.border} p-6 text-center`}
                >
                  <div className={`w-8 h-8 ${colors.number} rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-4`}>
                    {step.number}
                  </div>
                  <svg className={`w-12 h-12 ${colors.text} mx-auto mb-4`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {step.icon}
                  </svg>
                  <h4 className="font-semibold text-white text-sm mb-2">{step.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Icons
// =============================================================================

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function ChipIcon({ name }: { name: string }) {
  const paths: Record<string, JSX.Element> = {
    utensils: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8l-1.5 7.5M7 13L5.4 5M17 13l1.5 7.5M9 21h6" />,
    glass: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 2l-2 9h12L16 2m-4 9v9m-4 0h8" />,
    tag: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />,
    sparkle: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    lock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
  }

  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {paths[name] || paths.sparkle}
    </svg>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function formatOfferType(type: string): string {
  const labels: Record<string, string> = {
    discount: 'Discount',
    two_for_one: '2 for 1',
    freebie: 'Freebie',
    buy_x_get_y: 'Special',
    percentage_off: '% Off',
    fixed_amount_off: 'Money Off',
    other: 'Deal',
  }
  return labels[type] || 'Deal'
}
