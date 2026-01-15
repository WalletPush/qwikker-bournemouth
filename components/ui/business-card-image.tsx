import Image from 'next/image'
import { getPlaceholderUrl, getFallbackPlaceholderUrl } from '@/lib/placeholders/getPlaceholderImage'
import type { SystemCategory } from '@/lib/constants/system-categories'

interface BusinessCardImageProps {
  businessName: string
  businessId: string
  systemCategory: SystemCategory
  heroImage?: string | null
  showUnclaimedBadge?: boolean
  className?: string
}

export function BusinessCardImage({
  businessName,
  businessId,
  systemCategory,
  heroImage,
  showUnclaimedBadge = true,
  className = ''
}: BusinessCardImageProps) {
  // Claimed businesses with uploaded photos: Use Cloudinary (Next.js Image for optimization)
  if (heroImage) {
    return (
      <div className={`relative ${className}`}>
        <Image
          src={heroImage}
          alt={businessName}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
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
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          // Fallback to default placeholder if category-specific one doesn't exist
          const target = e.target as HTMLImageElement
          target.src = getFallbackPlaceholderUrl()
        }}
      />
      
      {/* Dark overlay gradient to ensure text is readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent" />

      {/* Bottom-right: Clear messaging about photos - subtle and calm */}
      {showUnclaimedBadge && (
        <div className="absolute bottom-3 right-3 z-10">
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-800/70 backdrop-blur-md border border-slate-700/50">
            <p className="text-xs text-slate-300 font-medium">
              Photos added when claimed
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

