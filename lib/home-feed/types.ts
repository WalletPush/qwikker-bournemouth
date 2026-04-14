/**
 * Home Feed Types
 *
 * All type definitions for the user homepage feed system.
 * The server builds pre-ranked, pre-structured sections.
 * The client is a pure renderer.
 */

export type TimeOfDay = 'morning' | 'lunch' | 'afternoon' | 'evening' | 'late_night'

export type TonightLabel = 'happening_tonight' | 'tonights_deal' | 'open_now' | 'place_to_try'

export type BusinessTier = 'spotlight' | 'featured' | 'starter' | 'free'

export type BusinessStatus = 'approved' | 'unclaimed' | 'claimed_free'

export interface HomeFeedMeta {
  timeOfDay: TimeOfDay
  cityDisplayName: string
  greeting: string
  greetingSubtitle: string
  premiumCount: number
}

export interface TonightCard {
  id: string
  label: TonightLabel
  businessId: string
  businessName: string
  businessSlug: string
  businessImage: string | null
  businessLogo: string | null
  tier: BusinessTier | null
  reason?: string
  offerId?: string
  offerName?: string
  offerValue?: string
  offerType?: string
  eventId?: string
  eventName?: string
  eventTime?: string
  eventType?: string
}

export interface DishCard {
  id: string
  dishName: string
  dishPrice: string | null
  dishDescription: string | null
  dishImage: string | null
  businessId: string
  businessName: string
  businessSlug: string
  businessImage: string | null
  businessLogo: string | null
  tier: BusinessTier | null
  reason?: string
}

export interface DealCard {
  id: string
  offerId: string
  offerName: string
  offerValue: string
  offerType: string
  offerEndDate: string | null
  businessId: string
  businessName: string
  businessImage: string | null
  businessLogo: string | null
  tier: BusinessTier | null
  reason?: string
}

export interface PersonalizedCard {
  id: string
  businessId: string
  businessName: string
  businessSlug: string
  businessImage: string | null
  businessLogo: string | null
  tier: BusinessTier | null
  reason: string
  offerName?: string
  offerValue?: string
  dishName?: string
}

export interface RewardCard {
  id: string
  programPublicId: string
  businessId?: string
  businessName: string
  businessLogo: string | null
  programType: 'stamps' | 'points'
  currentBalance: number
  threshold: number
  rewardDescription: string
  stampIcon?: string
}

export interface SecretTeaser {
  count: number
}

export interface HomeFeedResponse {
  meta: HomeFeedMeta
  tonight: TonightCard[]
  dishes: DishCard[]
  deals: DealCard[]
  personalized: PersonalizedCard[]
  rewards: RewardCard[]
  secretTeaser: SecretTeaser | null
  stats: {
    totalBusinesses: number
    totalOffers: number
    totalSecretMenus: number
    badgeCount: number
  }
}

// Feed personalization types

export interface UserFeedProfile {
  firstName: string | null
  preferredCategories: string[]
  dietaryRestrictions: string[]
}

export type LoyaltyStatus = 'reward_ready' | 'almost_there' | 'member'

// Internal types used during ranking (not exposed to client)

export interface ScoredBusiness {
  id: string
  businessName: string
  plan: string | null
  status: string | null
  businessImages: string[] | null
  logo: string | null
  latitude: number | null
  longitude: number | null
  menuPreview: MenuPreviewItem[] | null
  category: string | null
  rating: number | null
  compositeScore: number
}

export interface MenuPreviewItem {
  name: string
  price: string
  description: string
  image_url?: string
}

export interface ScoredOffer {
  id: string
  offerName: string
  offerType: string
  offerValue: string
  offerEndDate: string | null
  offerStartDate: string | null
  isFeatured: boolean
  businessId: string
  businessName: string
  businessPlan: string | null
  businessImages: string[] | null
  businessLogo: string | null
  compositeScore: number
}

export interface ScoredEvent {
  id: string
  eventName: string
  eventType: string | null
  eventDate: string
  eventStartTime: string | null
  eventEndTime: string | null
  isToday: boolean
  businessId: string
  businessName: string
  businessLogo: string | null
  compositeScore: number
}
