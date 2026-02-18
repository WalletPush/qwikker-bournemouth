import { getPlaceholderVariation, getFallbackPlaceholderUrl } from '@/lib/placeholders/getPlaceholderImage'

interface SimplePlaceholderImageProps {
  businessId: string
  systemCategory: string
  businessName: string
  className?: string
}

/**
 * Deterministic placeholder image with CSS-driven visual variation.
 * Combines base image + crop position + color treatment + tint overlay.
 */
export function SimplePlaceholderImage({
  businessId,
  systemCategory,
  businessName,
  className = ''
}: SimplePlaceholderImageProps) {
  const { url, imgClass, overlayClass } = getPlaceholderVariation(systemCategory, businessId)

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const fallback = getFallbackPlaceholderUrl()
    if (!img.src.endsWith(fallback)) {
      img.src = fallback
    }
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={url}
        alt=""
        className={`absolute inset-0 z-[1] ${imgClass}`}
        loading="lazy"
        onError={handleError}
      />
      {overlayClass && (
        <div className={`absolute inset-0 ${overlayClass} pointer-events-none z-[2]`} />
      )}
    </div>
  )
}
