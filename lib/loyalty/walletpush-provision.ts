/**
 * Provision a per-business WalletPush stamp card from the city MASTER.
 *
 * Auto-create path:
 *   GET /api/templates/{masterId} → full template_json + passkit_json
 *   POST /api/public/admin/templates with both (forces posterGeneric)
 *   mint scoped key + upload branding
 *
 * Admin GET alone is insufficient (no passkit_json / style) and can land as
 * Store Card in Pass Designer if `style` is omitted.
 */

import { readFile } from 'fs/promises'
import path from 'path'
import type { DesignSpecJson } from '@/lib/loyalty/loyalty-types'
import {
  getStampIconPath,
  isValidStampIcon,
  type StampIconKey,
} from '@/lib/loyalty/loyalty-utils'
import { getFranchiseConfig } from '@/lib/utils/franchise-config'

/** Shared Apple pass type for Qwikker city WalletPush instances */
export const QWIKKER_PASS_TYPE_ID = 'pass.come.globalwalletpush'

/** Known city MASTER ids (fallback until franchise column is set everywhere) */
const DEFAULT_LOYALTY_MASTERS: Record<string, string> = {
  bournemouth: 'd1534289-cda9-430a-b183-489d6b78071e',
}

export interface WalletPushProvisionInput {
  city: string
  designSpec: DesignSpecJson
  /** If set, skip create and brand/mint this existing Pass Designer template */
  templateId?: string
  /** Public site origin for resolving relative stamp icon paths (optional) */
  publicOrigin?: string
}

export interface WalletPushProvisionResult {
  walletpush_template_id: string
  walletpush_api_key: string
  walletpush_pass_type_id: string
  program_id?: string
  mode: 'existing_template' | 'auto_create' | 'shared_master'
}

export class WalletPushProvisionError extends Error {
  code: string
  details?: Record<string, unknown>

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'WalletPushProvisionError'
    this.code = code
    this.details = details
  }
}

function adminBase(dashboardUrl: string): string {
  return `${dashboardUrl.replace(/\/+$/, '')}/api/public/admin`
}

function externalBase(dashboardUrl: string): string {
  return `${dashboardUrl.replace(/\/+$/, '')}/api/external/v1`
}

/** Session/Pass Designer template surface — includes passkit_json + full design */
function sessionTemplateUrl(dashboardUrl: string, templateId: string): string {
  return `${dashboardUrl.replace(/\/+$/, '')}/api/templates/${templateId}`
}

interface SessionTemplatePayload {
  id?: string
  pass_type_identifier?: string | null
  program_id?: string
  template_json?: Record<string, unknown>
  passkit_json?: Record<string, unknown>
  data?: SessionTemplatePayload
}

async function wpJson<T = unknown>(
  url: string,
  apiKey: string,
  init?: RequestInit & { json?: unknown }
): Promise<{ status: number; ok: boolean; data: T }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    ...(init?.headers as Record<string, string> | undefined),
  }
  let body = init?.body
  if (init?.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(init.json)
  }
  const res = await fetch(url, { ...init, headers, body })
  const text = await res.text()
  let data: T
  try {
    data = JSON.parse(text) as T
  } catch {
    data = { raw: text.slice(0, 300) } as T
  }
  return { status: res.status, ok: res.ok, data }
}

async function resolveCityWalletPush(city: string) {
  const config = await getFranchiseConfig(city)
  const dashboardUrl = config?.walletpush_dashboard_url?.trim()
  const apiKey = config?.walletpush_api_key?.trim()
  const masterTemplateId =
    config?.walletpush_loyalty_master_template_id?.trim() ||
    DEFAULT_LOYALTY_MASTERS[city.toLowerCase()] ||
    ''

  if (!dashboardUrl || !apiKey) {
    throw new WalletPushProvisionError(
      'CITY_WP_NOT_CONFIGURED',
      'City WalletPush API key or dashboard URL is missing in Admin Setup.'
    )
  }

  return { dashboardUrl, apiKey, masterTemplateId, config }
}

async function mintScopedKey(
  dashboardUrl: string,
  cityApiKey: string,
  templateId: string,
  label: string
): Promise<string> {
  const { ok, status, data } = await wpJson<{
    apiKey?: { value?: string }
    error?: string
    message?: string
  }>(`${adminBase(dashboardUrl)}/api-keys`, cityApiKey, {
    method: 'POST',
    json: { label: label.slice(0, 80), templateIds: [templateId] },
  })

  const value = data.apiKey?.value?.trim()
  if (!ok || !value) {
    throw new WalletPushProvisionError(
      'MINT_KEY_FAILED',
      data.error || data.message || `Failed to mint API key (${status})`,
      { status, data }
    )
  }
  return value
}

