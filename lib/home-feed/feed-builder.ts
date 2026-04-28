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
import { CATEGORY_MAP, normalize } from '@/lib/constants/user-preferences'
import type {
  HomeFeedResponse,
  TonightCard,
  DishCard,
  DealCard,
  PersonalizedCard,
  RewardCard,
  TonightLabel,
  MenuPreviewItem,
  UserFeedProfile,
  LoyaltyStatus,
} from './types'

const isDev = process.env.NODE_ENV === 'development'
const MAX_CARDS_PER_RAIL = 6
const MIN_CARDS_TO_SHOW = 1

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

/**
 * Returns true if the offer text mentions a specific day that doesn't match today.
 * e.g. "Sunday lunch" on a Thursday → true (should be excluded)
 */
function isMismatchedDayOffer(offerName: string): boolean {
  const text = offerName.toLowerCase()
  const todayIndex = new Date().getDay()

  for (let i = 0; i < DAY_NAMES.length; i++) {
    const day = DAY_NAMES[i]
    const short = day.slice(0, 3)
    const regex = new RegExp(`\\b${day}s?\\b|\\b${short}s?\\b`)
    if (regex.test(text) && i !== todayIndex) return true
  }

  const isWeekend = todayIndex === 0 || todayIndex === 6
  if (/\bweekend\b/.test(text) && !isWeekend) return true
  if (/\bweekday\b/.test(text) && isWeekend) return true

  return false
}

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

  // Build user profile for personalization
  const userProfile: UserFeedProfile = walletPassId
    ? await fetchUserProfile(supabase, walletPassId)
    : { firstName: null, preferredCategories: [], dietaryRestrictions: [] }
  const greeting = getGreeting(timeOfDay, userProfile.firstName || 'there', cityDisplayName)
  const greetingSubtitle = getGreetingSubtitle(timeOfDay, cityDisplayName)

  // Build loyalty status map for cross-section boosting
  const loyaltyMap = buildLoyaltyStatusMap(loyaltyResult)

  // Pre-compute category match tokens once for all section builders
  const mappedTokens = userProfile.preferredCategories
    .flatMap(p => CATEGORY_MAP[p] || [p])
    .map(normalize)

  if (isDev && mappedTokens.length > 0) {
    console.log(`[home-feed] User preferences: categories=${userProfile.preferredCategories.join(',')}, dietary=${userProfile.dietaryRestrictions.join(',')}, loyalty=${loyaltyMap.size} memberships`)
  }

  // Build all sections with personalization context
  const tonight = buildTonightSection(businesses, offers, events, hybridMode, dedup, userLat, userLng, mappedTokens, loyaltyMap)
  const dishes = buildDishesSection(businesses, hybridMode, dedup, userProfile.dietaryRestrictions, mappedTokens, loyaltyMap)
  const deals = buildDealsSection(offers, businesses, dedup, userLat, userLng, mappedTokens, loyaltyMap)
  const personalized = interactionsResult
    ? buildPersonalizedSection(interactionsResult, businesses, offers, hybridMode, dedup, userProfile.preferredCategories, loyaltyMap)
    : []
  const rewards = loyaltyResult

  // Secret menu teaser
  const secretMenuCount = countSecretMenuItems(businesses)
  const secretTeaser = secretMenuCount > 0 ? { count: secretMenuCount } : null

  // Count upcoming events (today + future)
  const today = new Date().toISOString().split('T')[0]
  const { count: upcomingEventCount } = await supabase
    .from('business_events')
    .select('id, business_profiles!inner(city)', { count: 'exact', head: true })
    .eq('status', 'approved')
    .gte('event_date', today)
    .eq('business_profiles.city', city)

  // Stats
  const stats = {
    totalBusinesses: businesses.length,
    totalOffers: offers.length,
    totalSecretMenus: secretMenuCount,
    totalEvents: upcomingEventCount ?? 0,
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
    personalized,
    rewards,
    secretTeaser,
    stats,
  }
}

// =============================================================================
// Data Fetching
// =============================================================================

