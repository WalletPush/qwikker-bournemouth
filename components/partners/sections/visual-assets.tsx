'use client'

import type { LucideIcon } from 'lucide-react'

export function PartnerIcon({
  icon: Icon,
  className = '',
}: {
  icon: LucideIcon
  className?: string
}) {
  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--p-border)] bg-[var(--p-accent-dim)] ${className}`}
    >
      <Icon className="h-5 w-5 text-[var(--p-accent)]" strokeWidth={1.75} aria-hidden />
    </div>
  )
}

/** Cinematic stills for narrative sections. */
export const PARTNERS_IMG = {
  /** Hero — Q partner overlooking city + network globe */
  hero: '/partners/hero-city-globe.png',
  heroFigure: '/partners/hero-city-globe.png',
  dawnShift:
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
  networkGrid: '/partners/infrastructure-network.png',
  jobEcosystem: '/partners/job-ecosystem.png',
  territoryMap: '/partners/exclusive-territory.png',
  aiFace:
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1600&q=80',
  relationships:
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1600&q=80',
  hourglass: '/partners/hourglass-city.png',
  hourglassCity: '/partners/hourglass-city.png',
  skylineNight:
    'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80',
  scaleGrowth: '/partners/scale-growth.png',
  visionWindow:
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1600&q=80',
  summit: '/partners/qualification-city-office.png',
  beacon:
    'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=80',
  earth:
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
} as const

/** Equirectangular maps for the cinematic rotating globe. */
export const PARTNERS_EARTH_DAY_MAP =
  'https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-blue-marble.jpg'

export const PARTNERS_EARTH_NIGHT_MAP =
  'https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-night.jpg'

export const PARTNERS_EARTH_IMG = PARTNERS_IMG.earth
export const PARTNERS_EARTH_CLOSE_IMG = PARTNERS_IMG.skylineNight
export const PARTNERS_CITY_NIGHT_IMG = PARTNERS_IMG.skylineNight
export const PARTNERS_TRAINING_IMG = PARTNERS_IMG.relationships
