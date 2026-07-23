/**
 * Export utilities for imported business data.
 * Pure functions with no external dependencies -- safe to call from client components.
 */

export interface ExportableBusiness {
  placeId: string
  name: string
  address: string
  category: string
  systemCategory?: string
  googlePrimaryType?: string
  googleTypes?: string[]
  matchReason?: string | null
  rating: number
  reviewCount: number
  distance: number
  lat?: number | null
  lng?: number | null
  phone?: string | null
  website?: string | null
  hasPhoto?: boolean
}

export interface ExportMetadata {
  city: string
  status: 'complete' | 'cancelled'
  completedAt: string
}

// RFC 4180: wrap field in quotes if it contains comma, double-quote, or newline.
// Escape internal double-quotes by doubling them.
function csvField(value: unknown): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Export Status is always the first column for auditability.
// Columns are append-only -- do not reorder existing columns.
const CSV_HEADERS = [
  'Export Status',
  'Name',
  'Address',
  'Category',
  'Google Primary Type',
  'Google Types',
  'Rating',
  'Reviews',
  'Google Place ID',
  'Lat',
  'Lng',
  'Match Reason',
  'Distance (km)',
  'Import Date',
  'Phone',
  'Website',
]

export function exportAsCSV(
  businesses: ExportableBusiness[],
  importDate: string,
  meta?: ExportMetadata
): string {
  const dateOnly = importDate.split('T')[0]
  const exportStatus = meta?.status === 'cancelled' ? 'imported-partial' : 'imported'

  const rows = businesses.map(b => [
    csvField(exportStatus),
    csvField(b.name),
    csvField(b.address),
    csvField(b.category),
    csvField(b.googlePrimaryType ?? ''),
    csvField((b.googleTypes ?? []).join('; ')),
    csvField(b.rating),
    csvField(b.reviewCount),
    csvField(b.placeId),
    csvField(b.lat ?? ''),
    csvField(b.lng ?? ''),
    csvField(b.matchReason ?? ''),
    csvField((b.distance / 1000).toFixed(2)),
    csvField(dateOnly),
    csvField(b.phone ?? ''),
    csvField(b.website ?? ''),
  ].join(','))

  return [CSV_HEADERS.join(','), ...rows].join('\r\n')
}

export function exportAsJSON(
  businesses: ExportableBusiness[],
  importDate: string,
  meta?: ExportMetadata
): string {
  const items = businesses.map(b => ({
    name: b.name,
    address: b.address,
    category: b.category,
    systemCategory: b.systemCategory ?? null,
    googlePrimaryType: b.googlePrimaryType ?? null,
    googleTypes: b.googleTypes ?? [],
    rating: b.rating,
    reviewCount: b.reviewCount,
    googlePlaceId: b.placeId,
    lat: b.lat ?? null,
    lng: b.lng ?? null,
    matchReason: b.matchReason ?? null,
    distanceKm: +(b.distance / 1000).toFixed(2),
    phone: b.phone ?? null,
    website: b.website ?? null,
    importDate,
  }))

  if (meta) {
    return JSON.stringify(
      { status: meta.status, completedAt: meta.completedAt, city: meta.city, businesses: items },
      null,
      2
    )
  }

  return JSON.stringify(items, null, 2)
}

/* -------------------------------------------------------------------------- */
/*  Post-ENRICHMENT export — the full picture the acquisition engine produced  */
/* -------------------------------------------------------------------------- */

export interface EnrichedFeaturedItem {
  name: string
  description?: string
  price?: string
  source?: string
}

export interface EnrichedOffer {
  name: string
  type?: string
  value: string
  terms?: string
  rationale?: string | null
}

export interface EnrichedContactMethod {
  type: string
  value: string
  verified?: boolean
}

/**
 * Everything the enrichment step generated for one business — the rich, "mega"
 * record. Optional throughout so a failed/partial enrichment still exports the
 * columns it does have.
 */
export interface EnrichedExportBusiness {
  businessId: string
  name: string
  category?: string | null
  systemCategory?: string | null
  town?: string | null
  city?: string | null
  rating?: number | null
  reviewCount?: number | null
  website?: string | null
  claimed?: boolean
  confidence?: number | null
  flags?: string[]
  tagline?: string | null
  description?: string | null
  featuredItems?: EnrichedFeaturedItem[]
  offers?: EnrichedOffer[]
  primaryEmail?: string | null
  emails?: string[]
  phone?: string | null
  whatsapp?: string | null
  instagram?: string | null
  facebook?: string | null
  contactMethods?: EnrichedContactMethod[]
  insightSummary?: string | null
  signatureItems?: string[]
  strengths?: string[]
  /** Individual, tracked launch-pack scan URLs (one per printed material). */
  qr?: { window?: string; table?: string; counter?: string; review?: string } | null
  /** Signed Present-Mode demo link (same page the claim email "See your listing come alive" opens). */
  demoUrl?: string | null
  failed?: boolean
}

