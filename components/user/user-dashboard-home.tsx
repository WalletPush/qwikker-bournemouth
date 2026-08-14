'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PendingLink } from '@/components/ui/nav-pending'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  HomeFeedResponse,
  TonightCard,
  DishCard,
  DealCard,
  PersonalizedCard,
  RewardCard,
  SecretTeaserItem,
  TonightLabel,
} from '@/lib/home-feed/types'
import { StampGrid } from '@/components/loyalty/stamp-grid'
import { STAMP_ICONS, type StampIconKey } from '@/lib/loyalty/loyalty-utils'
import { WalletInstallBanner } from '@/components/wallet/wallet-install-banner'
import { PersonalizationWizard, shouldShowWizard } from '@/components/user/personalization-wizard'
import {
  getCachedLocation,
  setCachedLocation,
  primeLocationCache,
} from '@/lib/location/useUserLocation'

interface UserDashboardHomeProps {
  feed: HomeFeedResponse | null
  walletPassId: string | null
  currentCity: string
  cityDisplayName: string
  userName?: string
}

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

function formatDistanceLabel(miles?: number | null): string | null {
  if (miles == null || !Number.isFinite(miles)) return null
  if (miles < 0.1) return 'Nearby'
  if (miles < 10) return `${miles.toFixed(1)} mi`
  return `${Math.round(miles)} mi`
}

