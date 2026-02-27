/**
 * Qwikker Loyalty System V1 -- Type Definitions
 *
 * All interfaces for loyalty programs, memberships, earn events,
 * redemptions, pass requests, and API payloads.
 */

// ─── Database Row Types ─────────────────────────────────────────

export interface LoyaltyProgram {
  id: string
  business_id: string
  public_id: string
  program_name: string | null
  type: 'stamps' | 'points'
  reward_threshold: number
  reward_description: string
  stamp_label: string
  earn_mode: 'per_visit' | 'per_transaction'
  stamp_icon: string
  earn_instructions: string | null
  redeem_instructions: string | null
  primary_color: string | null
  background_color: string | null
  logo_url: string | null
  logo_description: string | null
  strip_image_url: string | null
  strip_image_description: string | null
  terms_and_conditions: string | null
  status: 'draft' | 'submitted' | 'active' | 'paused' | 'ended'
  walletpush_template_id: string | null
  walletpush_api_key: string | null
  walletpush_pass_type_id: string | null
  counter_qr_token: string
  previous_counter_qr_token: string | null
  counter_qr_token_rotated_at: string | null
  timezone: string
  max_earns_per_day: number
  min_gap_minutes: number
  birthday_bonus_enabled: boolean
  birthday_bonus_reward: string | null
  birthday_bonus_valid_days: number
  premium_flags: PremiumFlags
  city: string
  created_at: string
  updated_at: string
}

export interface PremiumFlags {
  push_to_loyalty: boolean
  member_export: boolean
  birthday_rewards: boolean
  bonus_multipliers: boolean
  advanced_earn_rules: boolean
}

export interface LoyaltyMembership {
  id: string
  program_id: string
  user_wallet_pass_id: string
  stamps_balance: number
  points_balance: number
  total_earned: number
  total_redeemed: number
  last_earned_at: string | null
  earned_today_count: number
  earned_today_date: string | null
  joined_at: string
  walletpush_serial: string | null
  status: 'active' | 'inactive'
  last_active_at: string
  birthday_bonus_redeemed_year: number | null
  created_at: string
}

export interface LoyaltyEarnEvent {
  id: string
  membership_id: string
  business_id: string
  user_wallet_pass_id: string
  earned_at: string
  method: 'counter_qr'
  ip_hash: string | null
  geo_hash: string | null
  valid: boolean
  reason_if_invalid: string | null
}

export interface LoyaltyRedemption {
  id: string
  membership_id: string
  business_id: string
  user_wallet_pass_id: string
  reward_description: string
  status: 'consumed' | 'expired_display'
  consumed_at: string
  display_expires_at: string
  stamps_deducted: number
  flagged_at: string | null
  flagged_reason: string | null
  created_at: string
}

export interface LoyaltyPassRequest {
  id: string
  business_id: string
  design_spec_json: DesignSpecJson
  status: 'submitted' | 'issued' | 'rejected'
  request_type: 'new' | 'edit' | 'cancel'
  rejection_reason: string | null
  walletpush_template_id: string | null
  walletpush_api_key: string | null
  walletpush_pass_type_id: string | null
  reviewed_by_admin_id: string | null
  created_at: string
}

// ─── Design Spec (frozen snapshot for admin queue) ──────────────

export interface DesignSpecJson {
  program_name: string
  type: 'stamps' | 'points'
  reward_threshold: number
  reward_description: string
  stamp_label: string
  earn_mode: 'per_visit' | 'per_transaction'
  stamp_icon: string
  earn_instructions: string | null
  redeem_instructions: string | null
  primary_color: string | null
  background_color: string | null
  logo_url: string | null
  logo_description: string | null
  strip_image_url: string | null
  strip_image_description: string | null
  terms_and_conditions: string | null
  timezone: string
  max_earns_per_day: number
  min_gap_minutes: number
  business_name: string
  business_city: string
}

// ─── API Payload Types ──────────────────────────────────────────

export interface EarnResult {
  success: boolean
  newBalance: number
  threshold: number
  rewardUnlocked: boolean
  proximityMessage: string | null
  nextEligibleAt: string | null
  error?: string
  reason?: string
}

export interface EarnConstraints {
  allowed: boolean
  reason?: string
  nextEligibleAt?: string
}

export interface ConsumeResult {
  redemptionId: string
  rewardDescription: string
  consumedAt: string
  displayExpiresAt: string
  newBalance: number
  threshold: number
}

export interface RedemptionStatus {
  id: string
  status: 'consumed' | 'expired_display'
  rewardDescription: string
  consumedAt: string
  displayExpiresAt: string
  timeRemainingMs: number
  isActive: boolean
}

export interface MemberListItem {
  id: string
  user_wallet_pass_id: string
  display_name: string
  joined_at: string
  last_active_at: string
  total_earned: number
  stamps_balance: number
  total_redeemed: number
  status: 'active' | 'inactive'
}

export interface BusinessLoyaltySummary {
  activeMembers: number
  visitsThisMonth: number
  rewardsRedeemedThisMonth: number
  estimatedValueGivenAway: number
  avgVisitsPerMember: number
  membersNearReward: number
  flaggedRedemptions: number
}

// ─── Form / UI Types ────────────────────────────────────────────

export interface LoyaltyProgramFormData {
  program_name: string
  type: 'stamps' | 'points'
  reward_threshold: number
  reward_description: string
  stamp_label: string
  earn_mode: 'per_visit' | 'per_transaction'
  stamp_icon: string
  earn_instructions: string
  redeem_instructions: string
  primary_color: string
  background_color: string
  logo_url: string
  logo_description: string
  strip_image_url: string
  strip_image_description: string
  terms_and_conditions: string
  timezone: string
  max_earns_per_day: number
  min_gap_minutes: number
}

/** Enriched membership with program details (for user rewards page) */
export interface UserMembershipWithProgram extends LoyaltyMembership {
  program: Pick<
    LoyaltyProgram,
    | 'public_id'
    | 'program_name'
    | 'type'
    | 'reward_threshold'
    | 'reward_description'
    | 'stamp_label'
    | 'stamp_icon'
    | 'status'
    | 'primary_color'
    | 'walletpush_template_id'
  > & {
    business: {
      business_name: string
      slug: string
      logo: string | null
    }
  }
}

/** WalletPush credential check -- all three must be non-null to issue passes */
export interface WalletPushCredentials {
  walletpush_template_id: string
  walletpush_api_key: string
  walletpush_pass_type_id: string
}

export function hasWalletPushCredentials(
  program: Pick<LoyaltyProgram, 'walletpush_template_id' | 'walletpush_api_key' | 'walletpush_pass_type_id'>
): program is LoyaltyProgram & WalletPushCredentials {
  return !!(
    program.walletpush_template_id &&
    program.walletpush_api_key &&
    program.walletpush_pass_type_id
  )
}
