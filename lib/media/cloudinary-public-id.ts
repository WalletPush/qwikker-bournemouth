/** Extract Cloudinary public_id from a delivery URL when possible. */
export function extractCloudinaryPublicId(url: string | null | undefined): string | null {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return null
  try {
    const rest = url.split('/upload/')[1]
    if (!rest) return null
    const segments = rest.split('/')
    let start = 0
    if (
      segments[0] &&
      (segments[0].includes(',') || /^(f_|q_|c_|w_|h_|g_|ar_|b_|z_)/.test(segments[0]))
    ) {
      start = 1
    }
    // Drop version segment v123456
    if (segments[start] && /^v\d+$/.test(segments[start])) start += 1
    const path = segments.slice(start).join('/')
    return path.replace(/\.[a-zA-Z0-9]+$/, '') || null
  } catch {
    return null
  }
}
