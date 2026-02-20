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
 */
export function buildExportFilename(
  city: string,
  completedAt: string,
  ext: 'csv' | 'json',
  cancelled = false
): string {
  const safeCity = city.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const dt = new Date(completedAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const timestamp = `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}_${pad(dt.getHours())}-${pad(dt.getMinutes())}`
  const suffix = cancelled ? '-CANCELLED' : ''
  return `qwikker-import-${safeCity}-${timestamp}${suffix}.${ext}`
}
