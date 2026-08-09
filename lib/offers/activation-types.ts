export type OfferActivationSource = 'offers' | 'chat' | 'business' | 'auto' | 'legacy_claim'

export type OfferActivationStatus = 'active' | 'ended'

export type WalletSyncStatus =
  | 'pending'
  | 'synced'
  | 'failed'
  | 'clear_pending'
  | 'cleared'
  | 'clear_failed'

export interface OfferActivation {
  id: string
  wallet_pass_id: string
  offer_id: string
  business_id: string
  activated_at: string
  active_until: string
  warning_sent_at: string | null
  completed_at: string | null
  status: OfferActivationStatus
  source: OfferActivationSource
  wallet_sync_status: WalletSyncStatus
  wallet_sync_attempts: number
  wallet_sync_last_error: string | null
  replaced_activation_id: string | null
  activation_window_minutes?: number
}

export interface SavedOffer {
  id: string
  wallet_pass_id: string
  offer_id: string
  business_id: string
  saved_at: string
  removed_at: string | null
  source: OfferActivationSource
}

export interface ActiveOfferSummary {
  activation_id: string
  offer_id: string
  offer_name: string
  business_name: string
  active_until: string
  minutes_left: number
}

export interface ActivateOfferResult {
  success: boolean
  error?: string
  activation?: OfferActivation
  offer?: {
    offer_name: string
    business_name: string
    business_id: string
    city?: string | null
  }
  active?: ActiveOfferSummary
  walletSynced?: boolean
  walletError?: string
  message?: string
}

export const ACTIVATION_WINDOW_OPTIONS = [30, 60, 120] as const
export type ActivationWindowMinutes = (typeof ACTIVATION_WINDOW_OPTIONS)[number]
