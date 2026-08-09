import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import {
  archiveMediaAsset,
  createMediaAsset,
  getHeroPresentationsByBusinessIds,
  listBusinessMedia,
  promotePendingMedia,
  rejectPendingMedia,
  selectHeroMedia,
  selectOfferMedia,
  updateMediaFraming,
} from '@/lib/media/media-service'

const listSchema = z.object({
  businessId: z.string().uuid().optional(),
  offerId: z.string().uuid().optional(),
  pendingOnly: z.coerce.boolean().optional(),
})

async function assertBusinessInCity(businessId: string, city: string) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('business_profiles')
    .select('id, city, status, hero_media_id, business_name')
    .eq('id', businessId)
    .eq('city', city)
    .single()
  if (error || !data) throw new Error('Business not found in this city')
  return data
}

async function assertOfferInCity(offerId: string, city: string) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('business_offers')
    .select('id, business_id, offer_media_id, offer_image')
    .eq('id', offerId)
    .single()
  if (error || !data) throw new Error('Offer not found')
  await assertBusinessInCity(data.business_id, city)
  return data
}

/** GET: list media for a business (or pending queue) */
export async function GET(req: Request) {
  try {
    const city = await getFranchiseCityFromRequest()
    const url = new URL(req.url)
    const parsed = listSchema.safeParse({
      businessId: url.searchParams.get('businessId') || undefined,
      offerId: url.searchParams.get('offerId') || undefined,
      pendingOnly: url.searchParams.get('pendingOnly') || undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    if (parsed.data.pendingOnly) {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('city', city)
        .eq('status', 'active')
        .eq('review_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw new Error(error.message)
      return NextResponse.json({ assets: data || [] })
    }

    // Batch hero presentations for admin live cards
    const businessIdsParam = url.searchParams.get('businessIds')
    if (businessIdsParam) {
      const ids = businessIdsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 200)
      const heroes = await getHeroPresentationsByBusinessIds(city, ids)
      return NextResponse.json({ heroes })
    }

    if (parsed.data.businessId) {
      const business = await assertBusinessInCity(parsed.data.businessId, city)
      const assets = await listBusinessMedia(city, parsed.data.businessId)
      return NextResponse.json({
        assets,
        heroMediaId: business.hero_media_id,
        businessName: business.business_name,
        status: business.status,
      })
    }

    if (parsed.data.offerId) {
      const offer = await assertOfferInCity(parsed.data.offerId, city)
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('city', city)
        .eq('offer_id', parsed.data.offerId)
        .eq('status', 'active')
        .order('sort_order', { ascending: true })
      if (error) throw new Error(error.message)
      return NextResponse.json({ assets: data || [], offerMediaId: offer.offer_media_id })
    }

    return NextResponse.json({ error: 'businessId or offerId required' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

const postSchema = z.object({
  action: z.enum([
    'upload',
    'select_hero',
    'select_offer',
    'frame',
    'archive',
    'promote',
    'reject',
  ]),
  businessId: z.string().uuid().optional(),
  offerId: z.string().uuid().optional(),
  mediaId: z.string().uuid().optional(),
  sourceUrl: z.string().url().optional(),
  providerPublicId: z.string().nullable().optional(),
  assetType: z
    .enum(['business_photo', 'logo', 'offer_artwork', 'category_image'])
    .optional(),
  reviewStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  setAsHero: z.boolean().optional(),
  setAsOfferMedia: z.boolean().optional(),
  categoryKey: z.string().optional(),
  framing: z
    .object({
      focal_x: z.number().min(0).max(1).nullable().optional(),
      focal_y: z.number().min(0).max(1).nullable().optional(),
      zoom: z.number().min(1).max(5).nullable().optional(),
      fit: z.enum(['cover', 'contain']).optional(),
      gravity_mode: z.enum(['auto', 'centre', 'manual']).optional(),
    })
    .optional(),
})

/** POST: upload / select / frame / archive / promote / reject */
export async function POST(req: Request) {
  try {
    const city = await getFranchiseCityFromRequest()
    const body = await req.json()
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const input = parsed.data

    switch (input.action) {
      case 'upload': {
        if (!input.sourceUrl || !input.assetType) {
          return NextResponse.json({ error: 'sourceUrl and assetType required' }, { status: 400 })
        }
        if (input.businessId) await assertBusinessInCity(input.businessId, city)
        if (input.offerId) await assertOfferInCity(input.offerId, city)

        const asset = await createMediaAsset({
          city,
          businessId: input.businessId,
          offerId: input.offerId,
          sourceUrl: input.sourceUrl,
          providerPublicId: input.providerPublicId,
          assetType: input.assetType,
          reviewStatus: input.reviewStatus || 'approved',
          setAsHero: input.setAsHero,
          setAsOfferMedia: input.setAsOfferMedia,
          categoryKey: input.categoryKey,
        })
        return NextResponse.json({ success: true, asset })
      }
      case 'select_hero': {
        if (!input.businessId || !input.mediaId) {
          return NextResponse.json({ error: 'businessId and mediaId required' }, { status: 400 })
        }
        await assertBusinessInCity(input.businessId, city)
        await selectHeroMedia(city, input.businessId, input.mediaId)
        return NextResponse.json({ success: true })
      }
      case 'select_offer': {
        if (!input.offerId || !input.mediaId) {
          return NextResponse.json({ error: 'offerId and mediaId required' }, { status: 400 })
        }
        await assertOfferInCity(input.offerId, city)
        await selectOfferMedia(city, input.offerId, input.mediaId)
        return NextResponse.json({ success: true })
      }
      case 'frame': {
        if (!input.mediaId || !input.framing) {
          return NextResponse.json({ error: 'mediaId and framing required' }, { status: 400 })
        }
        const asset = await updateMediaFraming(city, input.mediaId, input.framing)
        return NextResponse.json({ success: true, asset })
      }
      case 'archive': {
        if (!input.mediaId) {
          return NextResponse.json({ error: 'mediaId required' }, { status: 400 })
        }
        await archiveMediaAsset(city, input.mediaId)
        return NextResponse.json({ success: true })
      }
      case 'promote': {
        if (!input.mediaId) {
          return NextResponse.json({ error: 'mediaId required' }, { status: 400 })
        }
        const asset = await promotePendingMedia(city, input.mediaId, null, true)
        return NextResponse.json({ success: true, asset })
      }
      case 'reject': {
        if (!input.mediaId) {
          return NextResponse.json({ error: 'mediaId required' }, { status: 400 })
        }
        await rejectPendingMedia(city, input.mediaId)
        return NextResponse.json({ success: true })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error'
    const status = message.includes('Cannot archive') ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
