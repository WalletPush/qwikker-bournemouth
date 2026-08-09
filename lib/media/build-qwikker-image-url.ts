import type { MediaPresentation, QwikkerImagePreset } from './types'

interface PresetSpec {
  width: number
  height: number
}

/** Explicit w×h — avoids `ar_16:10` colon issues in some delivery paths. */
const PRESETS: Record<QwikkerImagePreset, PresetSpec> = {
  card_mobile: { width: 800, height: 600 },
  card_desktop: { width: 1200, height: 750 },
  detail_hero: { width: 1600, height: 900 },
  offer: { width: 1000, height: 562 },
  category: { width: 800, height: 600 },
  wallet: { width: 640, height: 246 },
}

/**
 * Build a Cloudinary delivery URL from source URL + presentation metadata.
 * Non-Cloudinary URLs are returned unchanged.
 */
export function buildQwikkerImageUrl(
  presentation: MediaPresentation | string | null | undefined,
  preset: QwikkerImagePreset = 'card_desktop'
): string | null {
  if (!presentation) return null
  const media: MediaPresentation =
    typeof presentation === 'string' ? { source_url: presentation } : presentation
  const url = media.source_url
  if (!url) return null
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url

  const spec = PRESETS[preset]
  const zoom = media.zoom && media.zoom > 0 ? media.zoom : 1
  const transforms: string[] = ['f_auto', 'q_auto:good']

  if (media.fit === 'contain') {
    // Pad (never crop edges) — critical for finished graphics with text
    transforms.push(`c_pad`, `w_${spec.width}`, `h_${spec.height}`, `b_rgb:0B1220`)
  } else {
    transforms.push(`c_fill`, `w_${spec.width}`, `h_${spec.height}`)

    if (media.gravity_mode === 'manual' && media.focal_x != null && media.focal_y != null) {
      const fx = clamp01(Number(media.focal_x))
      const fy = clamp01(Number(media.focal_y))
      // Relative 0–1 coords with g_xy_center
      transforms.push('g_xy_center', `x_${fx.toFixed(4)}`, `y_${fy.toFixed(4)}`)
    } else if (media.gravity_mode === 'centre') {
      transforms.push('g_center')
    } else {
      transforms.push('g_auto')
    }

    if (zoom > 1) {
      transforms.push(`z_${Math.min(5, zoom).toFixed(2)}`)
    }
  }

  return injectCloudinaryTransform(url, transforms.join(','))
}

/** CSS object-position from focal (for editor / non-Cloudinary fallback). */
export function cssObjectPosition(media: MediaPresentation | null | undefined): string {
  if (!media || media.fit === 'contain') return 'center'
  if (media.gravity_mode === 'manual' && media.focal_x != null && media.focal_y != null) {
    return `${clamp01(Number(media.focal_x)) * 100}% ${clamp01(Number(media.focal_y)) * 100}%`
  }
  return 'center'
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5
  return Math.min(1, Math.max(0, n))
}

/** Strip prior transform segment and inject a fresh one after /upload/. */
function injectCloudinaryTransform(url: string, transform: string): string {
  const [base, rest] = url.split('/upload/')
  if (!rest) return url

  const segments = rest.split('/').filter(Boolean)
  let i = 0

  // Drop versioned or unversioned transform folders (commas or known prefixes)
  while (i < segments.length) {
    const seg = segments[i]
    const isVersion = /^v\d+$/.test(seg)
    const isTransform =
      seg.includes(',') ||
      /^(f_|q_|c_|w_|h_|g_|ar_|b_|z_|e_|dpr_|fl_)/.test(seg)
    if (isTransform) {
      i += 1
      continue
    }
    if (isVersion) break
    // First non-transform, non-version segment is the public id root
    break
  }

  const path = segments.slice(i).join('/')
  if (!path) return url
  return `${base}/upload/${transform}/${path}`
}

export function presentationFromAsset(asset: {
  id?: string
  source_url: string
  focal_x?: number | null
  focal_y?: number | null
  zoom?: number | null
  fit?: string | null
  gravity_mode?: string | null
}): MediaPresentation {
  return {
    id: asset.id,
    source_url: asset.source_url,
    focal_x: asset.focal_x ?? null,
    focal_y: asset.focal_y ?? null,
    zoom: asset.zoom ?? 1,
    fit: asset.fit === 'contain' ? 'contain' : 'cover',
    gravity_mode:
      asset.gravity_mode === 'manual' || asset.gravity_mode === 'centre'
        ? asset.gravity_mode
        : 'auto',
  }
}