async function resolvePassTypeId(
  dashboardUrl: string,
  scopedKey: string,
  templateId: string
): Promise<string> {
  const { ok, data } = await wpJson<{ pass_type_identifier?: string | null }>(
    `${externalBase(dashboardUrl)}/templates/${templateId}`,
    scopedKey
  )
  if (ok && data.pass_type_identifier?.trim()) {
    return data.pass_type_identifier.trim()
  }
  // City instances share this pass type; usable once the template is a real Pass Designer card
  return QWIKKER_PASS_TYPE_ID
}

async function fetchImageBuffer(source: string): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  try {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const res = await fetch(source)
      if (!res.ok) return null
      const contentType = res.headers.get('content-type') || 'image/png'
      const buffer = Buffer.from(await res.arrayBuffer())
      const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png'
      return { buffer, contentType, filename: `upload.${ext}` }
    }

    // Local public path e.g. /loyalty/stamp-icons/flame-earned-256.png
    const rel = source.startsWith('/') ? source.slice(1) : source
    const filePath = path.join(process.cwd(), 'public', rel)
    const buffer = await readFile(filePath)
    return { buffer, contentType: 'image/png', filename: path.basename(filePath) }
  } catch (err) {
    console.warn('[walletpush-provision] fetchImageBuffer failed:', source, err)
    return null
  }
}

async function uploadTemplateImage(
  dashboardUrl: string,
  cityApiKey: string,
  templateId: string,
  imageType: 'icon' | 'logo' | 'strip' | 'background' | 'thumbnail' | 'footer' | 'primaryLogo',
  source: string
): Promise<string | null> {
  const img = await fetchImageBuffer(source)
  if (!img) return null

  const form = new FormData()
  form.append(
    'image',
    new Blob([new Uint8Array(img.buffer)], { type: img.contentType }),
    img.filename
  )

  const res = await fetch(
    `${adminBase(dashboardUrl)}/templates/${templateId}/images/${imageType}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${cityApiKey}` },
      body: form,
    }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.warn(`[walletpush-provision] image upload ${imageType} failed:`, res.status, data)
    return null
  }
  return typeof data.url === 'string' ? data.url : null
}

/** Stamp grid + layout tuned so N stamps fit the poster strip (API-settable). */
function stampLayoutForThreshold(total: number): {
  cols: number
  rows: number
  widthPct: number
  cellAspect: number
  cellPadding: number
  verticalCenterPct: number
} {
  const n = Math.max(1, Math.min(20, Math.round(total)))
  // MASTER baseline: 3 stamps @ widthPct 40 → ~13.3% strip width per cell
  const perCell = 40 / 3

  if (n <= 5) {
    return {
      cols: n,
      rows: 1,
      widthPct: Math.min(70, Math.round(perCell * n)),
      cellAspect: 0.55,
      cellPadding: 0.22,
      verticalCenterPct: 50,
    }
  }
  if (n <= 8) {
    const cols = Math.ceil(n / 2)
    return {
      cols,
      rows: 2,
      widthPct: Math.min(72, Math.round(perCell * cols)),
      cellAspect: 0.55,
      cellPadding: 0.2,
      verticalCenterPct: 48,
    }
  }
  if (n <= 12) {
    return {
      cols: 4,
      rows: Math.ceil(n / 4),
      widthPct: 68,
      cellAspect: 0.55,
      cellPadding: 0.2,
      verticalCenterPct: 48,
    }
  }
  return {
    cols: 5,
    rows: Math.ceil(n / 5),
    widthPct: 72,
    cellAspect: 0.5,
    cellPadding: 0.2,
    verticalCenterPct: 48,
  }
}

/**
 * Brand a cloned MASTER template for one business.
 *
 * Order matters: WalletPush has no stamp image type, so we stage earned/unearned
 * into thumbnail/footer to get blob URLs, PUT those onto stampCard, then overwrite
 * logo/thumbnail/primaryLogo with the real business logo (and strip last).
 */
