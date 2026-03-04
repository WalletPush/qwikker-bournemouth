/**
 * WalletPush API Configuration
 * 
 * Centralized config for the WalletPush External API.
 * Base URL and auth format live here so changes propagate everywhere.
 */

const DEFAULT_WALLETPUSH_BASE_URL = 'https://loyalty.qwikker.com/api/external/v1'

/**
 * Resolves the WalletPush API base URL.
 * Priority: dashboardUrl param -> WALLETPUSH_BASE_URL env var -> hardcoded default.
 * When a dashboard URL is provided (e.g. "https://loyalty-bali.qwikker.com"),
 * it appends "/api/external/v1" to form the API base.
 */
export function getWalletPushBaseUrl(dashboardUrl?: string): string {
  if (dashboardUrl) {
    const cleaned = dashboardUrl.replace(/\/+$/, '')
    return `${cleaned}/api/external/v1`
  }
  return process.env.WALLETPUSH_BASE_URL || DEFAULT_WALLETPUSH_BASE_URL
}

export function getWalletPushAuthHeader(apiKey: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

export function getWalletPushCreateUrl(templateId: string, dashboardUrl?: string): string {
  return `${getWalletPushBaseUrl(dashboardUrl)}/templates/${templateId}/pass`
}

export function getWalletPushFieldUrl(passTypeId: string, serialNumber: string, fieldName: string, dashboardUrl?: string): string {
  return `${getWalletPushBaseUrl(dashboardUrl)}/passes/${passTypeId}/${serialNumber}/values/${fieldName}`
}

export function getWalletPushAnalyticsUrl(templateId: string, dashboardUrl?: string): string {
  return `${getWalletPushBaseUrl(dashboardUrl)}/templates/${templateId}/analytics`
}

export function getWalletPushActivityUrl(templateId: string, dashboardUrl?: string): string {
  return `${getWalletPushBaseUrl(dashboardUrl)}/templates/${templateId}/activity`
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
} as const

export type WalletPassFieldName = typeof WALLET_PASS_FIELDS[keyof typeof WALLET_PASS_FIELDS]
