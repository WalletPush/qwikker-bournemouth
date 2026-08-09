'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { buildQwikkerImageUrl, cssObjectPosition } from '@/lib/media/build-qwikker-image-url'
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
 * For contain (Show whole image): prefer original URL + CSS object-contain so
 * finished graphics with text are never edge-cropped by a stale CDN transform.
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
  const transformed = isContain ? null : buildQwikkerImageUrl(presentation, preset)
  const desiredSrc = (isContain ? original : transformed) || original

  const [src, setSrc] = useState<string | null>(desiredSrc)

  // Keep src in sync when framing / hero pointer changes (critical after Save framing)
  useEffect(() => {
    setSrc(desiredSrc)
  }, [desiredSrc])

  if (!src || !original) return null

  const objectFit = isContain ? 'contain' : 'cover'
  const objectPosition = cssObjectPosition(presentation)
  const imgClass = `${fill ? 'absolute inset-0 h-full w-full' : ''} ${className}`

  // Contain + local / fallback: always plain img with CSS (reliable for text graphics)
  const usePlainImg =
    isContain || src.startsWith('/') || !src.includes('res.cloudinary.com') || src === original

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
          style={{ objectFit, objectPosition }}
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
          style={{ objectFit, objectPosition }}
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
          style={{ objectFit, objectPosition }}
          sizes={sizes}
          priority={priority}
          onError={() => setSrc(original)}
        />
      )}
    </div>
  )
}
