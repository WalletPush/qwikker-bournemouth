import { getPlaceholderUrl, getPlaceholderStyle, getFallbackPlaceholderUrl } from '@/lib/placeholders/getPlaceholderImage'
import { getPlaceholderClasses, getOverlayClass } from '@/lib/placeholders/getPlaceholderClass'

interface SimplePlaceholderImageProps {
  businessId: string
  systemCategory: string
  businessName: string
  className?: string
}

/**
 * Simple deterministic placeholder image with style variants
 * 
 * Uses 3 image variants + 6 CSS style variants = 18 possible combinations per category
 * All selections deterministic based on business ID
 * Minimal effects - no heavy gradients or blurs
 */
export function SimplePlaceholderImage({
  businessId,
  systemCategory,
  businessName,
  className = ''
}: SimplePlaceholderImageProps) {
  // Get deterministic image URL and style index
  const imageUrl = getPlaceholderUrl(systemCategory, businessId)
  const styleIndex = getPlaceholderStyle(businessId)
  const classes = getPlaceholderClasses(styleIndex)

  // Handle image load errors (fallback to default)
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (img.src !== getFallbackPlaceholderUrl()) {
      img.src = getFallbackPlaceholderUrl()
    }
  }

  return (
    <div className={`${classes.wrapperClass} ${className}`}>
      {/* Main image */}
      <img
        src={imageUrl}
        alt=""
        className={`absolute inset-0 w-full h-full ${classes.imgClass} z-[1]`}
        loading="lazy"
        onError={handleError}
      />

      {/* Overlay (if style requires it) */}
      {classes.overlay && (
        <div className={getOverlayClass(classes.overlay) || ''} />
      )}
    </div>
  )
}

