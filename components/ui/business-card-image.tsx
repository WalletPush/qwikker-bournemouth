import { getPlaceholderVariationWithOverride, getFallbackPlaceholderUrl } from '@/lib/placeholders/getPlaceholderImage'
import { QwikkerImage } from '@/components/ui/qwikker-image'
import type { MediaPresentation } from '@/lib/media/types'
import type { SystemCategory } from '@/lib/constants/system-categories'

interface BusinessCardImageProps {
  businessName: string
  businessId: string
  systemCategory: SystemCategory
  heroImage?: string | null
  /** Preferred: presentation from media_assets (focal/fit/gravity) */
  heroMedia?: MediaPresentation | null
  placeholderVariant?: number | null
  customPlaceholderUrl?: string | null
  showUnclaimedBadge?: boolean
  className?: string
  onBadgeHover?: (isHovering: boolean) => void
  onBadgeClick?: () => void
  preset?: 'card_mobile' | 'card_desktop' | 'detail_hero'
}

export function BusinessCardImage({
  businessName,
  businessId,
  systemCategory,
  heroImage,
  heroMedia,
  placeholderVariant,
  customPlaceholderUrl,
  showUnclaimedBadge = true,
  className = '',
  onBadgeHover,
  onBadgeClick,
  preset = 'card_desktop',
}: BusinessCardImageProps) {
  const media: MediaPresentation | null =
    heroMedia ||
    (heroImage ? { source_url: heroImage, fit: 'cover', gravity_mode: 'auto' } : null)

  // Claimed / curated photo via media_assets or legacy URL
  if (media?.source_url) {
    const isContain = media.fit === 'contain'
    return (
      <div className={`relative ${className}`}>
        <QwikkerImage
          key={`${media.id || media.source_url}-${media.fit}-${media.focal_x}-${media.focal_y}`}
          media={media}
          preset={preset}
          alt={businessName}
          fill
        />
        {/* Lighter gradient when showing whole image so baked-in text stays readable */}
        <div
          className={`absolute inset-0 pointer-events-none ${
            isContain
              ? 'bg-gradient-to-t from-black/35 via-transparent to-transparent'
              : 'bg-gradient-to-t from-black/60 to-transparent'
          }`}
        />
      </div>
    )
  }

  // Unclaimed: deterministic placeholder with visual variation.
  const variation = getPlaceholderVariationWithOverride(systemCategory, businessId, placeholderVariant)
  const url = customPlaceholderUrl || variation.url
  const imgClass = customPlaceholderUrl ? 'object-cover w-full h-full' : variation.imgClass
  const overlayClass = customPlaceholderUrl ? null : variation.overlayClass

  if (customPlaceholderUrl) {
    return (
      <div className={`relative ${className}`}>
        <QwikkerImage
          media={{ source_url: customPlaceholderUrl, fit: 'cover', gravity_mode: 'auto' }}
          preset={preset}
          alt={businessName}
          fill
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      </div>
    )
  }

  return (
    <div className={`relative ${className} overflow-hidden`}>
      {/* Local placeholder pool — not Cloudinary */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className={imgClass}
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.src = getFallbackPlaceholderUrl()
        }}
      />

      {overlayClass && (
        <div className={`absolute inset-0 ${overlayClass} pointer-events-none`} />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent" />

      {showUnclaimedBadge && (
        <div className="absolute top-3 right-3 z-10">
          <div
            className="px-2 py-1 rounded-md bg-slate-900/90 backdrop-blur-md border border-slate-700/50 cursor-pointer hover:bg-slate-800/90 transition-colors"
            onMouseEnter={() => onBadgeHover?.(true)}
            onMouseLeave={() => onBadgeHover?.(false)}
            onClick={() => onBadgeClick?.()}
          >
            <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
              <span>ⓘ</span>
              <span>Unclaimed</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