async function applyBranding(
  dashboardUrl: string,
  cityApiKey: string,
  templateId: string,
  designSpec: DesignSpecJson
): Promise<void> {
  let earnedStampUrl: string | null = null
  let unearnedStampUrl: string | null = null
  const iconKey = designSpec.stamp_icon

  // 1) Stage stamp PNGs into temporary slots (will be overwritten below)
  if (isValidStampIcon(iconKey)) {
    const earned = getStampIconPath(iconKey as StampIconKey, 'earned', 256)
    const unearned = getStampIconPath(iconKey as StampIconKey, 'unearned', 256)
    const [earnedUrl, unearnedUrl] = await Promise.all([
      uploadTemplateImage(dashboardUrl, cityApiKey, templateId, 'thumbnail', earned),
      uploadTemplateImage(dashboardUrl, cityApiKey, templateId, 'footer', unearned),
    ])
    earnedStampUrl = earnedUrl
    unearnedStampUrl = unearnedUrl
  }

  // 2) Persist stamp count + icon URLs on stampCard
  const sess = await wpJson<{
    data?: { template_json?: Record<string, unknown>; passkit_json?: Record<string, unknown> }
    template_json?: Record<string, unknown>
    passkit_json?: Record<string, unknown>
  }>(sessionTemplateUrl(dashboardUrl, templateId), cityApiKey)

  const payload = sess.data.data || sess.data
  const templateJson = payload.template_json
    ? { ...payload.template_json }
    : null
  const passkitJson = payload.passkit_json
    ? { ...payload.passkit_json }
    : null

  if (templateJson) {
    const totalStamps = Math.max(1, Number(designSpec.reward_threshold) || 5)
    const grid = stampLayoutForThreshold(totalStamps)
    const existingPg = (templateJson.posterGeneric as Record<string, unknown> | undefined) || {}
    const existingCard = (existingPg.stampCard as Record<string, unknown> | undefined) || {}

    const stampCard = {
      ...existingCard,
      enabled: true,
      totalStamps,
      counterField: (existingCard.counterField as string) || 'Points',
      grid: { cols: grid.cols, rows: grid.rows },
      layout: {
        widthPct: grid.widthPct,
        cellAspect: grid.cellAspect,
        cellPadding: grid.cellPadding,
        verticalCenterPct: grid.verticalCenterPct,
      },
      earnedStampUrl: earnedStampUrl || existingCard.earnedStampUrl,
      unearnedStampUrl: unearnedStampUrl || existingCard.unearnedStampUrl,
    }

    templateJson.style = 'posterGeneric'
    templateJson.passStyle = 'posterGeneric'
    templateJson.posterGeneric = { ...existingPg, stampCard }

    if (passkitJson) {
      const pkPg = (passkitJson.posterGeneric as Record<string, unknown> | undefined) || {}
      passkitJson.posterGeneric = { ...pkPg, stampCard }
    }

    const name =
      designSpec.program_name?.trim() || `${designSpec.business_name} Rewards`

    const put = await wpJson(`${adminBase(dashboardUrl)}/templates/${templateId}`, cityApiKey, {
      method: 'PUT',
      json: {
        name: name.slice(0, 120),
        templateJson,
        ...(passkitJson ? { passkitJson } : {}),
      },
    })
    if (!put.ok) {
      console.warn('[walletpush-provision] stampCard PUT failed:', put.status, put.data)
    }
  } else {
    console.warn('[walletpush-provision] skip stampCard update — no template_json')
  }

  // 3) Restore real branding AFTER stamp staging (overwrites burger in thumbnail/etc.)
  const restore: Promise<unknown>[] = []
  if (designSpec.logo_url) {
    restore.push(
      uploadTemplateImage(dashboardUrl, cityApiKey, templateId, 'logo', designSpec.logo_url)
    )
    restore.push(
      uploadTemplateImage(dashboardUrl, cityApiKey, templateId, 'icon', designSpec.logo_url)
    )
    restore.push(
      uploadTemplateImage(dashboardUrl, cityApiKey, templateId, 'primaryLogo', designSpec.logo_url)
    )
    restore.push(
      uploadTemplateImage(dashboardUrl, cityApiKey, templateId, 'thumbnail', designSpec.logo_url)
    )
  }
  if (designSpec.strip_image_url) {
    restore.push(
      uploadTemplateImage(dashboardUrl, cityApiKey, templateId, 'strip', designSpec.strip_image_url)
    )
    restore.push(
      uploadTemplateImage(
        dashboardUrl,
        cityApiKey,
        templateId,
        'background',
        designSpec.strip_image_url
      )
    )
  }
  await Promise.all(restore)
}

async function renameTemplate(
  dashboardUrl: string,
  cityApiKey: string,
  templateId: string,
  name: string
): Promise<void> {
  await wpJson(`${adminBase(dashboardUrl)}/templates/${templateId}`, cityApiKey, {
    method: 'PUT',
    json: { name: name.slice(0, 120) },
  })
}

