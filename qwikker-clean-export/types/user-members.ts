// TypeScript types for user members (app users, not businesses)

export type UserTier = 'explorer' | 'insider' | 'legend'
export type UserCity = 'bournemouth' | 'poole' | 'christchurch' | 'wimborne' | 'ferndown' | 'ringwood' | 'new_milton' | 'other'
export type WalletPassStatus = 'pending' | 'assigned' | 'active' | 'expired' | 'revoked'

export interface UserMemberStats {
  businessesVisited: number
  secretItemsUnlocked: number
  offersRedeemed: number
  friendsReferred: number
  reviewsWritten: number
  photosShared: number
  chatMessages: number
  streakDays: number
}

export interface UserMemberBadge {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  pointsRequired?: number
  alternateRequirement?: {
    type: 'days' | 'visits' | 'referrals' | 'unlocks'
    amount: number
    label: string
  }
  unlockedDate?: string
  progress?: {
    current: number
    target: number
  }
  reward?: {
    type: 'free_item' | 'discount' | 'exclusive_access' | 'special_experience'
    businessName: string
    businessId: string
    title: string
    description: string
    value: string
    terms: string
    redemptionCode?: string
  }
}

export interface UserMemberNotificationPreferences {
  geoOffers: boolean
  newBusinesses: boolean
  secretMenus: boolean
  weeklyDigest: boolean
  sms: boolean
}

export interface UserMember {
  id: string
  user_id: string
  
  // Basic profile information
  name: string | null
  email: string | null
  phone: string | null
  joined_date: string // ISO timestamp
  
  // Location and preferences
  city: UserCity
  preferred_categories: string[]
  dietary_restrictions: string[]
  preferred_radius_miles: number
  
  // Gamification system
  total_points: number
  level: number
  experience_points: number
  tier: UserTier
  
  // User statistics
  stats: UserMemberStats
  
  // Badges system
  badges: UserMemberBadge[]
  
  // Referral system
  referral_code: string
  referred_by: string | null
  
  // Wallet pass system
  wallet_pass_id: string | null
  wallet_pass_assigned_at: string | null // ISO timestamp
  wallet_pass_status: WalletPassStatus
  
  // Notification preferences
  notification_preferences: UserMemberNotificationPreferences
  
  // Profile completion and onboarding
  profile_completion_percentage: number
  onboarding_completed: boolean
  onboarding_completed_at: string | null // ISO timestamp
  
  // Activity tracking
  last_active_at: string // ISO timestamp
  current_streak_days: number
  longest_streak_days: number
  
  // Metadata
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export type PointsTransactionType = 'earned' | 'spent'
export type PointsTransactionReason = 
  | 'business_visit' 
  | 'secret_unlock' 
  | 'offer_redeem' 
  | 'friend_referral'
  | 'review_write' 
  | 'photo_share' 
  | 'chat_engagement' 
  | 'daily_login'
  | 'badge_unlock' 
  | 'streak_bonus' 
  | 'first_visit' 
  | 'social_share'

export type RelatedItemType = 'business' | 'offer' | 'secret_item' | 'badge'

export interface PointsTransaction {
  id: string
  user_id: string
  
  // Transaction details
  type: PointsTransactionType
  amount: number
  reason: PointsTransactionReason
  description: string
  
  // Related item (business, offer, etc.)
  related_item_type: RelatedItemType | null
  related_item_id: string | null
  related_item_name: string | null
  
  // Metadata
  created_at: string // ISO timestamp
}

export interface UserBusinessVisit {
  id: string
  user_id: string
  business_id: string
  
  // Visit details
  visit_date: string // ISO timestamp
  points_earned: number
  is_first_visit: boolean
  
  // Optional data
  review_rating: number | null
  review_text: string | null
  photos_shared: string[]
  
  // Metadata
  created_at: string // ISO timestamp
}

export type OfferClaimStatus = 'claimed' | 'redeemed' | 'expired'

export interface UserOfferClaim {
  id: string
  user_id: string
  business_id: string
  
  // Offer details
  offer_name: string
  offer_type: string
  offer_value: string
  
  // Claim details
  claimed_at: string // ISO timestamp
  redeemed_at: string | null // ISO timestamp
  points_earned: number
  
  // Status
  status: OfferClaimStatus
  
  // Metadata
  created_at: string // ISO timestamp
}

export type UnlockMethod = 'points' | 'visit' | 'social' | 'achievement'

export interface UserSecretUnlock {
  id: string
  user_id: string
  business_id: string
  
  // Secret item details
  secret_item_name: string
  secret_item_description: string | null
  secret_item_price: string | null
  
  // Unlock details
  unlocked_at: string // ISO timestamp
  unlock_method: UnlockMethod
  points_spent: number
  points_earned: number
  
  // Metadata
  created_at: string // ISO timestamp
}

// Database insert/update types
export type UserMemberInsert = Omit<UserMember, 'id' | 'created_at' | 'updated_at'>
export type UserMemberUpdate = Partial<Omit<UserMember, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export type PointsTransactionInsert = Omit<PointsTransaction, 'id' | 'created_at'>
export type UserBusinessVisitInsert = Omit<UserBusinessVisit, 'id' | 'created_at'>
export type UserOfferClaimInsert = Omit<UserOfferClaim, 'id' | 'created_at'>
export type UserSecretUnlockInsert = Omit<UserSecretUnlock, 'id' | 'created_at'>

// Level system
export interface LevelInfo {
  level: number
  name: string
  pointsRequired: number
  pointsToNext: number | null
  benefits: string[]
}

export const USER_LEVEL_SYSTEM = {
  1: { name: 'Newcomer', pointsRequired: 0, benefits: ['Basic features', 'Welcome bonus'] },
  2: { name: 'Explorer', pointsRequired: 500, benefits: ['Unlock common secrets', 'Daily bonus'] },
  3: { name: 'Insider', pointsRequired: 1000, benefits: ['Unlock rare secrets', 'Weekly bonus'] },
  4: { name: 'Local Expert', pointsRequired: 2000, benefits: ['Unlock epic secrets', 'Monthly bonus'] },
  5: { name: 'Legend', pointsRequired: 5000, benefits: ['Unlock legendary secrets', 'VIP status'] }
} as const

export const POINTS_EARNING_RULES = {
  business_visit: 25,
  secret_unlock: 50,
  offer_redeem: 10,
  friend_referral: 500,
  review_write: 15,
  photo_share: 5,
  chat_engagement: 2,
  daily_login: 5,
  badge_unlock: 100,
  streak_bonus: 10,
  first_visit: 50,
  social_share: 10
} as const
