import { createServiceRoleClient } from '@/lib/supabase/server'
import type { MediaAsset, MediaFit, MediaGravityMode, MediaPresentation } from './types'
import { presentationFromAsset } from './build-qwikker-image-url'
import { extractCloudinaryPublicId } from './cloudinary-public-id'

export async function listBusinessMedia(city: string, businessId: string): Promise<MediaAsset[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('city', city)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []) as MediaAsset[]
}

export async function getHeroPresentation(
  city: string,
  businessId: string,
  heroMediaId?: string | null
): Promise<MediaPresentation | null> {
  const supabase = createServiceRoleClient()
  if (heroMediaId) {
    const { data } = await supabase
      .from('media_assets')
      .select('id, source_url, focal_x, focal_y, zoom, fit, gravity_mode, status, review_status')
      .eq('id', heroMediaId)
      .eq('city', city)
      .eq('status', 'active')
      .eq('review_status', 'approved')
      .maybeSingle()
    if (data) return presentationFromAsset(data)
  }

  const { data: first } = await supabase
    .from('media_assets')
    .select('id, source_url, focal_x, focal_y, zoom, fit, gravity_mode')
    .eq('city', city)
    .eq('business_id', businessId)
    .eq('asset_type', 'business_photo')
    .eq('status', 'active')
    .eq('review_status', 'approved')
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  return first ? presentationFromAsset(first) : null
}

/** Batch hero presentations for card grids */
export async function getHeroPresentationsByBusinessIds(
  city: string,
  businessIds: string[]
): Promise<Record<string, MediaPresentation>> {
  if (businessIds.length === 0) return {}
  const supabase = createServiceRoleClient()

  const { data: profiles } = await supabase
    .from('business_profiles')
    .select('id, hero_media_id')
    .eq('city', city)
    .in('id', businessIds)

  const heroIds = (profiles || [])
    .map((p) => p.hero_media_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  const byBusiness: Record<string, MediaPresentation> = {}

  if (heroIds.length > 0) {
    const { data: assets } = await supabase
      .from('media_assets')
      .select('id, business_id, source_url, focal_x, focal_y, zoom, fit, gravity_mode')
      .in('id', heroIds)
      .eq('city', city)
      .eq('status', 'active')
      .eq('review_status', 'approved')

    for (const asset of assets || []) {
      if (asset.business_id) {
        byBusiness[asset.business_id] = presentationFromAsset(asset)
      }
    }
  }

  // Fill gaps from first active photo
  const missing = businessIds.filter((id) => !byBusiness[id])
  if (missing.length > 0) {
    const { data: fallbacks } = await supabase
      .from('media_assets')
      .select('id, business_id, source_url, focal_x, focal_y, zoom, fit, gravity_mode, sort_order')
      .eq('city', city)
      .in('business_id', missing)
      .eq('asset_type', 'business_photo')
      .eq('status', 'active')
      .eq('review_status', 'approved')
      .order('sort_order', { ascending: true })

    for (const asset of fallbacks || []) {
      if (asset.business_id && !byBusiness[asset.business_id]) {
        byBusiness[asset.business_id] = presentationFromAsset(asset)
      }
    }
  }

  return byBusiness
}

export interface UpsertMediaInput {
  city: string
  businessId?: string | null
  offerId?: string | null
  sourceUrl: string
  providerPublicId?: string | null
  assetType: MediaAsset['asset_type']
  reviewStatus?: MediaAsset['review_status']
  uploadedBy?: string | null
  curatedBy?: string | null
  categoryKey?: string | null
  setAsHero?: boolean
  setAsOfferMedia?: boolean
  fit?: MediaFit
  gravityMode?: MediaGravityMode
}

export async function createMediaAsset(input: UpsertMediaInput): Promise<MediaAsset> {
  const supabase = createServiceRoleClient()
  const publicId =
    input.providerPublicId || extractCloudinaryPublicId(input.sourceUrl) || null

  let sortOrder = 0
  if (input.businessId) {
    const { data: last } = await supabase
      .from('media_assets')
      .select('sort_order')
      .eq('business_id', input.businessId)
      .eq('status', 'active')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    sortOrder = (last?.sort_order ?? -1) + 1
  }

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      city: input.city,
      business_id: input.businessId ?? null,
      offer_id: input.offerId ?? null,
      source_url: input.sourceUrl,
      provider: 'cloudinary',
      provider_public_id: publicId,
      asset_type: input.assetType,
      sort_order: sortOrder,
      fit: input.fit || 'cover',
      gravity_mode: input.gravityMode || 'auto',
      status: 'active',
      review_status: input.reviewStatus || 'approved',
      uploaded_by: input.uploadedBy ?? null,
      curated_by: input.curatedBy ?? null,
      category_key: input.categoryKey ?? null,
    })
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to create media asset')

  if (input.setAsHero && input.businessId && data.review_status === 'approved') {
    await selectHeroMedia(input.city, input.businessId, data.id, input.curatedBy)
  }

  if (input.setAsOfferMedia && input.offerId && data.review_status === 'approved') {
    await selectOfferMedia(input.city, input.offerId, data.id, input.curatedBy)
  }

  return data as MediaAsset
}

