/**
 * Qwikker Loyalty System V1 -- WalletPush Integration
 *
 * Two helper functions for issuing loyalty passes and updating
 * pass fields via WalletPush's existing generic External API.
 *
 * - issueLoyaltyPass(): POST /templates/{id}/pass
 * - updateLoyaltyPassField(): PUT /passes/{type}/{serial}/values/{field}
 *
 * Both are fire-and-forget: they log errors but never throw.
 * Callers must check hasWalletPushCredentials() before calling.
 *
 * Dependencies:
 * - WalletPush commits c23afb2 and f6cd1b3 must be deployed
 *   (fixes for injectDynamicValues sync on POST and PUT).
 */

import {
  getWalletPushBaseUrl,
  getWalletPushAuthHeader,
  getWalletPushCreateUrl,
  getWalletPushFieldUrl,
} from '@/lib/config/wallet-pass-fields'

interface IssueLoyaltyPassResult {
  serial: string
  appleUrl?: string
  googleUrl?: string
}

/**
 * Issue a new loyalty pass for a user via WalletPush.
 *
 * Uses the program's per-template credentials to create a pass
 * with the user's details and initial field values (Points,
 * Threshold, Status, Reward).
 *
 * Returns the serial number and download URLs, or null on failure.
 */
export async function issueLoyaltyPass(
  program: { walletpush_template_id: string; walletpush_api_key: string },
  memberData: { firstName: string; lastName: string; email: string },
  initialFields: Record<string, string>
): Promise<IssueLoyaltyPassResult | null> {
  try {
    const url = getWalletPushCreateUrl(program.walletpush_template_id)
    const headers = getWalletPushAuthHeader(program.walletpush_api_key)

    // Field names must exactly match template placeholders.
    const body = {
      ...initialFields,
      First_Name: memberData.firstName,
      Last_Name: memberData.lastName,
      Email: memberData.email,
    }

    console.log('[WalletPush] issueLoyaltyPass request:', {
      url,
      templateId: program.walletpush_template_id,
      fields: Object.keys(body),
    })

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => 'no body')
      console.error(
        `[WalletPush] issueLoyaltyPass failed: ${response.status} ${response.statusText}`,
        { templateId: program.walletpush_template_id, email: memberData.email, body: text }
      )
      return null
    }

    const data = await response.json()

    const serial = data.serialNumber || data.serial || data.id
    const rawAppleUrl = data.appleUrl || data.apple_url || data.apple?.downloadUrl || ''
    // Transform /api/pass-install/{serial} (web page) → /api/apple-pass/{serial}/download (direct .pkpass)
    const appleUrl = rawAppleUrl.includes('/api/pass-install/')
      ? rawAppleUrl.replace('/api/pass-install/', '/api/apple-pass/') + '/download'
      : rawAppleUrl

    console.log('[WalletPush] issueLoyaltyPass response:', {
      serial,
      appleUrl,
      rawAppleUrl,
      hasGoogle: !!(data.googleUrl || data.google_url || data.google?.saveUrl),
    })

    return {
      serial,
      appleUrl: appleUrl || undefined,
      googleUrl: data.googleUrl || data.google_url || data.google?.saveUrl,
    }
  } catch (error) {
    console.error('[WalletPush] issueLoyaltyPass error:', error)
    return null
  }
}

/**
 * Update a single field on an existing loyalty pass.
 *
 * Fire-and-forget -- logs errors but does not throw.
 * Only set push=true on the LAST field update in a batch
 * to avoid duplicate APNs pushes.
 */
export async function updateLoyaltyPassField(
  program: { walletpush_api_key: string; walletpush_pass_type_id: string },
  serial: string,
  fieldName: string,
  value: string,
  push: boolean = false
): Promise<boolean> {
  try {
    const url = getWalletPushFieldUrl(program.walletpush_pass_type_id, serial, fieldName)
    const headers = getWalletPushAuthHeader(program.walletpush_api_key)

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ value, push }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => 'no body')
      console.error(
        `[WalletPush] updateField failed: ${response.status} for ${fieldName}`,
        { serial, value, push, body: text }
      )
      return false
    }

    return true
  } catch (error) {
    console.error(`[WalletPush] updateField error for ${fieldName}:`, error)
    return false
  }
}