/**
 * Brand + mint for an existing Pass Designer template (duplicate of MASTER).
 */
export async function provisionFromExistingTemplate(
  input: WalletPushProvisionInput & { templateId: string }
): Promise<WalletPushProvisionResult> {
  const { dashboardUrl, apiKey } = await resolveCityWalletPush(input.city)
  const templateId = input.templateId.trim()
  const name =
    input.designSpec.program_name?.trim() ||
    `${input.designSpec.business_name} Rewards`

  await renameTemplate(dashboardUrl, apiKey, templateId, name)
  await applyBranding(dashboardUrl, apiKey, templateId, input.designSpec)

  const scopedKey = await mintScopedKey(
    dashboardUrl,
    apiKey,
    templateId,
    `${input.designSpec.business_name} — ${name}`
  )
  const passType = await resolvePassTypeId(dashboardUrl, scopedKey, templateId)

  // Verify the template can issue (has real PassType binding)
  const probe = await wpJson<{ pass_type_identifier?: string | null }>(
    `${externalBase(dashboardUrl)}/templates/${templateId}`,
    scopedKey
  )
  if (!probe.data.pass_type_identifier) {
    throw new WalletPushProvisionError(
      'TEMPLATE_NOT_ISSUABLE',
      'That template has no Pass Type yet. Duplicate the city Loyalty MASTER in Pass Designer (not a blank create), then paste that template id.',
      { templateId }
    )
  }

  return {
    walletpush_template_id: templateId,
    walletpush_api_key: scopedKey,
    walletpush_pass_type_id: passType,
    mode: 'existing_template',
  }
}

/**
 * Deep-clone city MASTER into a new Pass Designer card (posterGeneric stamp card).
 * Uses session GET for full design + passkit, then admin create.
 */
export async function provisionAutoFromMaster(
  input: WalletPushProvisionInput
): Promise<WalletPushProvisionResult> {
  const { dashboardUrl, apiKey, masterTemplateId } = await resolveCityWalletPush(input.city)

  if (!masterTemplateId) {
    throw new WalletPushProvisionError(
      'NO_MASTER',
      'No loyalty MASTER template configured for this city. Set walletpush_loyalty_master_template_id in Admin Setup.'
    )
  }

  // Admin GET lacks passkit_json / full fields — session surface is required
  const masterRes = await wpJson<SessionTemplatePayload>(
    sessionTemplateUrl(dashboardUrl, masterTemplateId),
    apiKey
  )
  if (!masterRes.ok) {
    throw new WalletPushProvisionError(
      'MASTER_FETCH_FAILED',
      'Could not load the city loyalty MASTER template from WalletPush.',
      { status: masterRes.status, data: masterRes.data }
    )
  }

  const master = masterRes.data.data || masterRes.data
  const templateJson = master.template_json
  const passkitJson = master.passkit_json
  if (!templateJson || !passkitJson) {
    throw new WalletPushProvisionError(
      'MASTER_INCOMPLETE',
      'City Loyalty MASTER is missing template_json or passkit_json. Open it in Pass Designer and save once.',
      { masterTemplateId }
    )
  }

  const name =
    input.designSpec.program_name?.trim() ||
    `${input.designSpec.business_name} Rewards`

  // Force Poster Generic — omitting `style` can show as Store Card in Pass Designer UI
  const clonedTemplateJson: Record<string, unknown> = {
    ...templateJson,
    id: undefined,
    name,
    style: 'posterGeneric',
    passStyle: 'posterGeneric',
  }
  delete clonedTemplateJson.id

  const clonedPasskitJson: Record<string, unknown> = {
    ...passkitJson,
    description: name,
    passTypeIdentifier:
      (typeof passkitJson.passTypeIdentifier === 'string' && passkitJson.passTypeIdentifier) ||
      master.pass_type_identifier ||
      QWIKKER_PASS_TYPE_ID,
    preferredStyleSchemes: ['posterGeneric', 'generic'],
  }

  const createRes = await wpJson<{
    id?: string
    program_id?: string
    error?: string
    message?: string
  }>(`${adminBase(dashboardUrl)}/templates`, apiKey, {
    method: 'POST',
    json: {
      name,
      programAssociation: { mode: 'new', newProgramName: name },
      templateJson: clonedTemplateJson,
      passkitJson: clonedPasskitJson,
    },
  })

  const templateId = createRes.data.id
  if (!createRes.ok || !templateId) {
    throw new WalletPushProvisionError(
      'CREATE_FAILED',
      createRes.data.error ||
        createRes.data.message ||
        `Failed to create WalletPush template (${createRes.status})`,
      { status: createRes.status, data: createRes.data }
    )
  }

  // Confirm Pass Designer stored it as posterGeneric (not Store Card)
  const createdSess = await wpJson<SessionTemplatePayload>(
    sessionTemplateUrl(dashboardUrl, templateId),
    apiKey
  )
  const created = createdSess.data.data || createdSess.data
  const createdStyle =
    (created.template_json?.style as string | undefined) ||
    (created.template_json?.passStyle as string | undefined)
  if (createdStyle && createdStyle !== 'posterGeneric') {
    throw new WalletPushProvisionError(
      'WRONG_PASS_STYLE',
      `Created template style is "${createdStyle}" (expected posterGeneric). Delete it in Pass Designer and retry.`,
      { templateId, createdStyle }
    )
  }

  await applyBranding(dashboardUrl, apiKey, templateId, input.designSpec)

  const scopedKey = await mintScopedKey(
    dashboardUrl,
    apiKey,
    templateId,
    `${input.designSpec.business_name} — ${name}`
  )

  const probe = await wpJson<{ pass_type_identifier?: string | null }>(
    `${externalBase(dashboardUrl)}/templates/${templateId}`,
    scopedKey
  )

  if (!probe.data.pass_type_identifier) {
    throw new WalletPushProvisionError(
      'NEEDS_MANUAL_TEMPLATE',
      'Created template has no Pass Type. Open it once in Pass Designer, save, then Activate with that template id.',
      {
        templateId,
        programId: createRes.data.program_id,
        masterTemplateId,
        passDesignerUrl: `${dashboardUrl}/business/pass-designer`,
      }
    )
  }

  return {
    walletpush_template_id: templateId,
    walletpush_api_key: scopedKey,
    walletpush_pass_type_id: await resolvePassTypeId(dashboardUrl, scopedKey, templateId),
    program_id: createRes.data.program_id,
    mode: 'auto_create',
  }
}