/** Select display image = pointer update only (+ denormalized URL sync for legacy readers). */
export async function selectHeroMedia(
  city: string,
  businessId: string,
  mediaId: string,
  curatedBy?: string | null
): Promise<void> {
  const supabase = createServiceRoleClient()

  const { data: asset, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', mediaId)
    .eq('city', city)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .eq('review_status', 'approved')
    .single()

  if (error || !asset) throw new Error('Media asset not found or not eligible as hero')

  const { error: upErr } = await supabase
    .from('business_profiles')
    .update({ hero_media_id: mediaId })
    .eq('id', businessId)
    .eq('city', city)

  if (upErr) throw new Error(upErr.message)

  // Single-authority write: media_assets owns truth; sync legacy array head for unread surfaces
  const { data: profile } = await supabase
    .from('business_profiles')
    .select('business_images, placeholder_custom_url')
    .eq('id', businessId)
    .single()

  const images = Array.isArray(profile?.business_images) ? [...profile.business_images] : []
  const without = images.filter((u) => u !== asset.source_url)
  const synced = [asset.source_url, ...without]

  await supabase
    .from('business_profiles')
    .update({
      business_images: synced,
      // Claimed real photos supersede custom placeholder display
      placeholder_custom_url: null,
    })
    .eq('id', businessId)

  if (curatedBy) {
    await supabase
      .from('media_assets')
      .update({ curated_by: curatedBy })
      .eq('id', mediaId)
  }
}

export async function selectOfferMedia(
  city: string,
  offerId: string,
  mediaId: string,
  curatedBy?: string | null
): Promise<void> {
  const supabase = createServiceRoleClient()

  const { data: asset, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', mediaId)
    .eq('city', city)
    .eq('offer_id', offerId)
    .eq('status', 'active')
    .eq('review_status', 'approved')
    .single()

  if (error || !asset) throw new Error('Offer media not found or not eligible')

  const { error: upErr } = await supabase
    .from('business_offers')
    .update({ offer_media_id: mediaId, offer_image: asset.source_url })
    .eq('id', offerId)

  if (upErr) throw new Error(upErr.message)

  if (curatedBy) {
    await supabase.from('media_assets').update({ curated_by: curatedBy }).eq('id', mediaId)
  }
}

export async function updateMediaFraming(
  city: string,
  mediaId: string,
  framing: {
    focal_x?: number | null
    focal_y?: number | null
    zoom?: number | null
    fit?: MediaFit
    gravity_mode?: MediaGravityMode
  },
  curatedBy?: string | null
): Promise<MediaAsset> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('media_assets')
    .update({
      ...framing,
      curated_by: curatedBy ?? undefined,
    })
    .eq('id', mediaId)
    .eq('city', city)
    .eq('status', 'active')
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to update framing')
  return data as MediaAsset
}

/** Soft-archive. Blocked while asset is the selected hero or offer media. */
export async function archiveMediaAsset(
  city: string,
  mediaId: string,
  archivedBy?: string | null
): Promise<void> {
  const supabase = createServiceRoleClient()

  const { data: asset } = await supabase
    .from('media_assets')
    .select('id, business_id, offer_id')
    .eq('id', mediaId)
    .eq('city', city)
    .single()

  if (!asset) throw new Error('Media asset not found')

  if (asset.business_id) {
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('hero_media_id')
      .eq('id', asset.business_id)
      .single()
    if (profile?.hero_media_id === mediaId) {
      throw new Error('Cannot archive the current display image. Select another display image first.')
    }
  }

  if (asset.offer_id) {
    const { data: offer } = await supabase
      .from('business_offers')
      .select('offer_media_id')
      .eq('id', asset.offer_id)
      .single()
    if (offer?.offer_media_id === mediaId) {
      throw new Error('Cannot archive the current offer image. Select another offer image first.')
    }
  }

  const { error } = await supabase
    .from('media_assets')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      archived_by: archivedBy ?? null,
    })
    .eq('id', mediaId)
    .eq('city', city)

  if (error) throw new Error(error.message)
}

export async function promotePendingMedia(
  city: string,
  mediaId: string,
  curatedBy?: string | null,
  setAsHero = true
): Promise<MediaAsset> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('media_assets')
    .update({
      review_status: 'approved',
      curated_by: curatedBy ?? null,
    })
    .eq('id', mediaId)
    .eq('city', city)
    .eq('status', 'active')
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to promote media')

  if (setAsHero && data.business_id) {
    await selectHeroMedia(city, data.business_id, data.id, curatedBy)
  }

  return data as MediaAsset
}

export async function rejectPendingMedia(
  city: string,
  mediaId: string,
  archivedBy?: string | null
): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('media_assets')
    .update({
      review_status: 'rejected',
      status: 'archived',
      archived_at: new Date().toISOString(),
      archived_by: archivedBy ?? null,
    })
    .eq('id', mediaId)
    .eq('city', city)

  if (error) throw new Error(error.message)
}
