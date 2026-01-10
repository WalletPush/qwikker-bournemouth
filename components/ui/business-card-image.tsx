import Image from 'next/image'
import { getPlaceholder } from '@/lib/constants/category-placeholders'
import type { SystemCategory } from '@/lib/constants/system-categories'

interface BusinessCardImageProps {
  businessName: string
  businessId: string
  googlePlaceId: string
  imageSource: 'placeholder' | 'cloudinary'
  systemCategory: SystemCategory // ✅ Now properly typed as SystemCategory enum
  placeholderVariant?: number | null
  heroImage?: string | null
  showUnclaimedBadge?: boolean // NEW: Control UNCLAIMED badge visibility
  businessStatus?: string // NEW: For runtime safety assertion
  className?: string
}

export function BusinessCardImage({
  businessName,
  businessId,
  googlePlaceId,
  imageSource,
  systemCategory, // UPDATED: Now uses system_category
  placeholderVariant,
  heroImage,
  showUnclaimedBadge = true, // Default to true for backward compatibility
  businessStatus, // NEW: For runtime safety assertion
  className = ''
}: BusinessCardImageProps) {
  // Claimed businesses with uploaded photos: Use Cloudinary (Next.js Image for optimization)
  if (imageSource === 'cloudinary' && heroImage) {
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

  // Unclaimed businesses: Use deterministic placeholder with regular <img> (simpler, faster)
  // Hash-based auto-selection unless admin overrides with manual variant
  // Safe fallback seed: google_place_id ?? id ?? business_name
  const safeId = googlePlaceId || businessId || businessName
  const placeholder = getPlaceholder(systemCategory, safeId, placeholderVariant, businessStatus)
  
  return (
    <div className={`relative ${className} overflow-hidden`}>
      {/* Abstract detail shot - deterministically selected, using regular img for static placeholders */}
      <img
        src={placeholder.imagePath}
        alt={`${placeholder.label} category placeholder`}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      
      {/* Dark overlay gradient to ensure text is readable */}
      <div className={`absolute inset-0 bg-gradient-to-t ${placeholder.overlayGradient}`} />

      {/* Top-left: Category badge with icon */}
      <div className="absolute top-3 left-3 z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20">
          <span className="text-base">{placeholder.icon}</span>
          <span className={`text-sm font-medium ${placeholder.accentColor}`}>
            {placeholder.label}
          </span>
        </div>
      </div>

      {/* Top-right: "Unclaimed" badge - only show if explicitly enabled */}
      {showUnclaimedBadge && (
        <div className="absolute top-3 right-3 z-10">
          <div className="px-2.5 py-1 rounded-md bg-orange-500/90 backdrop-blur-sm border border-orange-400/30">
            <span className="text-xs font-semibold text-white uppercase tracking-wide">
              Unclaimed
            </span>
          </div>
        </div>
      )}

      {/* Bottom-right: Clear messaging about photos - only show for unclaimed */}
      {showUnclaimedBadge && (
        <div className="absolute bottom-3 right-3 z-10">
          <div className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/10">
            <p className="text-xs text-white/90 font-medium">
              Photos added when claimed
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

