export type MediaAssetType =
  | 'business_photo'
  | 'logo'
  | 'offer_artwork'
  | 'category_image'

export type MediaFit = 'cover' | 'contain'
export type MediaGravityMode = 'auto' | 'centre' | 'manual'
export type MediaStatus = 'active' | 'archived'
export type MediaReviewStatus = 'pending' | 'approved' | 'rejected'

export type QwikkerImagePreset =
  | 'card_mobile'
  | 'card_desktop'
  | 'detail_hero'
  | 'offer'
  | 'category'
  | 'wallet'

export interface MediaAsset {
  id: string
  city: string
  business_id: string | null
  offer_id: string | null
  source_url: string
  provider: string
  provider_public_id: string | null
  asset_type: MediaAssetType
  sort_order: number
  focal_x: number | null
  focal_y: number | null
  zoom: number | null
  fit: MediaFit
  gravity_mode: MediaGravityMode
  status: MediaStatus
  review_status: MediaReviewStatus
  archived_at: string | null
  archived_by: string | null
  uploaded_by: string | null
  curated_by: string | null
  category_key: string | null
  created_at: string
  updated_at: string
}

/** Presentation fields needed to render via QwikkerImage */
export interface MediaPresentation {
  id?: string
  source_url: string
  focal_x?: number | null
  focal_y?: number | null
  zoom?: number | null
  fit?: MediaFit | null
  gravity_mode?: MediaGravityMode | null
}
