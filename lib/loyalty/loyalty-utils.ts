/**
 * Qwikker Loyalty System V1 -- Utility Functions
 *
 * Validation, cooldown logic, token checks, display helpers,
 * STAMP_ICONS map, and WalletPush field value composition.
 */

import { createHash } from 'crypto'
import { generateShortCode } from '@/lib/utils/short-code'
import type { LoyaltyProgram, LoyaltyMembership, EarnConstraints } from './loyalty-types'

// ─── Constants ──────────────────────────────────────────────────

/** Display window for the live redemption screen (milliseconds) */
export const REDEMPTION_DISPLAY_WINDOW_MS = 10 * 60 * 1000

/** Grace window for previous QR token after rotation (milliseconds) */
export const TOKEN_GRACE_WINDOW_MS = 30 * 60 * 1000

/** Default average reward value for estimated cost calculations */
export const DEFAULT_AVG_REWARD_VALUE = 3.0

/** Rate limits */
export const EARN_RATE_LIMIT_PER_USER_PER_HOUR = 10
export const EARN_RATE_LIMIT_PER_IP_PER_HOUR = 20
export const IP_VELOCITY_THRESHOLD = 3
export const IP_VELOCITY_WINDOW_MINUTES = 10
export const CONSUME_RATE_LIMIT_MINUTES = 5

// ─── Stamp Icons ────────────────────────────────────────────────

export const STAMP_ICONS = {
  stamp:    { icon: 'Stamp',     label: 'Stamp' },
  bean:     { icon: 'Bean',       label: 'Coffee Bean' },
  scissors: { icon: 'Scissors',  label: 'Scissors' },
  flame:    { icon: 'Flame',     label: 'Flame' },
  burger:   { icon: 'Hamburger', label: 'Burger' },
  cocktail: { icon: 'Wine',      label: 'Cocktail' },
  pizza:    { icon: 'Pizza',     label: 'Pizza' },
  star:     { icon: 'Star',      label: 'Star' },
  heart:    { icon: 'Heart',     label: 'Heart' },
  cake:     { icon: 'CakeSlice', label: 'Cake' },
  dumbbell: { icon: 'Dumbbell',  label: 'Dumbbell' },
  paw:      { icon: 'PawPrint',  label: 'Paw' },
} as const

export type StampIconKey = keyof typeof STAMP_ICONS

export function isValidStampIcon(key: string): key is StampIconKey {
  return key in STAMP_ICONS
}

// ─── ID / Token Generation ──────────────────────────────────────

export function generatePublicId(): string {
  return generateShortCode(10)
}

export function generateCounterQrToken(): string {
  return generateShortCode(32)
}

// ─── Hashing ────────────────────────────────────────────────────

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex')
}

// ─── Timezone Helpers ───────────────────────────────────────────

/**
 * Get today's date string (YYYY-MM-DD) in the given IANA timezone.
 * Uses Intl.DateTimeFormat -- no external timezone library needed.
 */
export function getTodayInTimezone(tz: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

/**
 * Returns an ISO string for the next midnight in the given timezone.
 * Works by reading the current hours/minutes in that TZ and computing
 * how many ms remain until 00:00.
 */
function getMidnightInTimezone(tz: string): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
  const s = Number(parts.find(p => p.type === 'second')?.value ?? 0)

  const secsUntilMidnight = (24 * 3600) - (h * 3600 + m * 60 + s)
  return new Date(now.getTime() + secsUntilMidnight * 1000).toISOString()
}

// ─── Cooldown / Earn Eligibility ────────────────────────────────

/**
 * Check whether a user can earn right now, given the program rules
 * and the membership's daily counters.
 *
 * Handles timezone-aware daily reset: if `earned_today_date` is
 * before today (in program timezone), the daily counter resets.
 */
export function canEarnNow(
  membership: Pick<LoyaltyMembership, 'earned_today_count' | 'earned_today_date' | 'last_earned_at'>,
  program: Pick<LoyaltyProgram, 'max_earns_per_day' | 'min_gap_minutes' | 'timezone'>
): EarnConstraints {
  const todayStr = getTodayInTimezone(program.timezone)
  const isNewDay = membership.earned_today_date !== todayStr

  const effectiveTodayCount = isNewDay ? 0 : membership.earned_today_count

  if (effectiveTodayCount >= program.max_earns_per_day) {
    // Approximate midnight in the program's timezone by getting
    // the current local time there and computing time until 00:00
    const nextEligibleAt = getMidnightInTimezone(program.timezone)

    return {
      allowed: false,
      reason: `You've reached your daily limit of ${program.max_earns_per_day} ${program.max_earns_per_day === 1 ? 'stamp' : 'stamps'} for today.`,
      nextEligibleAt,
    }
  }

  if (membership.last_earned_at && program.min_gap_minutes > 0) {
    const lastEarned = new Date(membership.last_earned_at)
    const minGapMs = program.min_gap_minutes * 60 * 1000
    const nextEligible = new Date(lastEarned.getTime() + minGapMs)
    const now = new Date()

    if (now < nextEligible) {
      return {
        allowed: false,
        reason: `Too soon since your last stamp. Try again in a few minutes.`,
        nextEligibleAt: nextEligible.toISOString(),
      }
    }
  }

  return { allowed: true }
}

