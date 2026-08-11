import { createServiceRoleClient } from '@/lib/supabase/server'
import { getWalletPushCredentials } from '@/lib/utils/franchise-config'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import {
  getWalletPushFieldUrl,
  getWalletPushAuthHeader,
  WALLET_PASS_FIELDS,
} from '@/lib/config/wallet-pass-fields'

export interface UpdateMainPassOfferInput {
  userWalletPassId: string
  currentOffer?: string
  clearOffer?: boolean
  lastMessageOnly?: boolean
  lastMessageOverride?: string
  offerDetails?: {
    businessName?: string
    activationWindowMinutes?: number
    activeUntil?: string
  }
}

export interface UpdateMainPassOfferResult {
  success: boolean
  error?: string
  status?: number
  currentOffer?: string
  pushMessage?: string
  expiryTime?: string
}

function truncateAtWord(input: string, maxLen: number): string {
  const clean = (input || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLen) return clean
  const cut = clean.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut
  return trimmed.replace(/[\s,&+\-–—]+$/, '') + '…'
}

function extractHeadline(input: string): string {
  const clean = (input || '').replace(/\s+/g, ' ').trim()
  const beforeParen = clean.split('(')[0].replace(/[\s,&+\-–—]+$/, '').trim()
  return beforeParen.length >= 3 ? beforeParen : clean
}

/** Format expiry in the franchise city timezone (not hardcoded London). */
function formatExpiry(expiryTime: Date, timeZone: string): string {
  const tz = timeZone || 'Europe/London'
  return (
    expiryTime.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: tz,
    }) +
    ' ' +
    expiryTime.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz,
    })
  )
}

/** Push Current_Offer / Last_Message (or clear / warning-only) via WalletPush. */
export async function updateMainPassOffer(
  input: UpdateMainPassOfferInput
): Promise<UpdateMainPassOfferResult> {
  const userWalletPassId = input.userWalletPassId
  if (!userWalletPassId) {
    return { success: false, error: 'Missing userWalletPassId', status: 400 }
  }
  if (
    userWalletPassId === 'guest' ||
    userWalletPassId === 'test' ||
    userWalletPassId.length < 10
  ) {
    return { success: false, error: 'Invalid wallet pass ID', status: 400 }
  }

  const supabase = createServiceRoleClient()
  const { data: user, error: userError } = await supabase
    .from('app_users')
    .select('city, email, name, first_name, last_name, pass_type_identifier')
    .eq('wallet_pass_id', userWalletPassId)
    .single()

  if (userError || !user) {
    return { success: false, error: 'Wallet pass not found', status: 404 }
  }
  if (!user.email || user.email.length < 5) {
    return { success: false, error: 'Invalid wallet pass', status: 403 }
  }

  const firstName = user.first_name || user.name?.split(' ')[0] || 'User'
  const passTypeId = user.pass_type_identifier || 'pass.come.globalwalletpush'
  const serialNumber = userWalletPassId

  let userCity = user.city
  if (!userCity) {
    try {
      userCity = await getSafeCurrentCity()
    } catch {
      return { success: false, error: 'Unable to determine franchise city', status: 400 }
    }
  }

  const credentials = await getWalletPushCredentials(userCity)
  const appKey = credentials.apiKey
  const walletpushDashboardUrl = credentials.dashboardUrl
  if (!appKey) {
    return { success: false, error: 'WalletPush credentials not configured', status: 500 }
  }

  const windowMinutes = input.offerDetails?.activationWindowMinutes
  const activeUntil = input.offerDetails?.activeUntil
    ? new Date(input.offerDetails.activeUntil)
    : new Date(
        Date.now() +
          (typeof windowMinutes === 'number' && windowMinutes > 0
            ? windowMinutes
            : 12 * 60) *
            60 *
            1000
      )
  // City timezone from franchise config (Zanzibar → Africa/Dar_es_Salaam = EAT)
  const expiryFormatted = formatExpiry(activeUntil, credentials.timezone)

  const businessName = input.offerDetails?.businessName || 'Business'
  const offerName = input.currentOffer || 'Offer'
  const headline = extractHeadline(offerName)
  const shortOffer = truncateAtWord(headline, 50)
  const shortBusiness = truncateAtWord(businessName, 34)
  const passDisplayText = input.clearOffer ? '' : `${shortOffer} @ ${shortBusiness}`

  const authHeaders = getWalletPushAuthHeader(appKey)

  let pushMessage: string
  if (input.lastMessageOverride) {
    pushMessage = input.lastMessageOverride
  } else if (input.clearOffer) {
    // Silent clear — empty Last_Message with no scare copy
    pushMessage = ''
  } else {
    const mins =
      typeof windowMinutes === 'number' && windowMinutes > 0 ? windowMinutes : 60
    pushMessage = `${firstName}, "${headline}" at ${shortBusiness} is active on your pass. Show staff before ${expiryFormatted} (~${mins} min).`
  }

  const messageUrl = getWalletPushFieldUrl(
    passTypeId,
    serialNumber,
    WALLET_PASS_FIELDS.LAST_MESSAGE,
    walletpushDashboardUrl
  )
  const offerUrl = getWalletPushFieldUrl(
    passTypeId,
    serialNumber,
    WALLET_PASS_FIELDS.CURRENT_OFFER,
    walletpushDashboardUrl
  )

  // CRITICAL ORDER (do not reverse — 87b462aa caused "Store Card Updated" again):
  // If Current_Offer + Last_Message both change before the device fetches, iOS
  // collapses the lock-screen alert to generic "Store Card Updated".
  // Mid-window / final already feel fine because they are Last_Message-led.
  // Activate must: (1) push Last_Message alone, (2) then silent Current_Offer.
  // Current_Offer Change Message must stay blank in WalletPush dashboard.
  const shouldPush = input.clearOffer
    ? Boolean(input.lastMessageOverride?.trim())
    : true

  const messageResponse = await fetch(messageUrl, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      value: pushMessage,
      push: shouldPush,
    }),
  })

  if (!messageResponse.ok) {
    const errorText = await messageResponse.text()
    console.error('Last_Message API error:', messageResponse.status, errorText)
    if (input.lastMessageOnly || input.clearOffer) {
      return {
        success: false,
        error: `WalletPush Last_Message API error: ${messageResponse.status}`,
        status: 500,
      }
    }
    // Activate: still try to morph Current_Offer so the pass face updates
  }

  if (!input.lastMessageOnly) {
    // Settle so the device fetch for Last_Message lands before offer morph
    await new Promise((r) => setTimeout(r, 1500))
    const offerResponse = await fetch(offerUrl, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ value: passDisplayText, push: false }),
    })
    if (!offerResponse.ok) {
      const errorText = await offerResponse.text()
      console.error('Current_Offer API error:', offerResponse.status, errorText)
      // Soft-fail: notification already went out with the right copy
      return {
        success: true,
        currentOffer: passDisplayText,
        pushMessage,
        expiryTime: expiryFormatted,
        error: `Current_Offer silent update failed: ${offerResponse.status}`,
      }
    }
  }

  return {
    success: true,
    currentOffer: passDisplayText,
    pushMessage,
    expiryTime: expiryFormatted,
  }
}
