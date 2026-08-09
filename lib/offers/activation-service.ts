'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import type {
  ActivateOfferResult,
  OfferActivation,
  OfferActivationSource,
  SavedOffer,
} from '@/lib/offers/activation-types'

function asActivation(row: Record<string, unknown>, windowMinutes?: number): OfferActivation {
  return {
    id: String(row.id),
    wallet_pass_id: String(row.wallet_pass_id),
    offer_id: String(row.offer_id),
    business_id: String(row.business_id),
    activated_at: String(row.activated_at),
    active_until: String(row.active_until),
    warning_sent_at: (row.warning_sent_at as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    status: row.status as OfferActivation['status'],
    source: row.source as OfferActivation['source'],
    wallet_sync_status: row.wallet_sync_status as OfferActivation['wallet_sync_status'],
    wallet_sync_attempts: Number(row.wallet_sync_attempts || 0),
    wallet_sync_last_error: (row.wallet_sync_last_error as string | null) ?? null,
    replaced_activation_id: (row.replaced_activation_id as string | null) ?? null,
    activation_window_minutes: windowMinutes,
  }
}

/** Save offer for later — intent only, no wallet, no business notify. */
export async function saveOffer(input: {
  walletPassId: string
  offerId: string
  source?: OfferActivationSource
}): Promise<{ success: boolean; error?: string; saved?: SavedOffer }> {
  const walletPassId = input.walletPassId?.trim()
  if (!walletPassId || walletPassId.length < 10) {
    return { success: false, error: 'Invalid wallet pass' }
  }

  const supabase = createServiceRoleClient()
  const { data: offer, error: offerError } = await supabase
    .from('business_offers')
    .select('id, business_id, status')
    .eq('id', input.offerId)
    .single()

  if (offerError || !offer) {
    return { success: false, error: 'Offer not found' }
  }
  if (offer.status !== 'approved') {
    return { success: false, error: 'Offer is not available' }
  }

  const { data, error } = await supabase
    .from('user_saved_offers')
    .upsert(
      {
        wallet_pass_id: walletPassId,
        offer_id: offer.id,
        business_id: offer.business_id,
        source: input.source || 'offers',
        removed_at: null,
        saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'wallet_pass_id,offer_id' }
    )
    .select('*')
    .single()

  if (error || !data) {
    console.error('saveOffer failed:', error)
    return { success: false, error: error?.message || 'Failed to save offer' }
  }

  return {
    success: true,
    saved: {
      id: data.id,
      wallet_pass_id: data.wallet_pass_id,
      offer_id: data.offer_id,
      business_id: data.business_id,
      saved_at: data.saved_at,
      removed_at: data.removed_at,
      source: data.source,
    },
  }
}

/** Soft-remove a saved offer. */
export async function unsaveOffer(input: {
  walletPassId: string
  offerId: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('user_saved_offers')
    .update({ removed_at: new Date().toISOString() })
    .eq('wallet_pass_id', input.walletPassId)
    .eq('offer_id', input.offerId)
    .is('removed_at', null)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

function slugifyBusinessName(name: string): string {
  return (name || 'business')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'business'
}

function truncateWords(input: string, maxLen: number): string {
  const clean = (input || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLen) return clean
  const cut = clean.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut
  return trimmed.replace(/[\s,&+\-–—]+$/, '') + '…'
}

/** Build expiry vibe CTA copy + deep link into business vibe sheet. */
export function buildExpiryVibeMessage(params: {
  offerName: string
  businessName: string
  city: string
  walletPassId: string
  businessSlug?: string | null
}): string {
  const shortOffer = truncateWords(params.offerName, 40)
  const shortBusiness = truncateWords(params.businessName, 28)
  const slug = params.businessSlug?.trim() || slugifyBusinessName(params.businessName)
  const city = (params.city || 'bournemouth').toLowerCase()
  const vibeUrl = `https://${city}.qwikker.com/user/business/${slug}?vibe=1&wallet_pass_id=${encodeURIComponent(params.walletPassId)}`
  return `How was "${shortOffer}" at ${shortBusiness}? Tap to leave a quick vibe:\n${vibeUrl}`
}

async function syncActivationToWallet(params: {
  walletPassId: string
  offerName: string
  businessName: string
  activeUntil: string
  windowMinutes: number
  mode?: 'activate' | 'clear' | 'warning'
  warningMessage?: string
  /** Expiry clear: Last_Message CTA (pushes). Omit for silent clear. */
  clearMessage?: string
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { updateMainPassOffer } = await import('@/lib/wallet/update-main-pass-offer')
    const isClear = params.mode === 'clear'
    const result = await updateMainPassOffer({
      userWalletPassId: params.walletPassId,
      currentOffer: isClear ? '' : params.offerName,
      clearOffer: isClear,
      lastMessageOnly: params.mode === 'warning',
      lastMessageOverride: isClear
        ? params.clearMessage
        : params.warningMessage,
      offerDetails: {
        businessName: params.businessName,
        activationWindowMinutes: params.windowMinutes,
        activeUntil: params.activeUntil,
      },
    })
    if (!result.success) {
      return { ok: false, error: result.error || 'Wallet sync failed' }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Wallet sync failed' }
  }
}

/**
 * Redeem now — create timed activation via RPC, then sync wallet.
 * If another offer is active, returns needs_replace_confirm unless confirmReplace.
 */
export async function activateOffer(input: {
  walletPassId: string
  offerId: string
  source?: OfferActivationSource
  confirmReplace?: boolean
}): Promise<ActivateOfferResult> {
  const walletPassId = input.walletPassId?.trim()
  if (!walletPassId || walletPassId.length < 10) {
    return { success: false, error: 'invalid_wallet_pass_id' }
  }

  const supabase = createServiceRoleClient()
  const { data: rpcData, error: rpcError } = await supabase.rpc('activate_offer', {
    p_wallet_pass_id: walletPassId,
    p_offer_id: input.offerId,
    p_source: input.source || 'offers',
    p_confirm_replace: Boolean(input.confirmReplace),
  })

  if (rpcError) {
    console.error('activate_offer RPC error:', rpcError)
    return { success: false, error: rpcError.message }
  }

  const result = rpcData as Record<string, unknown>
  if (!result?.success) {
    return {
      success: false,
      error: String(result?.error || 'activation_failed'),
      active: result?.active as ActivateOfferResult['active'],
    }
  }

  const activationRaw = result.activation as Record<string, unknown>
  const offerMeta = result.offer as {
    offer_name: string
    business_name: string
    business_id: string
    city?: string | null
  }
  const windowMinutes = Number(activationRaw.activation_window_minutes || 60)
  const activation = asActivation(activationRaw, windowMinutes)

  // Notify business: activated (not redeemed)
  try {
    const { data: user } = await supabase
      .from('app_users')
      .select('first_name')
      .eq('wallet_pass_id', walletPassId)
      .maybeSingle()

    const { createBusinessNotification } = await import(
      '@/lib/actions/business-notification-actions'
    )
    await createBusinessNotification({
      businessId: offerMeta.business_id,
      type: 'offer_claim',
      title: 'Offer activated',
      message: `${user?.first_name || 'Someone'} activated "${offerMeta.offer_name}" to show in store`,
    })
  } catch (e) {
    console.warn('Activation business notify failed (non-critical):', e)
  }

  const sync = await syncActivationToWallet({
    walletPassId,
    offerName: offerMeta.offer_name,
    businessName: offerMeta.business_name,
    activeUntil: activation.active_until,
    windowMinutes,
    mode: 'activate',
  })

  await supabase
    .from('offer_activations')
    .update({
      wallet_sync_status: sync.ok ? 'synced' : 'failed',
      wallet_sync_attempts: 1,
      wallet_sync_last_error: sync.ok ? null : sync.error || 'unknown',
    })
    .eq('id', activation.id)

  return {
    success: true,
    activation: {
      ...activation,
      wallet_sync_status: sync.ok ? 'synced' : 'failed',
    },
    offer: offerMeta,
    walletSynced: sync.ok,
    walletError: sync.ok ? undefined : sync.error,
    message: sync.ok
      ? `Activated — show your pass within about ${windowMinutes} minutes`
      : `Activated in-app, but your wallet pass couldn’t refresh. Show this screen to staff.`,
  }
}

export async function getActiveActivation(walletPassId: string): Promise<{
  activation: OfferActivation | null
  offerName?: string
  businessName?: string
}> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('offer_activations')
    .select('*')
    .eq('wallet_pass_id', walletPassId)
    .eq('status', 'active')
    .gt('active_until', new Date().toISOString())
    .order('activated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return { activation: null }

  const [{ data: offer }, { data: business }] = await Promise.all([
    supabase.from('business_offers').select('offer_name').eq('id', data.offer_id).maybeSingle(),
    supabase
      .from('business_profiles')
      .select('business_name')
      .eq('id', data.business_id)
      .maybeSingle(),
  ])

  return {
    activation: asActivation(data as Record<string, unknown>),
    offerName: offer?.offer_name,
    businessName: business?.business_name,
  }
}

export async function listSavedOfferIds(walletPassId: string): Promise<string[]> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('user_saved_offers')
    .select('offer_id')
    .eq('wallet_pass_id', walletPassId)
    .is('removed_at', null)

  return (data || []).map((row) => row.offer_id as string)
}

export async function listActivationOfferIds(walletPassId: string): Promise<{
  activeOfferIds: string[]
  endedOfferIds: string[]
}> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('offer_activations')
    .select('offer_id, status, active_until')
    .eq('wallet_pass_id', walletPassId)

  const now = Date.now()
  const activeOfferIds: string[] = []
  const endedOfferIds: string[] = []

  for (const row of data || []) {
    const isActive =
      row.status === 'active' && new Date(row.active_until).getTime() > now
    if (isActive) activeOfferIds.push(row.offer_id)
    else endedOfferIds.push(row.offer_id)
  }

  return { activeOfferIds, endedOfferIds }
}

/** Retry pending/failed wallet syncs and process clear_pending. */
export async function processWalletActivationOutbox(limit = 40): Promise<{
  synced: number
  cleared: number
  failed: number
}> {
  const supabase = createServiceRoleClient()
  let synced = 0
  let cleared = 0
  let failed = 0

  const { data: rows } = await supabase
    .from('offer_activations')
    .select(
      'id, wallet_pass_id, offer_id, business_id, active_until, wallet_sync_status, wallet_sync_attempts, status'
    )
    .in('wallet_sync_status', ['pending', 'failed', 'clear_pending', 'clear_failed'])
    .lt('wallet_sync_attempts', 8)
    .order('updated_at', { ascending: true })
    .limit(limit)

  for (const row of rows || []) {
    const [{ data: offer }, { data: business }] = await Promise.all([
      supabase
        .from('business_offers')
        .select('offer_name, activation_window_minutes')
        .eq('id', row.offer_id)
        .maybeSingle(),
      supabase
        .from('business_profiles')
        .select('business_name, city')
        .eq('id', row.business_id)
        .maybeSingle(),
    ])
    const isClear =
      row.wallet_sync_status === 'clear_pending' || row.wallet_sync_status === 'clear_failed'

    // Never wipe the pass if a newer activation is already live
    if (isClear) {
      const { data: stillActive } = await supabase
        .from('offer_activations')
        .select('id')
        .eq('wallet_pass_id', row.wallet_pass_id)
        .eq('status', 'active')
        .gt('active_until', new Date().toISOString())
        .neq('id', row.id)
        .limit(1)
        .maybeSingle()

      if (stillActive?.id) {
        await supabase
          .from('offer_activations')
          .update({
            wallet_sync_status: 'cleared',
            wallet_sync_attempts: (row.wallet_sync_attempts || 0) + 1,
            wallet_sync_last_error: null,
          })
          .eq('id', row.id)
        cleared++
        continue
      }
    }

    const windowEnded = new Date(row.active_until).getTime() <= Date.now()
    const clearMessage =
      isClear && windowEnded
        ? buildExpiryVibeMessage({
            offerName: offer?.offer_name || 'Offer',
            businessName: business?.business_name || 'Business',
            city: business?.city || 'bournemouth',
            walletPassId: row.wallet_pass_id,
          })
        : undefined

    const sync = await syncActivationToWallet({
      walletPassId: row.wallet_pass_id,
      offerName: offer?.offer_name || 'Offer',
      businessName: business?.business_name || 'Business',
      activeUntil: row.active_until,
      windowMinutes: offer?.activation_window_minutes || 60,
      mode: isClear ? 'clear' : 'activate',
      clearMessage,
    })

    if (sync.ok) {
      await supabase
        .from('offer_activations')
        .update({
          wallet_sync_status: isClear ? 'cleared' : 'synced',
          wallet_sync_attempts: (row.wallet_sync_attempts || 0) + 1,
          wallet_sync_last_error: null,
        })
        .eq('id', row.id)
      if (isClear) cleared++
      else synced++
    } else {
      await supabase
        .from('offer_activations')
        .update({
          wallet_sync_status: isClear ? 'clear_failed' : 'failed',
          wallet_sync_attempts: (row.wallet_sync_attempts || 0) + 1,
          wallet_sync_last_error: sync.error || 'unknown',
        })
        .eq('id', row.id)
      failed++
    }
  }

  return { synced, cleared, failed }
}

/** End expired activations + queue silent pass clear; send one mid-window warning. */
export async function processActivationLifecycle(): Promise<{
  ended: number
  warnings: number
}> {
  const supabase = createServiceRoleClient()
  const nowIso = new Date().toISOString()

  // Silent expiry
  const { data: expired } = await supabase
    .from('offer_activations')
    .select('id, wallet_sync_status')
    .eq('status', 'active')
    .lte('active_until', nowIso)
    .limit(200)

  let ended = 0
  for (const row of expired || []) {
    const { error } = await supabase
      .from('offer_activations')
      .update({
        status: 'ended',
        completed_at: nowIso,
        wallet_sync_status:
          row.wallet_sync_status === 'synced' || row.wallet_sync_status === 'failed'
            ? 'clear_pending'
            : row.wallet_sync_status,
      })
      .eq('id', row.id)
      .eq('status', 'active')
    if (!error) ended++
  }

  // Mid-window warning once (~halfway remaining when first checked)
  const { data: active } = await supabase
    .from('offer_activations')
    .select(
      'id, wallet_pass_id, offer_id, business_id, activated_at, active_until, warning_sent_at'
    )
    .eq('status', 'active')
    .gt('active_until', nowIso)
    .is('warning_sent_at', null)
    .limit(100)

  let warnings = 0
  const now = Date.now()
  for (const row of active || []) {
    const start = new Date(row.activated_at).getTime()
    const end = new Date(row.active_until).getTime()
    const mid = start + (end - start) / 2
    if (now < mid) continue

    const [{ data: offer }, { data: business }] = await Promise.all([
      supabase
        .from('business_offers')
        .select('offer_name, activation_window_minutes')
        .eq('id', row.offer_id)
        .maybeSingle(),
      supabase
        .from('business_profiles')
        .select('business_name')
        .eq('id', row.business_id)
        .maybeSingle(),
    ])

    const sync = await syncActivationToWallet({
      walletPassId: row.wallet_pass_id,
      offerName: offer?.offer_name || 'Offer',
      businessName: business?.business_name || 'Business',
      activeUntil: row.active_until,
      windowMinutes: offer?.activation_window_minutes || 60,
      mode: 'warning',
      warningMessage:
        'Ready to use your offer? Show your Qwikker pass before it expires.',
    })

    if (sync.ok) {
      await supabase
        .from('offer_activations')
        .update({ warning_sent_at: nowIso })
        .eq('id', row.id)
      warnings++
    }
  }

  return { ended, warnings }
}
