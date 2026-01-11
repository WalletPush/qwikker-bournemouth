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
      {/* Abstract detail shot - empty alt since this is decorative */}
      <img
        src={placeholder.imagePath}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          // Fallback: If placeholder image 404s (not generated yet), show solid gradient
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            parent.style.background = `linear-gradient(135deg, ${
              systemCategory === 'restaurant' ? '#f97316, #ea580c' :
              systemCategory === 'cafe' ? '#8b5cf6, #7c3aed' :
              systemCategory === 'bar' ? '#ec4899, #db2777' :
              systemCategory === 'pub' ? '#dc2626, #b91c1c' :
              systemCategory === 'dessert' ? '#f43f5e, #e11d48' :
              systemCategory === 'takeaway' ? '#f59e0b, #d97706' :
              systemCategory === 'barber' ? '#06b6d4, #0891b2' :
              systemCategory === 'salon' ? '#ec4899, #db2777' :
              systemCategory === 'tattoo' ? '#6366f1, #4f46e5' :
              '#64748b, #475569'
            })`
          }
        }}
      />
      
      {/* Dark overlay gradient to ensure text is readable */}
      <div className={`absolute inset-0 bg-gradient-to-t ${placeholder.overlayGradient}`} />

      {/* Top-left: Category badge with icon - hide for "other" category */}
      {placeholder.label !== 'Other' && (
        <div className="absolute top-3 left-3 z-10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20">
            <span className="text-base">{placeholder.icon}</span>
            <span className={`text-sm font-medium ${placeholder.accentColor}`}>
              {placeholder.label}
            </span>
          </div>
        </div>
      )}

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

