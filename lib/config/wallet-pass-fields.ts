/**
 * WalletPush API Configuration
 * 
 * Centralized config for the WalletPush External API.
 * Base URL and auth format live here so changes propagate everywhere.
 */

const WALLETPUSH_BASE_URL = 'https://loyalty.qwikker.com/api/external/v1'

export function getWalletPushBaseUrl(): string {
  return process.env.WALLETPUSH_BASE_URL || WALLETPUSH_BASE_URL
}

export function getWalletPushAuthHeader(apiKey: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

export function getWalletPushCreateUrl(templateId: string): string {
  return `${getWalletPushBaseUrl()}/templates/${templateId}/pass`
}

export function getWalletPushFieldUrl(passTypeId: string, serialNumber: string, fieldName: string): string {
  return `${getWalletPushBaseUrl()}/passes/${passTypeId}/${serialNumber}/values/${fieldName}`
}

export function getWalletPushAnalyticsUrl(templateId: string): string {
  return `${getWalletPushBaseUrl()}/templates/${templateId}/analytics`
}

export function getWalletPushActivityUrl(templateId: string): string {
  return `${getWalletPushBaseUrl()}/templates/${templateId}/activity`
}

/**
 * WalletPush Pass Template Field Names
 * 
 * These must match the placeholder names defined in your WalletPush pass template.
 */
export const WALLET_PASS_FIELDS = {
  CURRENT_OFFER: 'Current_Offer',
  LAST_MESSAGE: 'Last_Message',
  OFFERS_URL: 'Offers_Url',
  AI_URL: 'AI_Url',
  DASHBOARD_URL: 'Dashboard_Url',
} as const

export type WalletPassFieldName = typeof WALLET_PASS_FIELDS[keyof typeof WALLET_PASS_FIELDS]
