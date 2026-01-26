import Image from 'next/image'
import { getPlaceholderUrl, getFallbackPlaceholderUrl } from '@/lib/placeholders/getPlaceholderImage'
import { optimizeCloudinaryUrl, getBusinessImageSizes } from '@/lib/utils/optimize-image-url'
import type { SystemCategory } from '@/lib/constants/system-categories'

interface BusinessCardImageProps {
  businessName: string
  businessId: string
  systemCategory: SystemCategory
  heroImage?: string | null
  showUnclaimedBadge?: boolean
  className?: string
  onBadgeHover?: (isHovering: boolean) => void
  onBadgeClick?: () => void
}

export function BusinessCardImage({
  businessName,
  businessId,
  systemCategory,
  heroImage,
  showUnclaimedBadge = true,
  className = '',
  onBadgeHover,
  onBadgeClick
}: BusinessCardImageProps) {
  // Claimed businesses with uploaded photos: Use Cloudinary (Next.js Image for optimization)
  if (heroImage) {
    // Optimize Cloudinary URL with auto-format, auto-quality, and size limits
    const optimizedUrl = optimizeCloudinaryUrl(heroImage, 1200) || heroImage
    
    return (
      <div className={`relative ${className}`}>
        <Image
          src={optimizedUrl}
          alt={businessName}
          fill
          className="object-cover"
          sizes={getBusinessImageSizes()}
          priority={false}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
    )
  }

  // Unclaimed businesses: Use deterministic placeholder from local /public/placeholders/
  const placeholderUrl = getPlaceholderUrl(systemCategory, businessId)
  
  return (
    <div className={`relative ${className} overflow-hidden`}>
      {/* Abstract detail shot - empty alt since this is decorative */}
      <img
        src={placeholderUrl}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          // Fallback to default placeholder if category-specific one doesn't exist
          const target = e.target as HTMLImageElement
          target.src = getFallbackPlaceholderUrl()
        }}
      />
      
      {/* Dark overlay gradient to ensure text is readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent" />

      {/* Top-right: Unclaimed badge (simple, no tooltip here) */}
      {showUnclaimedBadge && (
        <div className="absolute top-3 right-3 z-10">
          <div 
            className="px-2 py-1 rounded-md bg-slate-900/90 backdrop-blur-md border border-slate-700/50 cursor-pointer hover:bg-slate-800/90 transition-colors"
            onMouseEnter={() => {
              console.log('🐛 Badge hover ENTER')
              onBadgeHover?.(true)
            }}
            onMouseLeave={() => {
              console.log('🐛 Badge hover LEAVE')
              onBadgeHover?.(false)
            }}
            onClick={() => {
              console.log('🐛 Badge CLICKED')
              onBadgeClick?.()
            }}
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