function generateSlug(businessName: string | null, id: string): string {
  if (!businessName) return id
  return businessName.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || id
}

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
      vibe_tags,
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
        system_category,
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
      event_image,
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
        system_category,
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
    const supabase = createServiceRoleClient()

    const { data: memberships, error } = await supabase
      .from('loyalty_memberships')
      .select(`
        *,
        loyalty_programs(
          id, public_id, business_id, program_name, type, reward_threshold, reward_description,
          stamp_label, stamp_icon, status, primary_color, city,
          business_profiles(business_name, logo)
        )
      `)
      .eq('user_wallet_pass_id', walletPassId)
      .eq('status', 'active')
      .order('last_active_at', { ascending: false })

    if (error || !memberships || memberships.length === 0) return []

    return (memberships as any[])
      .filter((m) => m.loyalty_programs)
      .map((m) => {
        const program = m.loyalty_programs
        const bp = program.business_profiles || {}
        return {
          id: m.id || m.program_id,
          programPublicId: program.public_id || '',
          businessId: program.business_id || undefined,
          businessName: bp.business_name || 'Unknown',
          businessLogo: bp.logo || null,
          programType: program.type || 'stamps',
          currentBalance: m.stamps_balance || m.points_balance || 0,
          threshold: program.reward_threshold || 10,
          rewardDescription: program.reward_description || 'Free reward',
          stampIcon: program.stamp_icon,
        }
      })
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

async function fetchUserProfile(supabase: any, walletPassId: string): Promise<UserFeedProfile> {
  const { data } = await supabase
    .from('app_users')
    .select('name, preferred_categories, dietary_restrictions')
    .eq('wallet_pass_id', walletPassId)
    .single()

  return {
    firstName: data?.name ? data.name.split(' ')[0] : null,
    preferredCategories: data?.preferred_categories || [],
    dietaryRestrictions: data?.dietary_restrictions || [],
  }
}

// =============================================================================
// Personalization Helpers
// =============================================================================

const MEAT_KEYWORDS = /\b(chicken|beef|steak|pork|lamb|bacon|sausage|ribs|brisket|wing|duck|turkey|prawn|shrimp|lobster|crab|oyster|salmon|tuna|fish|ham|chorizo|salami|pepperoni|meatball|pulled pork|burger patty)\b/i
const DAIRY_KEYWORDS = /\b(cheese|cream|butter|milk|yogurt|mozzarella|parmesan|brie|cheddar|mascarpone)\b/i
const GLUTEN_KEYWORDS = /\b(bread|pasta|pizza|pastry|croissant|donut|pie|flour tortilla|naan|wrap|panini|ciabatta|baguette|sourdough)\b/i
const SHELLFISH_KEYWORDS = /\b(prawn|shrimp|lobster|crab|oyster|mussel|clam|scallop)\b/i

/**
 * Check if a dish name/description conflicts with user dietary restrictions.
 * Returns true if the dish should be demoted.
 */
function hasDishDietaryConflict(dishName: string, dishDescription: string | null, restrictions: string[]): boolean {
  if (restrictions.length === 0) return false
  const text = `${dishName} ${dishDescription || ''}`.toLowerCase()
  const lower = restrictions.map(r => r.toLowerCase())

  if ((lower.includes('vegan') || lower.includes('vegetarian')) && MEAT_KEYWORDS.test(text)) return true
  if (lower.includes('vegan') && DAIRY_KEYWORDS.test(text)) return true
  if ((lower.includes('gluten-free') || lower.includes('gluten free')) && GLUTEN_KEYWORDS.test(text)) return true
  if ((lower.includes('shellfish allergy') || lower.includes('shellfish')) && SHELLFISH_KEYWORDS.test(text)) return true
  if ((lower.includes('dairy-free') || lower.includes('dairy free')) && DAIRY_KEYWORDS.test(text)) return true

  return false
}

/**
 * Compute preference boost for a business based on category match and vibe tags.
 */
