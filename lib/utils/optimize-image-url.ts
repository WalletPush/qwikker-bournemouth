/**
 * Optimize Cloudinary image URLs with automatic transformations
 * 
 * Adds performance optimizations:
 * - f_auto: Automatic format (WebP for modern browsers, JPEG for older)
 * - q_auto: Automatic quality (reduce file size without visible quality loss)
 * - w_auto: Automatic width based on device
 * - c_limit: Limit size (don't upscale)
 * 
 * Example:
 * Input:  https://res.cloudinary.com/dsh32kke7/image/upload/v1234/business.jpg
 * Output: https://res.cloudinary.com/dsh32kke7/image/upload/f_auto,q_auto:good,w_1200,c_limit/v1234/business.jpg
 */

export function optimizeCloudinaryUrl(url: string | null | undefined, maxWidth: number = 1200): string | null | undefined {
  if (!url) return url
  
  // Only process Cloudinary URLs
  if (!url.includes('res.cloudinary.com')) return url
  
  // Check if transformations are already applied
  if (url.includes('f_auto') || url.includes('q_auto')) return url
  
  try {
    // Split URL at /upload/ to inject transformations
    const parts = url.split('/upload/')
    if (parts.length !== 2) return url
    
    // Build transformation string
    const transformations = `f_auto,q_auto:good,w_${maxWidth},c_limit`
    
    // Reconstruct URL with transformations
    return `${parts[0]}/upload/${transformations}/${parts[1]}`
  } catch (error) {
    console.error('[optimizeCloudinaryUrl] Failed to optimize URL:', error)
    return url
  }
}

/**
 * Get responsive sizes attribute for Next.js Image component
 * Based on typical business card layouts
 */
export function getBusinessImageSizes(priority: boolean = false): string {
  if (priority) {
    // Above-the-fold images (hero, first card)
    return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
  }
  
  // Below-the-fold images (lazy-loaded)
  return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px'
}
