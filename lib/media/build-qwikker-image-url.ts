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

export interface CssFramingStyle {
  objectFit: 'cover' | 'contain'
  objectPosition: string
  transform?: string
  transformOrigin?: string
}

/**
 * Build a Cloudinary delivery URL from source URL + presentation metadata.
 * Non-Cloudinary URLs are returned unchanged.
 *
 * Framing model (must match MediaFramingEditor):
 * - contain → non-cropping limit + CSS object-contain
 * - cover + auto → Cloudinary smart fill (CSS cannot do subject detect)
 * - cover + manual/centre → sized uncropped derivative; CSS object-position + zoom
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
  const zoom = clampZoom(media.zoom)
  const transforms: string[] = ['f_auto', 'q_auto:good']

  if (media.fit === 'contain') {
    // Fit inside box — never crop edges (text / finished artwork)
    transforms.push(`c_limit`, `w_${spec.width}`, `h_${spec.height}`)
  } else if (usesCssFraming(media)) {
    // Manual / centre: CSS owns crop; deliver enough pixels for zoom
    const deliveryW = Math.round(spec.width * zoom)
    const deliveryH = Math.round(spec.height * zoom)
    transforms.push(`c_limit`, `w_${deliveryW}`, `h_${deliveryH}`)
  } else {
    // Auto (default): Cloudinary subject-aware fill
    transforms.push(`c_fill`, `w_${spec.width}`, `h_${spec.height}`, `g_auto`)
  }

  return injectCloudinaryTransform(url, transforms.join(','))
}

/** True when public presentation must mirror the editor CSS path. */
export function usesCssFraming(
  media: MediaPresentation | string | null | undefined
): boolean {
  if (!media || typeof media === 'string') return false
  if (media.fit === 'contain') return true
  return media.gravity_mode === 'manual' || media.gravity_mode === 'centre'
}

/** CSS object-position from focal (editor + public cards). */
export function cssObjectPosition(media: MediaPresentation | null | undefined): string {
  if (!media || media.fit === 'contain') return 'center'
  if (media.gravity_mode === 'manual' && media.focal_x != null && media.focal_y != null) {
    return `${clamp01(Number(media.focal_x)) * 100}% ${clamp01(Number(media.focal_y)) * 100}%`
  }
  return 'center'
}

export function cssCoverZoom(media: MediaPresentation | null | undefined): number {
  if (!media || media.fit === 'contain') return 1
  return clampZoom(media.zoom)
}

/** Shared img style — same math as MediaFramingEditor previews. */
export function cssFramingStyle(
  media: MediaPresentation | null | undefined
): CssFramingStyle {
  const objectFit = media?.fit === 'contain' ? 'contain' : 'cover'
  const objectPosition = cssObjectPosition(media)
  const zoom = cssCoverZoom(media)
  if (zoom > 1) {
    return {
      objectFit,
      objectPosition,
      transform: `scale(${zoom})`,
      transformOrigin: objectPosition,
    }
  }
  return { objectFit, objectPosition }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5
  return Math.min(1, Math.max(0, n))
}

function clampZoom(zoom: number | null | undefined): number {
  const z = Number(zoom)
  if (!Number.isFinite(z) || z <= 0) return 1
  return Math.min(5, Math.max(1, z))
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