function computeBusinessPreferenceBoost(
  biz: any,
  mappedTokens: string[],
  loyaltyMap: Map<string, LoyaltyStatus>
): { boost: number; reasons: string[] } {
  let boost = 0
  const reasons: string[] = []

  // Category match: +10 if user preferences align with business category
  if (mappedTokens.length > 0) {
    const fields = [
      normalize(biz.display_category),
      normalize(biz.system_category),
      normalize(biz.business_type),
    ].filter(Boolean)
    if (fields.some(f => mappedTokens.some(token => f.includes(token)))) {
      boost += 10
      reasons.push('Matches your taste')
    }
  }

  // Vibe tag overlap: +5 if business vibe tags match user category interests
  const vt = biz.vibe_tags as { selected?: string[]; custom?: string[] } | null
  if (vt && mappedTokens.length > 0) {
    const allTags = [...(vt.selected || []), ...(vt.custom || [])].map(t => t.toLowerCase())
    if (allTags.some(tag => mappedTokens.some(token => tag.includes(token)))) {
      boost += 5
      if (!reasons.includes('Matches your taste')) reasons.push('Matches your vibe')
    }
  }

  // Loyalty boost based on membership status
  const loyaltyStatus = loyaltyMap.get(biz.id)
  if (loyaltyStatus === 'reward_ready') {
    boost += 12
    reasons.push('Reward waiting')
  } else if (loyaltyStatus === 'almost_there') {
    boost += 6
    reasons.push('Almost earned a reward')
  } else if (loyaltyStatus === 'member') {
    boost += 3
  }

  return { boost, reasons }
}

/**
 * Build a Map<businessId, LoyaltyStatus> from RewardCard array.
 */
