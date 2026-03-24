/**
 * Home Feed Builder
 *
 * Queries the database, applies ranking/filtering/dedup, and returns
 * pre-structured sections ready for the client to render.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseConfig } from '@/lib/utils/franchise-config'
import { getCityDisplayName } from '@/lib/utils/city-detection'
import {
  computeCompositeScore,
  isHybridMode,
  shouldIncludeInPremiumSection,
  shouldIncludeInDishesSection,
  countPremiumBusinesses,
  lightShuffle,
  DedupTracker,
  getTimeOfDay,
  getGreeting,
  getGreetingSubtitle,
  getBusinessImage,
  normaliseTier,
} from './ranking'
import type {
  HomeFeedResponse,
  TonightCard,
  DishCard,
  DealCard,
  PersonalisedCard,
  RewardCard,
  TonightLabel,
  MenuPreviewItem,
} from './types'

const isDev = process.env.NODE_ENV === 'development'
const MAX_CARDS_PER_RAIL = 6
const MIN_CARDS_TO_SHOW = 1

interface BuildFeedParams {
  city: string
  walletPassId: string | null
  userLat?: number | null
  userLng?: number | null
}

export async function buildHomeFeed(params: BuildFeedParams): Promise<HomeFeedResponse> {
  const { city, walletPassId, userLat, userLng } = params
  const supabase = createServiceRoleClient()
  const dedup = new DedupTracker()

  // Fetch franchise config for timezone
  const franchiseConfig = await getFranchiseConfig(city)
  const timezone = franchiseConfig?.timezone ?? 'UTC'
  const cityDisplayName = franchiseConfig?.display_name || getCityDisplayName(city as any)
  const timeOfDay = getTimeOfDay(timezone)

  if (isDev) {
    console.log(`[home-feed] Building feed for ${city} (${timezone}), time: ${timeOfDay}`)
  }

  // Parallel data fetching
  const [businessesResult, offersResult, eventsResult, loyaltyResult, interactionsResult] = await Promise.all([
    fetchBusinesses(supabase, city),
    fetchOffers(supabase, city),
    fetchTonightEvents(supabase, city),
    walletPassId ? fetchLoyaltyMemberships(walletPassId) : Promise.resolve([]),
    walletPassId ? fetchUserInteractions(supabase, walletPassId) : Promise.resolve(null),
  ])

  const businesses = businessesResult
  const offers = offersResult
  const events = eventsResult

  const premiumCount = countPremiumBusinesses(businesses)
  const hybridMode = isHybridMode(premiumCount)

  if (isDev) {
    console.log(`[home-feed] ${businesses.length} businesses, ${offers.length} offers, ${events.length} events`)
    console.log(`[home-feed] Premium count: ${premiumCount}, hybrid mode: ${hybridMode}`)
  }

  // Build user greeting
  const userName = walletPassId ? await fetchUserName(supabase, walletPassId) : null
  const greeting = getGreeting(timeOfDay, userName || 'there', cityDisplayName)
  const greetingSubtitle = getGreetingSubtitle(timeOfDay, cityDisplayName)

  // Build all sections
  const tonight = buildTonightSection(businesses, offers, events, hybridMode, dedup, userLat, userLng)
  const dishes = buildDishesSection(businesses, hybridMode, dedup)
  const deals = buildDealsSection(offers, businesses, dedup, userLat, userLng)
  const personalised = interactionsResult
    ? buildPersonalisedSection(interactionsResult, businesses, offers, hybridMode, dedup)
    : []
  const rewards = loyaltyResult

  // Secret menu teaser
  const secretMenuCount = countSecretMenuItems(businesses)
  const secretTeaser = secretMenuCount > 0 ? { count: secretMenuCount } : null

  // Stats
  const totalOffers = offers.length
  const stats = {
    totalBusinesses: businesses.length,
    totalOffers,
    totalSecretMenus: secretMenuCount,
    badgeCount: 0, // populated client-side from badge tracker
  }

  return {
    meta: {
      timeOfDay,
      cityDisplayName,
      greeting,
      greetingSubtitle,
      premiumCount,
    },
    tonight,
    dishes,
    deals,
    personalised,
    rewards,
    secretTeaser,
    stats,
  }
}

// =============================================================================
// Data Fetching
// =============================================================================

async function fetchBusinesses(supabase: any, city: string) {
  const { data, error } = await supabase
    .from('business_profiles')
    .select(`
      id,
      business_name,
      plan,
      status,
      business_images,
      logo,
      latitude,
      longitude,
      menu_preview,
      business_category,
      business_type,
      system_category,
      display_category,
      rating,
      review_count,
      additional_notes,
      created_at,
      business_subscriptions!business_subscriptions_business_id_fkey(
        is_in_free_trial,
        free_trial_end_date,
        status
      )
    `)
    .in('status', ['approved', 'unclaimed', 'claimed_free'])
    .eq('city', city)
    .not('business_name', 'is', null)

  if (error) {
    console.error('[home-feed] Error fetching businesses:', error)
    return []
  }

  // Filter expired trials
  return (data || []).filter((b: any) => {
    if (!b.business_subscriptions?.length) return true
    const sub = b.business_subscriptions[0]
    if (!sub.is_in_free_trial) return true
    if (sub.free_trial_end_date) {
      return new Date(sub.free_trial_end_date) >= new Date()
    }
    return true
  })
}

async function fetchOffers(supabase: any, city: string) {
  const { data, error } = await supabase
    .from('business_offers')
    .select(`
      id,
      offer_name,
      offer_type,
      offer_value,
      offer_end_date,
      offer_start_date,
      status,
      is_featured,
      display_order,
      offer_image,
      created_at,
      business_id,
      business_profiles!inner(
        id,
        business_name,
        plan,
        status,
        business_images,
        logo,
        latitude,
        longitude,
        city
      )
    `)
    .eq('status', 'approved')
    .eq('business_profiles.city', city)

  if (error) {
    console.error('[home-feed] Error fetching offers:', error)
    return []
  }

  // Filter expired offers client-side
  const now = new Date()
  return (data || []).filter((o: any) => {
    if (o.offer_end_date && new Date(o.offer_end_date) < now) return false
    if (o.offer_start_date && new Date(o.offer_start_date) > now) return false
    return true
  })
}

async function fetchTonightEvents(supabase: any, city: string) {
  // Query the base table directly to avoid computed column issues
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('business_events')
    .select(`
      id,
      event_name,
      event_type,
      event_date,
      event_start_time,
      event_end_time,
      business_id,
      business_profiles!inner(
        id,
        business_name,
        plan,
        status,
        business_images,
        logo,
        latitude,
        longitude,
        city
      )
    `)
    .eq('status', 'approved')
    .eq('event_date', today)
    .eq('business_profiles.city', city)

  if (error) {
    console.error('[home-feed] Error fetching events:', error)
    return []
  }

  return (data || []).map((e: any) => ({
    ...e,
    business_name: e.business_profiles?.business_name,
    logo: e.business_profiles?.logo,
    city: e.business_profiles?.city,
    isToday: true,
  }))
}

async function fetchLoyaltyMemberships(walletPassId: string): Promise<RewardCard[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/loyalty/me?walletPassId=${walletPassId}`, {
      cache: 'no-store',
    })

    if (!res.ok) return []

    const data = await res.json()
    if (!data.memberships || !Array.isArray(data.memberships)) return []

    return data.memberships.map((m: any) => ({
      id: m.id || m.program_id,
      businessName: m.business_name || m.businessName || 'Unknown',
      programType: m.program_type || 'stamps',
      currentBalance: m.stamps_balance || m.points_balance || 0,
      threshold: m.reward_threshold || 10,
      rewardDescription: m.reward_description || 'Free reward',
      stampIcon: m.stamp_icon,
    }))
  } catch (err) {
    console.error('[home-feed] Error fetching loyalty:', err)
    return []
  }
}

interface UserInteractions {
  lovedBusinessIds: string[]
  savedBusinessIds: string[]
  claimedOfferBusinessIds: string[]
  atlasSelectedBusinessIds: string[]
}

async function fetchUserInteractions(supabase: any, walletPassId: string): Promise<UserInteractions | null> {
  try {
    const [vibesResult, savedResult, claimsResult, atlasResult] = await Promise.all([
      supabase
        .from('qwikker_vibes')
        .select('business_id')
        .eq('vibe_user_key', walletPassId)
        .eq('vibe_rating', 'loved_it'),
      supabase
        .from('user_saved_items')
        .select('item_id')
        .eq('wallet_pass_id', walletPassId)
        .eq('item_type', 'business'),
      supabase
        .from('user_offer_claims')
        .select('business_id')
        .eq('wallet_pass_id', walletPassId),
      supabase
        .from('atlas_analytics')
        .select('business_id')
        .eq('user_id', walletPassId)
        .eq('event_type', 'atlas_business_selected'),
    ])

    const loved = (vibesResult.data || []).map((v: any) => v.business_id)
    const saved = (savedResult.data || []).map((s: any) => s.item_id)
    const claimed = (claimsResult.data || []).map((c: any) => c.business_id)
    const atlas = (atlasResult.data || []).map((a: any) => a.business_id)

    const hasInteractions = loved.length + saved.length + claimed.length + atlas.length > 0
    if (!hasInteractions) return null

    return {
      lovedBusinessIds: loved,
      savedBusinessIds: saved,
      claimedOfferBusinessIds: claimed,
      atlasSelectedBusinessIds: atlas,
    }
  } catch (err) {
    console.error('[home-feed] Error fetching interactions:', err)
    return null
  }
}

async function fetchUserName(supabase: any, walletPassId: string): Promise<string | null> {
  const { data } = await supabase
    .from('app_users')
    .select('name')
    .eq('wallet_pass_id', walletPassId)
    .single()

  if (data?.name) {
    // Return first name only
    return data.name.split(' ')[0]
  }
  return null
}

// =============================================================================
// Section Builders
// =============================================================================

function buildTonightSection(
  businesses: any[],
  offers: any[],
  events: any[],
  hybridMode: boolean,
  dedup: DedupTracker,
  userLat?: number | null,
  userLng?: number | null
): TonightCard[] {
  const cards: TonightCard[] = []
  const railBusinessIds = new Set<string>()

  // Category caps
  const caps: Record<TonightLabel, number> = {
    happening_tonight: 2,
    tonights_deal: 3,
    open_now: 2,
    place_to_try: 2,
  }
  const counts: Record<TonightLabel, number> = {
    happening_tonight: 0,
    tonights_deal: 0,
    open_now: 0,
    place_to_try: 0,
  }

  // Priority 1: Tonight's events
  const scoredEvents = events
    .filter((e: any) => {
      const biz = e.business_profiles || businesses.find((b: any) => b.id === e.business_id)
      if (!biz) return false
      return shouldIncludeInPremiumSection(biz.plan, biz.status, hybridMode)
    })
    .map((e: any) => {
      const biz = e.business_profiles || businesses.find((b: any) => b.id === e.business_id)!
      return {
        ...e,
        biz,
        score: computeCompositeScore({
          plan: biz.plan,
          status: biz.status,
          latitude: biz.latitude,
          longitude: biz.longitude,
          userLat,
          userLng,
        }),
      }
    })
    .sort((a: any, b: any) => b.score - a.score)

  for (const event of scoredEvents) {
    if (cards.length >= MAX_CARDS_PER_RAIL) break
    if (counts.happening_tonight >= caps.happening_tonight) break
    if (!dedup.canUseBusinessInRail(event.business_id, railBusinessIds)) continue

    const { image, logo } = getBusinessImage(event.biz.business_images, event.biz.logo || event.logo)
    cards.push({
      id: `event-${event.id}`,
      label: 'happening_tonight',
      businessId: event.business_id,
      businessName: event.biz.business_name || event.business_name,
      businessImage: image,
      businessLogo: logo,
      tier: normaliseTier(event.biz.plan),
      eventId: event.id,
      eventName: event.event_name,
      eventTime: event.event_start_time,
      eventType: event.event_type,
    })
    railBusinessIds.add(event.business_id)
    dedup.markBusinessUsed(event.business_id)
    counts.happening_tonight++

    if (isDev) {
      console.log(`[tonight] +event: "${event.event_name}" at ${event.biz.business_name} (score: ${event.score.toFixed(1)})`)
    }
  }

  // Priority 2: Tonight's deals
  const scoredOffers = offers
    .filter((o: any) => {
      const biz = o.business_profiles
      return shouldIncludeInPremiumSection(biz.plan, biz.status, hybridMode)
    })
    .map((o: any) => ({
      ...o,
      score: computeCompositeScore({
        plan: o.business_profiles.plan,
        status: o.business_profiles.status,
        latitude: o.business_profiles.latitude,
        longitude: o.business_profiles.longitude,
        userLat,
        userLng,
        offerEndDate: o.offer_end_date,
        createdAt: o.created_at,
      }),
    }))
    .sort((a: any, b: any) => b.score - a.score)

  for (const offer of scoredOffers) {
    if (cards.length >= MAX_CARDS_PER_RAIL) break
    if (counts.tonights_deal >= caps.tonights_deal) break
    if (!dedup.canUseBusinessInRail(offer.business_id, railBusinessIds)) continue
    if (!dedup.canUseOffer(offer.id)) continue

    const biz = offer.business_profiles
    const { image, logo } = getBusinessImage(biz.business_images, biz.logo)
    cards.push({
      id: `deal-${offer.id}`,
      label: 'tonights_deal',
      businessId: offer.business_id,
      businessName: biz.business_name,
      businessImage: image,
      businessLogo: logo,
      tier: normaliseTier(biz.plan),
      offerId: offer.id,
      offerName: offer.offer_name,
      offerValue: offer.offer_value,
      offerType: offer.offer_type,
    })
    railBusinessIds.add(offer.business_id)
    dedup.markBusinessUsed(offer.business_id)
    dedup.markOfferUsed(offer.id)
    counts.tonights_deal++

    if (isDev) {
      console.log(`[tonight] +deal: "${offer.offer_name}" at ${biz.business_name} (score: ${offer.score.toFixed(1)})`)
    }
  }

  // Priority 3 & 4: Place to try (fill remaining slots)
  if (cards.length < MAX_CARDS_PER_RAIL) {
    const scoredBusinesses = businesses
      .filter((b: any) => shouldIncludeInPremiumSection(b.plan, b.status, hybridMode))
      .map((b: any) => ({
        ...b,
        score: computeCompositeScore({
          plan: b.plan,
          status: b.status,
          latitude: b.latitude,
          longitude: b.longitude,
          userLat,
          userLng,
          createdAt: b.created_at,
        }),
      }))
      .sort((a: any, b: any) => b.score - a.score)

    // Dynamic cap: expand to fill remaining slots when events/deals are scarce
    const dynamicPlaceCap = Math.max(caps.place_to_try, MAX_CARDS_PER_RAIL - cards.length)

    for (const biz of scoredBusinesses) {
      if (cards.length >= MAX_CARDS_PER_RAIL) break
      if (counts.place_to_try >= dynamicPlaceCap) break
      if (!dedup.canUseBusinessInRail(biz.id, railBusinessIds)) continue

      const { image, logo } = getBusinessImage(biz.business_images, biz.logo)
      cards.push({
        id: `place-${biz.id}`,
        label: 'place_to_try',
        businessId: biz.id,
        businessName: biz.business_name,
        businessImage: image,
        businessLogo: logo,
        tier: normaliseTier(biz.plan),
      })
      railBusinessIds.add(biz.id)
      dedup.markBusinessUsed(biz.id)
      counts.place_to_try++

      if (isDev) {
        console.log(`[tonight] +place: "${biz.business_name}" (plan: ${biz.plan}, score: ${biz.score.toFixed(1)})`)
      }
    }
  }

  if (isDev) {
    console.log(`[tonight] Final: ${cards.length} cards (events: ${counts.happening_tonight}, deals: ${counts.tonights_deal}, places: ${counts.place_to_try})`)
  }

  // Cards are already sorted by priority (events > deals > places)
  // and by composite score within each category -- no shuffle needed
  return cards.length >= MIN_CARDS_TO_SHOW ? cards : []
}

function buildDishesSection(
  businesses: any[],
  hybridMode: boolean,
  dedup: DedupTracker
): DishCard[] {
  const allDishes: (DishCard & { compositeScore: number })[] = []
  const railBusinessIds = new Set<string>()

  for (const biz of businesses) {
    if (!shouldIncludeInDishesSection(biz.plan, biz.status, hybridMode)) continue
    if (!biz.menu_preview || !Array.isArray(biz.menu_preview)) continue

    const score = computeCompositeScore({ plan: biz.plan, status: biz.status })
    const { image, logo } = getBusinessImage(biz.business_images, biz.logo)

    for (const dish of biz.menu_preview as MenuPreviewItem[]) {
      if (!dish.name) continue
      allDishes.push({
        id: `dish-${biz.id}-${dish.name.toLowerCase().trim().replace(/\s+/g, '-')}`,
        dishName: dish.name,
        dishPrice: dish.price || null,
        dishDescription: dish.description || null,
        businessId: biz.id,
        businessName: biz.business_name,
        businessImage: image,
        businessLogo: logo,
        tier: normaliseTier(biz.plan),
        compositeScore: score,
      })
    }
  }

  // Sort, deduplicate, cap
  const sorted = lightShuffle(allDishes)
  const result: DishCard[] = []

  for (const dish of sorted) {
    if (result.length >= MAX_CARDS_PER_RAIL) break
    if (!dedup.canUseBusinessInRail(dish.businessId, railBusinessIds)) continue
    if (!dedup.canUseDish(dish.businessId, dish.dishName)) continue

    const { compositeScore, ...card } = dish
    result.push(card)
    railBusinessIds.add(dish.businessId)
    dedup.markBusinessUsed(dish.businessId)
    dedup.markDishUsed(dish.businessId, dish.dishName)

    if (isDev) {
      console.log(`[dishes] +dish: "${dish.dishName}" from ${dish.businessName} (score: ${compositeScore.toFixed(1)})`)
    }
  }

  return result.length >= MIN_CARDS_TO_SHOW ? result : []
}

function buildDealsSection(
  offers: any[],
  businesses: any[],
  dedup: DedupTracker,
  userLat?: number | null,
  userLng?: number | null
): DealCard[] {
  const railBusinessIds = new Set<string>()

  const scored = offers.map((o: any) => {
    const biz = o.business_profiles
    return {
      ...o,
      score: computeCompositeScore({
        plan: biz.plan,
        status: biz.status,
        latitude: biz.latitude,
        longitude: biz.longitude,
        userLat,
        userLng,
        offerEndDate: o.offer_end_date,
        createdAt: o.created_at,
      }),
    }
  })

  const sorted = lightShuffle(scored)
  const result: DealCard[] = []

  for (const offer of sorted) {
    if (result.length >= MAX_CARDS_PER_RAIL) break
    if (!dedup.canUseBusinessInRail(offer.business_id, railBusinessIds)) continue
    if (!dedup.canUseOffer(offer.id)) continue

    const biz = offer.business_profiles
    const { image, logo } = getBusinessImage(biz.business_images, biz.logo)
    result.push({
      id: `deal-${offer.id}`,
      offerId: offer.id,
      offerName: offer.offer_name,
      offerValue: offer.offer_value,
      offerType: offer.offer_type,
      offerEndDate: offer.offer_end_date,
      businessId: offer.business_id,
      businessName: biz.business_name,
      businessImage: image,
      businessLogo: logo,
      tier: normaliseTier(biz.plan),
    })
    railBusinessIds.add(offer.business_id)
    dedup.markBusinessUsed(offer.business_id)
    dedup.markOfferUsed(offer.id)

    if (isDev) {
      console.log(`[deals] +deal: "${offer.offer_name}" at ${biz.business_name} (score: ${offer.score.toFixed(1)})`)
    }
  }

  // Hidden when empty
  return result.length >= MIN_CARDS_TO_SHOW ? result : []
}

function buildPersonalisedSection(
  interactions: UserInteractions,
  businesses: any[],
  offers: any[],
  hybridMode: boolean,
  dedup: DedupTracker
): PersonalisedCard[] {
  // Score each business the user has interacted with
  const businessScores = new Map<string, number>()

  for (const id of interactions.lovedBusinessIds) {
    businessScores.set(id, (businessScores.get(id) || 0) + 3)
  }
  for (const id of interactions.savedBusinessIds) {
    businessScores.set(id, (businessScores.get(id) || 0) + 2)
  }
  for (const id of interactions.claimedOfferBusinessIds) {
    businessScores.set(id, (businessScores.get(id) || 0) + 1)
  }
  for (const id of interactions.atlasSelectedBusinessIds) {
    businessScores.set(id, (businessScores.get(id) || 0) + 1)
  }

  if (businessScores.size === 0) return []

  const railBusinessIds = new Set<string>()

  // Sort businesses by interaction score, then tier
  const ranked = Array.from(businessScores.entries())
    .map(([bizId, interactionScore]) => {
      const biz = businesses.find((b: any) => b.id === bizId)
      if (!biz) return null
      const tierScore = computeCompositeScore({ plan: biz.plan, status: biz.status })
      return { biz, interactionScore, totalScore: interactionScore * 10 + tierScore }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.totalScore - a.totalScore)

  const result: PersonalisedCard[] = []

  for (const item of ranked) {
    if (!item) continue
    if (result.length >= MAX_CARDS_PER_RAIL) break
    if (!dedup.canUseBusinessInRail(item.biz.id, railBusinessIds)) continue

    const { image, logo } = getBusinessImage(item.biz.business_images, item.biz.logo)

    // Find a relevant offer or dish to surface
    const bizOffer = offers.find((o: any) =>
      o.business_id === item.biz.id && dedup.canUseOffer(o.id)
    )
    const bizDish = item.biz.menu_preview?.[0] as MenuPreviewItem | undefined

    // Determine reason text
    const reasons: string[] = []
    if (interactions.lovedBusinessIds.includes(item.biz.id)) reasons.push('You loved this')
    if (interactions.savedBusinessIds.includes(item.biz.id)) reasons.push('You saved this')
    if (interactions.claimedOfferBusinessIds.includes(item.biz.id)) reasons.push('You claimed a deal here')
    const reason = reasons[0] || 'Based on your activity'

    result.push({
      id: `personal-${item.biz.id}`,
      businessId: item.biz.id,
      businessName: item.biz.business_name,
      businessImage: image,
      businessLogo: logo,
      tier: normaliseTier(item.biz.plan),
      reason,
      offerName: bizOffer?.offer_name,
      offerValue: bizOffer?.offer_value,
      dishName: bizDish?.name,
    })
    railBusinessIds.add(item.biz.id)
    dedup.markBusinessUsed(item.biz.id)
    if (bizOffer) dedup.markOfferUsed(bizOffer.id)
    if (bizDish) dedup.markDishUsed(item.biz.id, bizDish.name)
  }

  return result.length >= MIN_CARDS_TO_SHOW ? result : []
}

// =============================================================================
// Helpers
// =============================================================================

function countSecretMenuItems(businesses: any[]): number {
  return businesses.reduce((total: number, b: any) => {
    if (!b.additional_notes) return total
    try {
      const notes = JSON.parse(b.additional_notes)
      const items = notes.secret_menu_items || []
      return total + items.length
    } catch {
      return total
    }
  }, 0)
}
