/**
 * WalletPush Pass Template Field Names
 * 
 * Centralized configuration for wallet pass field names.
 * These must match the field names defined in your WalletPush pass template.
 */

export const WALLET_PASS_FIELDS = {
  /**
   * Front of pass field - displays current active offer
   * Updates pass content but also triggers push notification when changed
   */
  CURRENT_OFFER: 'Current_Offer',
  
  /**
   * Back of pass field - shows last message/notification
   * Updates back field and triggers push notification
   * This is the field used for business broadcast notifications
   */
  LAST_MESSAGE: 'Last_Message',
} as const

export type WalletPassFieldName = typeof WALLET_PASS_FIELDS[keyof typeof WALLET_PASS_FIELDS]