function buildLoyaltyStatusMap(rewards: RewardCard[]): Map<string, LoyaltyStatus> {
  const map = new Map<string, LoyaltyStatus>()
  for (const r of rewards) {
    if (!r.businessId) continue
    if (r.currentBalance >= r.threshold) {
      map.set(r.businessId, 'reward_ready')
    } else if (r.currentBalance >= r.threshold - 2 && r.currentBalance > 0) {
      map.set(r.businessId, 'almost_there')
    } else {
      map.set(r.businessId, 'member')
    }
  }
  return map
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
  userLng?: number | null,
  mappedTokens: string[] = [],
  loyaltyMap: Map<string, LoyaltyStatus> = new Map()
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
      const { boost, reasons } = computeBusinessPreferenceBoost(biz, mappedTokens, loyaltyMap)
      return {
        ...e,
        biz,
        prefReasons: reasons,
        score: computeCompositeScore({
          plan: biz.plan,
          status: biz.status,
          latitude: biz.latitude,
          longitude: biz.longitude,
          userLat,
          userLng,
          preferenceBoost: boost,
        }),
      }
    })
    .sort((a: any, b: any) => b.score - a.score)

  for (const event of scoredEvents) {
    if (cards.length >= MAX_CARDS_PER_RAIL) break
    if (counts.happening_tonight >= caps.happening_tonight) break
    if (!dedup.canUseBusinessInRail(event.business_id, railBusinessIds)) continue

    const { image, logo } = getBusinessImage(event.biz.business_images, event.biz.logo || event.logo, event.biz.system_category, event.business_id)
    cards.push({
      id: `event-${event.id}`,
      label: 'happening_tonight',
      businessId: event.business_id,
      businessName: event.biz.business_name || event.business_name,
      businessSlug: generateSlug(event.biz.business_name, event.business_id),
      businessImage: image,
      businessLogo: logo,
      tier: normaliseTier(event.biz.plan),
      reason: event.prefReasons?.length > 0 ? event.prefReasons[0] : undefined,
      eventId: event.id,
      eventName: event.event_name,
      eventTime: event.event_start_time,
      eventType: event.event_type,
      eventImage: event.event_image || null,
    })
    railBusinessIds.add(event.business_id)
    dedup.markBusinessUsed(event.business_id)
    counts.happening_tonight++

    if (isDev) {
      console.log(`[tonight] +event: "${event.event_name}" at ${event.biz.business_name} (score: ${event.score.toFixed(1)})`)
    }
  }

  // Priority 2: Tonight's deals (skip offers that mention a different day)
  const scoredOffers = offers
    .filter((o: any) => {
      const biz = o.business_profiles
      if (!shouldIncludeInPremiumSection(biz.plan, biz.status, hybridMode)) return false
      if (isMismatchedDayOffer(o.offer_name || '')) return false
      return true
    })
    .map((o: any) => {
      const biz = o.business_profiles
      const { boost, reasons } = computeBusinessPreferenceBoost(biz, mappedTokens, loyaltyMap)
      return {
        ...o,
        prefReasons: reasons,
        score: computeCompositeScore({
          plan: biz.plan,
          status: biz.status,
          latitude: biz.latitude,
          longitude: biz.longitude,
          userLat,
          userLng,
          offerEndDate: o.offer_end_date,
          createdAt: o.created_at,
          preferenceBoost: boost,
        }),
      }
    })
    .sort((a: any, b: any) => b.score - a.score)

  for (const offer of scoredOffers) {
    if (cards.length >= MAX_CARDS_PER_RAIL) break
    if (counts.tonights_deal >= caps.tonights_deal) break
    if (!dedup.canUseBusinessInRail(offer.business_id, railBusinessIds)) continue
    if (!dedup.canUseOffer(offer.id)) continue

    const biz = offer.business_profiles
    const { image, logo } = getBusinessImage(biz.business_images, biz.logo, biz.system_category, offer.business_id)
    cards.push({
      id: `deal-${offer.id}`,
      label: 'tonights_deal',
      businessId: offer.business_id,
      businessName: biz.business_name,
      businessSlug: generateSlug(biz.business_name, offer.business_id),
      businessImage: image,
      businessLogo: logo,
      tier: normaliseTier(biz.plan),
      reason: offer.prefReasons?.length > 0 ? offer.prefReasons[0] : undefined,
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
      .map((b: any) => {
        const { boost, reasons } = computeBusinessPreferenceBoost(b, mappedTokens, loyaltyMap)
        return {
          ...b,
          prefReasons: reasons,
          score: computeCompositeScore({
            plan: b.plan,
            status: b.status,
            latitude: b.latitude,
            longitude: b.longitude,
            userLat,
            userLng,
            createdAt: b.created_at,
            preferenceBoost: boost,
          }),
        }
      })
      .sort((a: any, b: any) => b.score - a.score)

    // Dynamic cap: expand to fill remaining slots when events/deals are scarce
    const dynamicPlaceCap = Math.max(caps.place_to_try, MAX_CARDS_PER_RAIL - cards.length)

    for (const biz of scoredBusinesses) {
      if (cards.length >= MAX_CARDS_PER_RAIL) break
      if (counts.place_to_try >= dynamicPlaceCap) break
      if (!dedup.canUseBusinessInRail(biz.id, railBusinessIds)) continue

      const { image, logo } = getBusinessImage(biz.business_images, biz.logo, biz.system_category, biz.id)
      cards.push({
        id: `place-${biz.id}`,
        label: 'place_to_try',
        businessId: biz.id,
        businessName: biz.business_name,
        businessSlug: generateSlug(biz.business_name, biz.id),
        businessImage: image,
        businessLogo: logo,
        tier: normaliseTier(biz.plan),
        reason: biz.prefReasons?.length > 0 ? biz.prefReasons[0] : undefined,
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
  dedup: DedupTracker,
  dietaryRestrictions: string[] = [],
  mappedTokens: string[] = [],
  loyaltyMap: Map<string, LoyaltyStatus> = new Map()
): DishCard[] {
  const allDishes: (DishCard & { compositeScore: number })[] = []
  const railBusinessIds = new Set<string>()

  for (const biz of businesses) {
    if (!shouldIncludeInDishesSection(biz.plan, biz.status, hybridMode)) continue
    if (!biz.menu_preview || !Array.isArray(biz.menu_preview)) continue

    const { boost, reasons } = computeBusinessPreferenceBoost(biz, mappedTokens, loyaltyMap)
    const { image, logo } = getBusinessImage(biz.business_images, biz.logo, biz.system_category, biz.id)

    for (const dish of biz.menu_preview as MenuPreviewItem[]) {
      if (!dish.name) continue

      // Dietary conflict demotion: push conflicting dishes to bottom, not removed
      const dietaryPenalty = hasDishDietaryConflict(dish.name, dish.description, dietaryRestrictions) ? -20 : 0

      const score = computeCompositeScore({
        plan: biz.plan,
        status: biz.status,
        preferenceBoost: boost + dietaryPenalty,
      })

      allDishes.push({
        id: `dish-${biz.id}-${dish.name.toLowerCase().trim().replace(/\s+/g, '-')}`,
        dishName: dish.name,
        dishPrice: dish.price || null,
        dishDescription: dish.description || null,
        dishImage: dish.image_url || null,
        businessId: biz.id,
        businessName: biz.business_name,
        businessSlug: generateSlug(biz.business_name, biz.id),
        businessImage: image,
        businessLogo: logo,
        tier: normaliseTier(biz.plan),
        reason: dietaryPenalty === 0 && reasons.length > 0 ? reasons[0] : undefined,
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
  userLng?: number | null,
  mappedTokens: string[] = [],
  loyaltyMap: Map<string, LoyaltyStatus> = new Map()
): DealCard[] {
  const railBusinessIds = new Set<string>()

  const scored = offers.map((o: any) => {
    const biz = o.business_profiles
    const { boost, reasons } = computeBusinessPreferenceBoost(biz, mappedTokens, loyaltyMap)
    return {
      ...o,
      prefReasons: reasons,
      score: computeCompositeScore({
        plan: biz.plan,
        status: biz.status,
        latitude: biz.latitude,
        longitude: biz.longitude,
        userLat,
        userLng,
        offerEndDate: o.offer_end_date,
        createdAt: o.created_at,
        preferenceBoost: boost,
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
    const { image, logo } = getBusinessImage(biz.business_images, biz.logo, biz.system_category, offer.business_id)
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
      reason: offer.prefReasons?.length > 0 ? offer.prefReasons[0] : undefined,
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

function buildPersonalizedSection(
  interactions: UserInteractions,
  businesses: any[],
  offers: any[],
  hybridMode: boolean,
  dedup: DedupTracker,
  preferredCategories: string[] = [],
  loyaltyMap: Map<string, LoyaltyStatus> = new Map()
): PersonalizedCard[] {
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

  const mappedTokens = preferredCategories.flatMap(p => CATEGORY_MAP[p] || [p]).map(normalize)
  const railBusinessIds = new Set<string>()

  const ranked = Array.from(businessScores.entries())
    .map(([bizId, interactionScore]) => {
      const biz = businesses.find((b: any) => b.id === bizId)
      if (!biz) return null

      // Preference boost from shared helper (category +10, vibe +5, loyalty +3/6/12)
      const { boost: prefBoost, reasons: prefReasons } = computeBusinessPreferenceBoost(biz, mappedTokens, loyaltyMap)

      const tierScore = computeCompositeScore({ plan: biz.plan, status: biz.status })
      const totalScore = (interactionScore + prefBoost) * 10 + tierScore
      return { biz, interactionScore, prefReasons, totalScore }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.totalScore - a.totalScore)

  const result: PersonalizedCard[] = []

  for (const item of ranked) {
    if (!item) continue
    if (result.length >= MAX_CARDS_PER_RAIL) break
    if (!dedup.canUseBusinessInRail(item.biz.id, railBusinessIds)) continue

    const { image, logo } = getBusinessImage(item.biz.business_images, item.biz.logo, item.biz.system_category, item.biz.id)

    const bizOffer = offers.find((o: any) =>
      o.business_id === item.biz.id && dedup.canUseOffer(o.id)
    )
    const bizDish = item.biz.menu_preview?.[0] as MenuPreviewItem | undefined

    // Build rich reason string combining interaction + preference + loyalty
    const reasons: string[] = []
    if (interactions.lovedBusinessIds.includes(item.biz.id)) reasons.push('You loved this')
    if (interactions.savedBusinessIds.includes(item.biz.id)) reasons.push('You saved this')
    if (interactions.claimedOfferBusinessIds.includes(item.biz.id)) reasons.push('You claimed a deal here')
    if (interactions.atlasSelectedBusinessIds.includes(item.biz.id)) reasons.push('You explored this')
    for (const pr of item.prefReasons) {
      if (!reasons.includes(pr)) reasons.push(pr)
    }
    const reason = reasons.length > 0 ? reasons.join(' · ') : 'Based on your activity'

    result.push({
      id: `personal-${item.biz.id}`,
      businessId: item.biz.id,
      businessName: item.biz.business_name,
      businessSlug: generateSlug(item.biz.business_name, item.biz.id),
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
