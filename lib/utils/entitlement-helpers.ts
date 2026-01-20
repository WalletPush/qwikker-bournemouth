/**
 * ENTITLEMENT STATE COMPUTATION - SINGLE SOURCE OF TRUTH
 * 
 * This is a PURE function with NO side effects.
 * All UI logic should use this instead of inline business.plan checks.
 * 
 * DO NOT use business.plan or trial_days_remaining anywhere in this file.
 */

export type EntitlementState = 
  | 'UNCLAIMED'
  | 'NO_SUB'
  | 'TRIAL_ACTIVE'
  | 'TRIAL_EXPIRED'
  | 'PAID_ACTIVE'
  | 'PAID_LAPSED'
  | 'SUB_OTHER'

export interface EntitlementInput {
  owner_user_id?: string | null
  status?: string | null
  subscription?: {
    is_in_free_trial?: boolean
    free_trial_end_date?: string | null
    status?: string | null
    current_period_end?: string | null
    tier_name?: string | null
    tier_display_name?: string | null
  } | null
}

export interface EntitlementResult {
  // Primary state
  state: EntitlementState
  
  // Boolean helpers for UI
  isClaimed: boolean
  isUnclaimed: boolean
  isTrialActive: boolean
  isTrialExpired: boolean
  isPaidActive: boolean
  
  // Tier info (NULL if no active tier)
  tierNameOrNull: string | null
  
  // UI helpers
  shouldLockControls: boolean
  shouldShowToUsers: boolean
  displayLabel: string
  displayColor: string
}

/**
 * Compute canonical entitlement state from business + subscription data.
 * 
 * @param business - Business profile data
 * @param latestSub - Latest subscription (optional, can be null/undefined)
 * @returns Entitlement state with all computed flags
 */
export function computeEntitlementState(
  business: EntitlementInput,
  latestSub?: EntitlementInput['subscription']
): EntitlementResult {
  
  // Use provided subscription or fall back to business.subscription
  const sub = latestSub !== undefined ? latestSub : business.subscription
  
  const now = new Date()
  
  // ========================================
  // 1. UNCLAIMED (highest priority)
  // ========================================
  if (!business.owner_user_id && (business.status === 'unclaimed' || business.status === 'pending_claim')) {
    return {
      state: 'UNCLAIMED',
      isClaimed: false,
      isUnclaimed: true,
      isTrialActive: false,
      isTrialExpired: false,
      isPaidActive: false,
      tierNameOrNull: null,
      shouldLockControls: true,
      shouldShowToUsers: false, // Visible in discover but not interactive
      displayLabel: 'Unclaimed',
      displayColor: 'text-slate-400'
    }
  }
  
  // ========================================
  // 2. NO SUBSCRIPTION (claimed but no sub row)
  // ========================================
  if (!sub) {
    return {
      state: 'NO_SUB',
      isClaimed: true,
      isUnclaimed: false,
      isTrialActive: false,
      isTrialExpired: false,
      isPaidActive: false,
      tierNameOrNull: null,
      shouldLockControls: false,
      shouldShowToUsers: true,
      displayLabel: 'Free Listing',
      displayColor: 'text-emerald-400'
    }
  }
  
  // ========================================
  // 3. TRIAL (active or expired)
  // ========================================
  if (sub.is_in_free_trial && sub.free_trial_end_date) {
    const endDate = new Date(sub.free_trial_end_date)
    
    if (endDate >= now) {
      // TRIAL ACTIVE
      return {
        state: 'TRIAL_ACTIVE',
        isClaimed: true,
        isUnclaimed: false,
        isTrialActive: true,
        isTrialExpired: false,
        isPaidActive: false,
        tierNameOrNull: sub.tier_display_name || sub.tier_name || 'Featured',
        shouldLockControls: false,
        shouldShowToUsers: true,
        displayLabel: 'Free Trial',
        displayColor: 'text-blue-400'
      }
    } else {
      // TRIAL EXPIRED
      return {
        state: 'TRIAL_EXPIRED',
        isClaimed: true,
        isUnclaimed: false,
        isTrialActive: false,
        isTrialExpired: true,
        isPaidActive: false,
        tierNameOrNull: null, // NO ACTIVE TIER
        shouldLockControls: false, // NOT locked like unclaimed!
        shouldShowToUsers: false, // MUST NOT show to users
        displayLabel: 'N/A',
        displayColor: 'text-red-400'
      }
    }
  }
  
  // ========================================
  // 4. PAID SUBSCRIPTION (active)
  // ========================================
  if (sub.status === 'active') {
    // Check if subscription period is still valid
    const isPeriodValid = !sub.current_period_end || new Date(sub.current_period_end) >= now
    
    if (isPeriodValid) {
      return {
        state: 'PAID_ACTIVE',
        isClaimed: true,
        isUnclaimed: false,
        isTrialActive: false,
        isTrialExpired: false,
        isPaidActive: true,
        tierNameOrNull: sub.tier_display_name || sub.tier_name || null,
        shouldLockControls: false,
        shouldShowToUsers: true,
        displayLabel: sub.tier_display_name || sub.tier_name || 'Paid',
        displayColor: 'text-green-400'
      }
    }
  }
  
  // ========================================
  // 5. PAID LAPSED (paused/canceled)
  // ========================================
  if (sub.status === 'paused' || sub.status === 'canceled') {
    return {
      state: 'PAID_LAPSED',
      isClaimed: true,
      isUnclaimed: false,
      isTrialActive: false,
      isTrialExpired: false,
      isPaidActive: false,
      tierNameOrNull: null,
      shouldLockControls: false,
      shouldShowToUsers: false,
      displayLabel: 'Paused',
      displayColor: 'text-orange-400'
    }
  }
  
  // ========================================
  // 6. FALLBACK (subscription exists but unknown state)
  // ========================================
  return {
    state: 'SUB_OTHER',
    isClaimed: true,
    isUnclaimed: false,
    isTrialActive: false,
    isTrialExpired: false,
    isPaidActive: false,
    tierNameOrNull: null,
    shouldLockControls: false,
    shouldShowToUsers: false,
    displayLabel: 'Unknown',
    displayColor: 'text-slate-400'
  }
}