// Append-only — do not reorder existing columns (spreadsheets/scripts rely on order).
const ENRICH_CSV_HEADERS = [
  'Export Status',
  'Business ID',
  'Name',
  'Category',
  'System Category',
  'Town',
  'City',
  'Rating',
  'Reviews',
  'Claimed',
  'Confidence',
  'Flags',
  'Tagline',
  'Description',
  'Featured Item Count',
  'Featured Items',
  'Offer Count',
  'Suggested Offers',
  'Primary Email',
  'All Emails',
  'Phone',
  'WhatsApp',
  'Instagram',
  'Facebook',
  'Website',
  'QR — Window Sticker',
  'QR — Table Tent',
  'QR — Counter Display',
  'QR — Review Card',
  'Demo (Present Mode) URL',
  'Insight Summary',
  'Signature Items',
  'Strengths',
  'Enriched Date',
]

/** "Grilled Salmon (£14.50) — pan-seared with greens" for a featured item. */
function formatFeaturedItem(it: EnrichedFeaturedItem): string {
  const price = it.price ? ` (${it.price})` : ''
  const desc = it.description ? ` — ${it.description}` : ''
  return `${it.name}${price}${desc}`
}

/** "2-4-1 Cocktails: Buy one get one free — 5-7pm daily (rationale...)". */
function formatOffer(o: EnrichedOffer): string {
  const terms = o.terms ? ` — ${o.terms}` : ''
  const why = o.rationale ? ` (${o.rationale})` : ''
  return `${o.name}: ${o.value}${terms}${why}`
}

export function exportEnrichmentAsCSV(
  businesses: EnrichedExportBusiness[],
  completedAt: string,
  meta?: ExportMetadata
): string {
  const dateOnly = completedAt.split('T')[0]
  const partial = meta?.status === 'cancelled'

  const rows = businesses.map(b => {
    const status = b.failed ? 'enrich-failed' : partial ? 'enriched-partial' : 'enriched'
    const featured = (b.featuredItems ?? []).map(formatFeaturedItem).join(' | ')
    const offers = (b.offers ?? []).map(formatOffer).join(' | ')
    return [
      csvField(status),
      csvField(b.businessId),
      csvField(b.name),
      csvField(b.category ?? ''),
      csvField(b.systemCategory ?? ''),
      csvField(b.town ?? ''),
      csvField(b.city ?? ''),
      csvField(b.rating ?? ''),
      csvField(b.reviewCount ?? ''),
      csvField(b.claimed == null ? '' : b.claimed ? 'yes' : 'no'),
      csvField(b.confidence ?? ''),
      csvField((b.flags ?? []).join('; ')),
      csvField(b.tagline ?? ''),
      csvField(b.description ?? ''),
      csvField(b.featuredItems?.length ?? 0),
      csvField(featured),
      csvField(b.offers?.length ?? 0),
      csvField(offers),
      csvField(b.primaryEmail ?? ''),
      csvField((b.emails ?? []).join('; ')),
      csvField(b.phone ?? ''),
      csvField(b.whatsapp ?? ''),
      csvField(b.instagram ?? ''),
      csvField(b.facebook ?? ''),
      csvField(b.website ?? ''),
      csvField(b.qr?.window ?? ''),
      csvField(b.qr?.table ?? ''),
      csvField(b.qr?.counter ?? ''),
      csvField(b.qr?.review ?? ''),
      csvField(b.demoUrl ?? ''),
      csvField(b.insightSummary ?? ''),
      csvField((b.signatureItems ?? []).join('; ')),
      csvField((b.strengths ?? []).join('; ')),
      csvField(dateOnly),
    ].join(',')
  })

  return [ENRICH_CSV_HEADERS.join(','), ...rows].join('\r\n')
}

export function exportEnrichmentAsJSON(
  businesses: EnrichedExportBusiness[],
  completedAt: string,
  meta?: ExportMetadata
): string {
  const payload = {
    kind: 'enrichment',
    status: meta?.status ?? 'complete',
    completedAt,
    city: meta?.city ?? null,
    count: businesses.length,
    businesses,
  }
  return JSON.stringify(payload, null, 2)
}

/**
 * Trigger a browser file download from a string.
 * Creates a temporary <a> element, clicks it, then removes it.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Build a filename with city, timestamp, and optional cancelled suffix.
 * Example: qwikker-import-bournemouth-2026-02-18_21-07.csv
 *          qwikker-import-bournemouth-2026-02-18_21-07-CANCELLED.csv
 *          qwikker-enrichment-bournemouth-2026-02-18_21-07.csv
 */
export function buildExportFilename(
  city: string,
  completedAt: string,
  ext: 'csv' | 'json',
  cancelled = false,
  kind: 'import' | 'enrichment' = 'import'
): string {
  const safeCity = city.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const dt = new Date(completedAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const timestamp = `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}_${pad(dt.getHours())}-${pad(dt.getMinutes())}`
  const suffix = cancelled ? '-CANCELLED' : ''
  return `qwikker-${kind}-${safeCity}-${timestamp}${suffix}.${ext}`
}
