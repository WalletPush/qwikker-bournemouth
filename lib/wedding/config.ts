// Private, unlisted guest photo-share pages served at /wedding/[slug].
// These are intentionally separate from the rest of Qwikker (own branding, no chrome)
// and only work on the Bournemouth subdomain. Add a new couple by adding an entry below.

export const WEDDING_CITY = 'bournemouth'

// Uploads reuse the existing Cloudinary account (unsigned preset), same as the dashboard.
export const CLOUDINARY_CLOUD = 'dsh32kke7'
export const CLOUDINARY_UNSIGNED_PRESET = 'unsigned_qwikker'

export function weddingCloudinaryFolder(slug: string): string {
  return `qwikker/weddings/${slug}`
}

// Client-side guard. Note: Cloudinary's FREE plan rejects images over 10MB; raise this if
// your Cloudinary plan allows larger. Guest phone photos are typically 2-6MB.
export const WEDDING_MAX_FILE_BYTES = 10_485_760 // 10 MB

export interface WeddingConfig {
  slug: string
  coupleNames: string // used for the big script title, e.g. "Hetty & Daymo"
  title: string // full heading, e.g. "Hetty & Daymo's Special Day"
  welcome: string // small line above the title
  intro: string // the playful invitation copy
  downloadPassword: string // gates the "Download album" ZIP + the hidden cleanup mode
}

const WEDDINGS: Record<string, WeddingConfig> = {
  hettyanddaymo: {
    slug: 'hettyanddaymo',
    coupleNames: 'Hetty & Daymo',
    title: "Hetty & Daymo's Special Day",
    welcome: 'Welcome to our special day — please share your moments',
    intro: 'We want it all — the kisses, the chaos, the cake. Show us what you saw.',
    downloadPassword: '28081969',
  },
}

export function getWedding(slug: string | undefined | null): WeddingConfig | null {
  if (!slug) return null
  return WEDDINGS[slug.toLowerCase()] ?? null
}
