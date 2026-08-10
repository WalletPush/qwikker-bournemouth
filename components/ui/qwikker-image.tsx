'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  buildQwikkerImageUrl,
  cssCoverZoom,
  cssFramingStyle,
  usesCssFraming,
} from '@/lib/media/build-qwikker-image-url'
import type { MediaPresentation, QwikkerImagePreset } from '@/lib/media/types'
import { getBusinessImageSizes } from '@/lib/utils/optimize-image-url'

interface QwikkerImageProps {
  media?: MediaPresentation | string | null
  preset?: QwikkerImagePreset
  alt: string
  className?: string
  fill?: boolean
  width?: number
  height?: number
  priority?: boolean
  sizes?: string
  containBackdropClassName?: string
}

/**
 * Canonical image primitive. DB owns focal/fit intent.
 * Manual / centre / contain framing matches MediaFramingEditor (CSS on an
 * optimised, non-cropped Cloudinary derivative). Auto cover still uses
 * Cloudinary g_auto fill.
 */
export function QwikkerImage({
  media,
  preset = 'card_desktop',
  alt,
  className = '',
  fill = true,
  width,
  height,
  priority = false,
  sizes,
  containBackdropClassName = 'bg-slate-900',
}: QwikkerImageProps) {
  const presentation: MediaPresentation | null =
    !media ? null : typeof media === 'string' ? { source_url: media } : media

  const original = presentation?.source_url || null
  const isContain = presentation?.fit === 'contain'
  const transformed = buildQwikkerImageUrl(presentation, preset)
  const desiredSrc = transformed || original

  const [src, setSrc] = useState<string | null>(desiredSrc)

  // Keep src in sync when framing / hero pointer changes (critical after Save framing)
  useEffect(() => {
    setSrc(desiredSrc)
  }, [desiredSrc])

  if (!src || !original) return null

  const framing = cssFramingStyle(presentation)
  const zoom = cssCoverZoom(presentation)
  const needsCssFraming =
    usesCssFraming(presentation) || zoom > 1 || isContain
  const imgClass = `${fill ? 'absolute inset-0 h-full w-full' : ''} ${className}`

  // CSS framing path uses plain img (same as the admin editor) for reliable
  // object-position + scale. Auto-fill Cloudinary URLs can use next/image.
  const usePlainImg =
    needsCssFraming ||
    src.startsWith('/') ||
    !src.includes('res.cloudinary.com') ||
    src === original

  return (
    <div
      className={`relative overflow-hidden ${isContain ? containBackdropClassName : ''} ${fill ? 'h-full w-full' : ''}`}
    >
      {usePlainImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={imgClass}
          style={framing}
          loading={priority ? 'eager' : 'lazy'}
          onError={() => {
            if (src !== original) setSrc(original)
          }}
        />
      ) : fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={className}
          style={framing}
          sizes={sizes || getBusinessImageSizes(priority)}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setSrc(original)}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width || 800}
          height={height || 600}
          className={className}
          style={framing}
          sizes={sizes}
          priority={priority}
          onError={() => setSrc(original)}
        />
      )}
    </div>
  )
}
