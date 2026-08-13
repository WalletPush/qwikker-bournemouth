/**
 * Default wallet pass poster (Background_Image) per city.
 * Used on pass create + when clearing an active offer (restore city face).
 * Must be public HTTPS — WalletPush fetches the URL for Apple/Google.
 */

const CITY_PASS_POSTERS: Record<string, string> = {
  // Night shoreline bokeh — Poster Generic default for Bournemouth
  bournemouth:
    'https://res.cloudinary.com/dsh32kke7/image/upload/f_auto,q_auto:good,w_1200,c_limit/v1786648114/qwikker/wallet/posters/bournemouth-pass-poster.jpg',
}

/** Absolute HTTPS poster URL for a franchise city, or null if none configured. */
export function getCityPassPosterUrl(city?: string | null): string | null {
  if (!city) return null
  return CITY_PASS_POSTERS[city.trim().toLowerCase()] || null
}

/** Prefer offer artwork; else business photo/logo; else city poster. */
export function resolvePassBackgroundImageUrl(input: {
  offerImage?: string | null
  businessImage?: string | null
  city?: string | null
}): string | null {
  const candidates = [
    input.offerImage,
    input.businessImage,
    getCityPassPosterUrl(input.city),
  ]
  for (const raw of candidates) {
    const url = (raw || '').trim()
    if (url.startsWith('https://')) return url
  }
  return null
}