// ─── Token Validation ───────────────────────────────────────────

/**
 * Check whether a provided QR token matches the program's current
 * or previous token (within the 30-minute grace window).
 */
export function isTokenValid(
  program: Pick<LoyaltyProgram, 'counter_qr_token' | 'previous_counter_qr_token' | 'counter_qr_token_rotated_at'>,
  providedToken: string
): boolean {
  if (program.counter_qr_token === providedToken) {
    return true
  }

  if (
    program.previous_counter_qr_token === providedToken &&
    program.counter_qr_token_rotated_at
  ) {
    const rotatedAt = new Date(program.counter_qr_token_rotated_at)
    const graceEnd = new Date(rotatedAt.getTime() + TOKEN_GRACE_WINDOW_MS)
    if (new Date() <= graceEnd) {
      return true
    }
  }

  return false
}

// ─── Display / Progress Helpers ─────────────────────────────────

export function calculateProgress(balance: number, threshold: number): number {
  if (threshold <= 0) return 0
  return Math.min(Math.round((balance / threshold) * 100), 100)
}

/**
 * Motivational copy based on how close a user is to their reward.
 * Returns null if not close enough to warrant a message.
 */
export function getProximityMessage(balance: number, threshold: number): string | null {
  const remaining = threshold - balance
  if (remaining <= 0) return 'Reward available!'
  if (remaining === 1) return 'Just 1 more visit!'
  if (remaining === 2) return 'Only 2 more to go!'
  if (remaining === 3) return 'Almost there — 3 more!'
  if (balance >= threshold / 2) return "You're over halfway!"
  return null
}

export function getDisplayExpiresAt(): string {
  return new Date(Date.now() + REDEMPTION_DISPLAY_WINDOW_MS).toISOString()
}

export function isDisplayWindowActive(expiresAt: string): boolean {
  return new Date(expiresAt) > new Date()
}

export function getTimeRemainingMs(expiresAt: string): number {
  return Math.max(0, new Date(expiresAt).getTime() - Date.now())
}

// ─── Cloudinary Asset Helpers ───────────────────────────────────

export function getLoyaltyAssetFolder(
  city: string,
  programId: string,
  assetType: 'logo' | 'strip'
): string {
  return `qwikker/${city}/loyalty/${programId}/${assetType}`
}

export function validateCloudinaryUrl(url: string, expectedFolder?: string): boolean {
  if (!url.startsWith('https://res.cloudinary.com/')) return false
  if (expectedFolder && !url.includes(expectedFolder)) return false
  return true
}

// ─── Return-To Validation ───────────────────────────────────────

/**
 * Validate a returnTo path for post-install redirect safety.
 * Must be a same-origin relative path starting with /loyalty/ or /user/.
 */
export function validateReturnTo(returnTo: string | undefined | null): string | null {
  if (!returnTo) return null
  if (typeof returnTo !== 'string') return null

  const trimmed = returnTo.trim()

  if (trimmed.includes('//')) return null
  if (trimmed.includes('..')) return null
  if (trimmed.includes(':')) return null

  if (!trimmed.startsWith('/loyalty/') && !trimmed.startsWith('/user/')) return null

  return trimmed
}

// ─── WalletPush Field Value Composition ─────────────────────────

/**
 * Build the field name -> value map for WalletPush pass updates.
 *
 * Always uses "Points" as the WalletPush field name.
 * The "Status" string uses program.stamp_label for display
 * (e.g., "7/10 Stamps" or "350/500 Points").
 */
export function getLoyaltyPassFieldValues(
  program: Pick<LoyaltyProgram, 'reward_threshold' | 'reward_description' | 'stamp_label'>,
  membership: Pick<LoyaltyMembership, 'stamps_balance' | 'points_balance'>,
  programType: 'stamps' | 'points' = 'stamps'
): Record<string, string> {
  const balance = programType === 'stamps'
    ? membership.stamps_balance
    : membership.points_balance

  return {
    Points: String(balance),
    Threshold: String(program.reward_threshold),
    Status: `${balance}/${program.reward_threshold} ${program.stamp_label}`,
    Reward: program.reward_description,
  }
}

/**
 * Transforms a Cloudinary URL to auto-crop to the Apple Wallet strip
 * aspect ratio (1125x432 ≈ 2.6:1) using smart gravity.
 * Returns the original URL unchanged if it's not a Cloudinary URL.
 */
export function applyCloudinaryStripCrop(url: string): string {
  if (!url || !url.includes('cloudinary.com')) return url
  const transformation = 'c_fill,ar_2.6,g_auto,w_1125,h_432'
  return url.replace('/upload/', `/upload/${transformation}/`)
}