/**
 * Main entry: prefer existing template id; otherwise deep-clone from city MASTER.
 * Falls back to shared MASTER only if create fails or is not issuable.
 */
export async function provisionLoyaltyWalletPass(
  input: WalletPushProvisionInput
): Promise<WalletPushProvisionResult> {
  if (input.templateId?.trim()) {
    return provisionFromExistingTemplate({
      ...input,
      templateId: input.templateId.trim(),
    })
  }

  try {
    return await provisionAutoFromMaster(input)
  } catch (err) {
    if (
      err instanceof WalletPushProvisionError &&
      (err.code === 'NEEDS_MANUAL_TEMPLATE' || err.code === 'CREATE_FAILED')
    ) {
      console.warn(
        '[walletpush-provision] auto-create not issuable; falling back to shared city MASTER',
        err.code,
        err.details
      )
      return provisionUsingSharedMaster(input)
    }
    throw err
  }
}

/**
 * Use the city Loyalty MASTER template directly (shared design).
 * Fallback only when auto-create fails — join/earn still works with MASTER chrome.
 */
export async function provisionUsingSharedMaster(
  input: WalletPushProvisionInput
): Promise<WalletPushProvisionResult> {
  const { dashboardUrl, apiKey, masterTemplateId } = await resolveCityWalletPush(input.city)

  if (!masterTemplateId) {
    throw new WalletPushProvisionError(
      'NO_MASTER',
      'No loyalty MASTER template configured for this city.'
    )
  }

  // Confirm MASTER is issuable + mint business key in one go
  const scopedKey = await mintScopedKey(
    dashboardUrl,
    apiKey,
    masterTemplateId,
    `${input.designSpec.business_name} — loyalty`.slice(0, 80)
  )
  const probe = await wpJson<{ pass_type_identifier?: string | null }>(
    `${externalBase(dashboardUrl)}/templates/${masterTemplateId}`,
    scopedKey
  )
  if (!probe.data.pass_type_identifier) {
    throw new WalletPushProvisionError(
      'MASTER_NOT_ISSUABLE',
      'City Loyalty MASTER has no Pass Type. Open it once in Pass Designer and save/publish, then retry.'
    )
  }

  return {
    walletpush_template_id: masterTemplateId,
    walletpush_api_key: scopedKey,
    walletpush_pass_type_id: probe.data.pass_type_identifier.trim(),
    mode: 'shared_master',
  }
}