export function UserDashboardHome({ feed: initialFeed, walletPassId, currentCity, cityDisplayName, userName: rawUserName = 'Guest' }: UserDashboardHomeProps) {
  const userName = rawUserName !== 'Guest' ? rawUserName.split(' ')[0] : 'Guest'
  const router = useRouter()
  const [feed, setFeed] = useState<HomeFeedResponse | null>(initialFeed)
  const [searchValue, setSearchValue] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [availablePrograms, setAvailablePrograms] = useState<DiscoverProgram[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const locationFeedFetched = useRef(false)

  useEffect(() => {
    setFeed(initialFeed)
  }, [initialFeed])

  useEffect(() => {
    let cancelled = false

    const refreshWithCoords = async (lat: number, lng: number) => {
      if (locationFeedFetched.current || cancelled) return
      locationFeedFetched.current = true
      try {
        const res = await fetch(`/api/user/home-feed?lat=${lat}&lng=${lng}`)
        if (!res.ok || cancelled) return
        const next = (await res.json()) as HomeFeedResponse
        if (!cancelled && next?.meta) setFeed(next)
      } catch {
        locationFeedFetched.current = false
      }
    }

    const run = async () => {
      await primeLocationCache()
      const cached = getCachedLocation()
      if (cached) {
        await refreshWithCoords(cached.lat, cached.lng)
        return
      }
      if (!('geolocation' in navigator)) return
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setCachedLocation(coords)
          void refreshWithCoords(coords.lat, coords.lng)
        },
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 30 * 60 * 1000 }
      )
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!feed || !walletPassId) return
    const hasEngagement = feed.personalized.length > 0
    const checkPrefs = async () => {
      try {
        const res = await fetch(`/api/user/preferences?walletPassId=${walletPassId}`)
        const data = res.ok ? await res.json() : {}
        const show = shouldShowWizard({
          walletPassId,
          preferredCategories: data.preferred_categories || [],
          dietaryRestrictions: data.dietary_restrictions || [],
          hasEngagement,
        })
        setShowWizard(show)
      } catch {}
    }
    checkPrefs()
  }, [feed, walletPassId])

  useEffect(() => {
    const loadData = async () => {
      try {
        const { getRecentBusinessActivity } = await import('@/lib/actions/recent-activity-actions')
        const businessActivity = await getRecentBusinessActivity(currentCity)
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
          } catch {}
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
      } catch {}

      try {
        const res = await fetch('/api/loyalty/discover')
        if (res.ok) {
          const data = await res.json()
          if (data.programs?.length > 0) setAvailablePrograms(data.programs)
        }
      } catch {}
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

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDER_TEXTS.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  const handleSearch = useCallback((query?: string) => {
    const text = query || searchValue.trim()
    if (!text) return
    setIsSearching(true)
    setTimeout(() => {
      router.push(getChatUrl(text))
    }, 400)
  }, [searchValue, router, getChatUrl])

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

  const { meta, tonight, dishes, deals, personalized, rewards, secretTeaser } = feed
  const hasRewards = rewards.length > 0
  const joinedPublicIds = new Set(rewards.map(r => r.programPublicId).filter(Boolean))
  const unjoinedPrograms = availablePrograms.filter(p => !joinedPublicIds.has(p.public_id))

  const greetingMap: Record<string, string> = {
    morning: `Good morning, ${userName}`,
    lunch: `Good afternoon, ${userName}`,
    afternoon: `Good afternoon, ${userName}`,
    evening: `Good evening, ${userName}`,
    late_night: `Good evening, ${userName}`,
  }
  const displayGreeting = greetingMap[meta.timeOfDay] || meta.greeting

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
    <div className="space-y-8 sm:space-y-10 pb-8">
      {showWizard && walletPassId && (
        <PersonalizationWizard
          walletPassId={walletPassId}
          userName={userName}
          onComplete={() => setShowWizard(false)}
        />
      )}
      <WalletInstallBanner />

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
          <Link href={getChatUrl("What's good tonight?")} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Ask Qwikker what&apos;s good tonight →
          </Link>
        </div>
      )}

      {deals.length > 0 && (
        <FeedSection title="Deals nearby">
          <CardRail>
            {deals.map(card => (
              <DealCardComponent key={card.id} card={card} getNavUrl={getNavUrl} />
            ))}
          </CardRail>
        </FeedSection>
      )}

      {personalized.length > 0 && (
        <FeedSection title="Based on what you like">
          <CardRail>
            {personalized.map(card => (
              <PersonalizedCardComponent key={card.id} card={card} getNavUrl={getNavUrl} />
            ))}
          </CardRail>
        </FeedSection>
      )}

      {dishes.length > 0 && (
        <FeedSection title="Popular picks">
          <CardRail>
            {dishes.map(card => (
              <DishCardComponent key={card.id} card={card} getNavUrl={getNavUrl} />
            ))}
          </CardRail>
        </FeedSection>
      )}

      {secretTeaser && secretTeaser.count > 0 && (
        <FeedSection title="Secret menus nearby">
          <CardRail>
            {(secretTeaser.items?.length ? secretTeaser.items : []).map((item) => (
              <SecretVenueTeaserCard key={item.businessId} item={item} getNavUrl={getNavUrl} />
            ))}
            <SecretTeaserCard count={secretTeaser.count} getNavUrl={getNavUrl} />
          </CardRail>
        </FeedSection>
      )}

      {hasRewards && (
        <FeedSection title="Your loyalty cards">
          <CardRail>
            {rewards.map(card => (
              <RewardCardComponent key={card.id} card={card} getNavUrl={getNavUrl} />
            ))}
          </CardRail>
        </FeedSection>
      )}
      {unjoinedPrograms.length > 0 && (
        <FeedSection title={hasRewards ? 'More loyalty cards' : 'Loyalty cards available'}>
          <CardRail>
            {unjoinedPrograms.map(program => (
              <AvailableLoyaltyCard key={program.id} program={program} />
            ))}
          </CardRail>
        </FeedSection>
      )}

      {recentActivity.length > 0 && (
        <ActivityFeed activity={recentActivity} getNavUrl={getNavUrl} getChatUrl={getChatUrl} />
      )}

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
    <div className="bg-zinc-950 border border-[#00d083]/25 rounded-2xl p-6 sm:p-8 space-y-5">
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
          {greeting}
        </h1>
        <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto">
          {greetingSubtitle}
        </p>
        <p className="text-lg sm:text-xl text-zinc-100 font-medium">
          {fancyPrompt}
        </p>
      </div>

      {/* Search bar — chat entry */}
      <div className="max-w-lg mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSearch()
          }}
        >
          <div className="flex items-center bg-zinc-900 border border-[#00d083]/35 rounded-2xl overflow-hidden focus-within:border-[#00d083]/70 focus-within:ring-1 focus-within:ring-[#00d083]/30 transition-colors">
            <div className="pl-4 text-[#00d083]/80">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={placeholderText}
              className="flex-1 bg-transparent text-white placeholder:text-zinc-400 px-3 py-4 text-base outline-none"
              disabled={isSearching}
            />
            {isSearching && (
              <div className="pr-4 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#00d083] rounded-full animate-pulse" />
                <span className="w-1.5 h-1.5 bg-[#00d083]/70 rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-[#00d083]/40 rounded-full animate-pulse [animation-delay:300ms]" />
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-full text-xs text-zinc-200 hover:text-white hover:border-[#00d083]/40 transition-all"
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
    : getNavUrl(`/user/business/${card.businessSlug}`)

  const bgImage = card.eventImage || card.businessImage

  return (
    <PendingLink href={href} pendingLabel={card.businessName || 'listing'} className="snap-start shrink-0 w-[78vw] sm:w-72 block">
      <div
        className="relative h-64 rounded-xl overflow-hidden border border-slate-700/50 hover:border-slate-600 transition-colors group bg-cover bg-center bg-slate-800"
        style={bgImage ? { backgroundImage: `url(${bgImage})` } : undefined}
      >
        <span className="absolute top-4 left-4 text-[10px] uppercase tracking-wider text-white bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
          {labelText[card.label]}
        </span>
        {formatDistanceLabel(card.distanceMiles) && (
          <span className="absolute top-4 right-4 text-[10px] font-medium text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
            {formatDistanceLabel(card.distanceMiles)}
          </span>
        )}
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
    </PendingLink>
  )
}

function DishCardComponent({ card, getNavUrl }: { card: DishCard; getNavUrl: (href: string) => string }) {
  const bgImage = card.dishImage || card.businessImage
  return (
    <PendingLink href={getNavUrl(`/user/business/${card.businessSlug}`)} pendingLabel={card.businessName || 'listing'} className="snap-start shrink-0 w-[78vw] sm:w-64 block">
      <div
        className="relative h-48 rounded-xl overflow-hidden border border-slate-700/50 hover:border-slate-600 transition-colors group bg-cover bg-center bg-slate-800"
        style={bgImage ? { backgroundImage: `url(${bgImage})` } : undefined}
      >
        {formatDistanceLabel(card.distanceMiles) && (
          <span className="absolute top-3 right-3 text-[10px] font-medium text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
            {formatDistanceLabel(card.distanceMiles)}
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm px-4 py-3 z-10">
          <p className="text-white font-medium text-sm">{card.dishName}</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-white/90 text-xs truncate">{card.businessName}</p>
            {card.dishPrice && (
              <span className="text-white/90 text-xs shrink-0">{card.dishPrice}</span>
            )}
          </div>
        </div>
      </div>
    </PendingLink>
  )
}

function DealCardComponent({ card, getNavUrl }: { card: DealCard; getNavUrl: (href: string) => string }) {
  return (
    <PendingLink href={getNavUrl('/user/offers')} pendingLabel="Offers" className="snap-start shrink-0 w-[78vw] sm:w-64 block">
      <div
        className="relative h-44 rounded-xl overflow-hidden border border-slate-700/50 hover:border-slate-600 transition-colors group bg-cover bg-center bg-slate-800"
        style={card.businessImage ? { backgroundImage: `url(${card.businessImage})` } : undefined}
      >
        <span className="absolute top-4 left-4 text-[10px] uppercase tracking-wider text-white bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
          {formatOfferType(card.offerType)}
        </span>
        {formatDistanceLabel(card.distanceMiles) && (
          <span className="absolute top-4 right-4 text-[10px] font-medium text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
            {formatDistanceLabel(card.distanceMiles)}
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm px-4 py-3 z-10">
          <p className="text-white font-medium text-sm">{card.offerName}</p>
          <p className="text-white/90 text-xs">{card.businessName}</p>
        </div>
      </div>
    </PendingLink>
  )
}

function PersonalizedCardComponent({ card, getNavUrl }: { card: PersonalizedCard; getNavUrl: (href: string) => string }) {
  return (
    <PendingLink href={getNavUrl(`/user/business/${card.businessSlug}`)} pendingLabel={card.businessName || 'listing'} className="snap-start shrink-0 w-[78vw] sm:w-64 block">
      <div
        className="relative h-48 rounded-xl overflow-hidden border border-slate-700/50 hover:border-slate-600 transition-colors group bg-cover bg-center bg-slate-800"
        style={card.businessImage ? { backgroundImage: `url(${card.businessImage})` } : undefined}
      >
        <span className="absolute top-4 left-4 text-[10px] uppercase tracking-wider text-white bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
          {card.reason}
        </span>
        {formatDistanceLabel(card.distanceMiles) && (
          <span className="absolute top-4 right-4 text-[10px] font-medium text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
            {formatDistanceLabel(card.distanceMiles)}
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm px-4 py-3 z-10">
          <p className="text-white font-medium text-sm">{card.businessName}</p>
          {card.offerName && <p className="text-white/90 text-xs">{card.offerName}</p>}
          {card.dishName && !card.offerName && <p className="text-white/90 text-xs">{card.dishName}</p>}
        </div>
      </div>
    </PendingLink>
  )
}

function RewardCardComponent({ card, getNavUrl }: { card: RewardCard; getNavUrl: (href: string) => string }) {
  const stampIconName = STAMP_ICONS[(card.stampIcon || 'stamp') as StampIconKey]?.icon || 'Stamp'
  const isReady = card.currentBalance >= card.threshold

  return (
    <PendingLink href={getNavUrl('/user/rewards')} pendingLabel="Rewards" className="snap-start shrink-0 w-[78vw] sm:w-64">
      <div className="rounded-xl bg-slate-800 border border-slate-700/50 p-4 space-y-3">
        <div className="flex items-center gap-3">
          {card.businessLogo ? (
            <img src={card.businessLogo} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white text-sm font-bold bg-slate-600">
              {card.businessName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-white font-medium text-sm truncate">{card.businessName}</p>
            <p className="text-slate-500 text-xs truncate">{card.rewardDescription}</p>
          </div>
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
    </PendingLink>
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
    <PendingLink href={`/loyalty/join/${program.public_id}`} pendingLabel={program.business.business_name || 'loyalty'} className="snap-start shrink-0 w-[78vw] sm:w-64">
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
    </PendingLink>
  )
}

function SecretVenueTeaserCard({
  item,
  getNavUrl,
}: {
  item: SecretTeaserItem
  getNavUrl: (href: string) => string
}) {
  return (
    <PendingLink
      href={getNavUrl(`/user/secret-menu?highlight=${item.businessSlug}`)}
      pendingLabel={item.businessName}
      className="snap-start shrink-0 w-[78vw] sm:w-64 block"
    >
      <div className="relative h-48 rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-900">
        {item.businessImage ? (
          <img
            src={item.businessImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-md brightness-50"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-800" />
        )}
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute top-3 right-3 z-10 rounded-full bg-black/50 p-2 border border-white/10">
          <LockIcon />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
          <p className="text-white font-semibold text-sm">{item.businessName}</p>
          <p className="text-zinc-300 text-xs mt-0.5">
            {item.itemCount} secret{item.itemCount === 1 ? '' : 's'} · Unlock
          </p>
        </div>
      </div>
    </PendingLink>
  )
}

function SecretTeaserCard({ count, getNavUrl }: { count: number; getNavUrl: (href: string) => string }) {
  return (
    <PendingLink href={getNavUrl('/user/secret-menu')} pendingLabel="Secret Menu" className="snap-start shrink-0 w-[70vw] sm:w-56">
      <div className="relative h-48 rounded-xl overflow-hidden border border-zinc-700/60 flex flex-col items-center justify-center gap-2 bg-zinc-950 group">
        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
          <LockIcon />
        </div>
        <p className="text-white text-sm font-semibold">See all {count}</p>
        <p className="text-zinc-500 text-xs">Secret menus</p>
      </div>
    </PendingLink>
  )
}

// PreferencesCard removed — replaced by PersonalizationWizard

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

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
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
              <PendingLink key={item.id} href={getNavUrl(item.href)} className="group">
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
              </PendingLink>
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
  const paths: Record<string, React.ReactNode> = {
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
