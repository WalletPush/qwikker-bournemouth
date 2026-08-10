/**
 * Client helpers for Save → Redeem offer flow.
 * Shared by Offers page, Chat, and Business detail.
 */

export interface SaveOfferParams {
  walletPassId: string
  offerId: string
  source?: 'offers' | 'chat' | 'business' | 'auto'
}

export interface ActivateOfferParams {
  walletPassId: string
  offerId: string
  source?: 'offers' | 'chat' | 'business' | 'auto'
  confirmReplace?: boolean
}

export interface ActivateOfferSuccess {
  success: true
  activeUntil: string
  windowMinutes: number
  walletSynced: boolean
  message?: string
  activation?: {
    active_until?: string
    activation_window_minutes?: number
  }
}

export interface ActivateNeedsReplace {
  success: false
  needsReplace: true
  active: {
    business_name?: string
    minutes_left?: number
  }
}

export interface ActivateOfferFailure {
  success: false
  needsReplace?: false
  error: string
}

export type ActivateOfferResult =
  | ActivateOfferSuccess
  | ActivateNeedsReplace
  | ActivateOfferFailure

export interface PendingRedeemAction {
  kind: 'confirm_redeem'
  offerId: string
  offerName: string
  businessName: string
  windowMins: number
  expiresAt: number
}

const PENDING_REDEEM_TTL_MS = 2 * 60 * 1000

export function createPendingRedeem(params: {
  offerId: string
  offerName: string
  businessName: string
  windowMins?: number
}): PendingRedeemAction {
  return {
    kind: 'confirm_redeem',
    offerId: params.offerId,
    offerName: params.offerName,
    businessName: params.businessName,
    windowMins: params.windowMins ?? 60,
    expiresAt: Date.now() + PENDING_REDEEM_TTL_MS,
  }
}

export function isPendingRedeemValid(
  pending: PendingRedeemAction | null | undefined
): pending is PendingRedeemAction {
  return !!pending && pending.kind === 'confirm_redeem' && pending.expiresAt > Date.now()
}

/** Typed yes/ok only confirms when a bound pending redeem exists. */
export function isRedeemConfirmPhrase(text: string): boolean {
  const t = text.trim().toLowerCase()
  return /^(yes|yeah|yep|ok|okay|sure|confirm|redeem|do it|go ahead)[\s!.]*$/i.test(t)
}

export async function saveOffer(params: SaveOfferParams): Promise<{ success: boolean; error?: string }> {
  const res = await fetch('/api/offers/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletPassId: params.walletPassId,
      offerId: params.offerId,
      source: params.source || 'offers',
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.success) {
    return { success: false, error: body.error || 'Failed to save offer' }
  }
  return { success: true }
}

export async function activateOffer(params: ActivateOfferParams): Promise<ActivateOfferResult> {
  const res = await fetch('/api/offers/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletPassId: params.walletPassId,
      offerId: params.offerId,
      source: params.source || 'offers',
      confirmReplace: params.confirmReplace === true,
    }),
  })
  const body = await res.json().catch(() => ({}))

  if (body.error === 'needs_replace_confirm' && body.active) {
    return {
      success: false,
      needsReplace: true,
      active: body.active,
    }
  }

  if (!res.ok || !body.success) {
    return {
      success: false,
      error: body.error || 'Failed to activate offer',
    }
  }

  const windowMinutes =
    body.activation?.activation_window_minutes ||
    60
  const activeUntil =
    body.activation?.active_until ||
    new Date(Date.now() + windowMinutes * 60 * 1000).toISOString()

  return {
    success: true,
    activeUntil,
    windowMinutes,
    walletSynced: body.walletSynced !== false,
    message: body.message,
    activation: body.activation,
  }
}

export function redeemWarningCopy(offerName: string, windowMins: number): string {
  return `Only about **${windowMins} minutes** on your Wallet for **${offerName}**. Ready to show staff?`
}

export function redeemWorkingCopy(offerName: string, windowMins: number): string {
  return `OK — adding **${offerName}** to your Wallet now. You’ll have about **${windowMins} minutes** to show staff.`
}

export function redeemSuccessCopy(offerName: string): string {
  return `**${offerName}** is on your Wallet now. Open your pass and show staff before it clears.`
}

export function saveSuccessCopy(offerName: string): string {
  return `Saved **${offerName}**. Redeem when you’re at the venue.`
}

export function markOfferSavedLocally(walletPassId: string, offerId: string): void {
  if (typeof window === 'undefined' || !walletPassId) return
  try {
    const key = `qwikker-claimed-${walletPassId}`
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as string[]
    if (!existing.includes(offerId)) {
      localStorage.setItem(key, JSON.stringify([...existing, offerId]))
    }
    try {
      const { getBadgeTracker } = require('@/lib/utils/simple-badge-tracker')
      getBadgeTracker(walletPassId).trackAction('offer_claimed')
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}
