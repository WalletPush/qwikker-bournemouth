'use client'

import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudSnow,
  CloudFog,
} from 'lucide-react'
import type { WeatherIconKey } from '@/lib/weather/types'

const ICON_MAP = {
  clear: Sun,
  clear_night: Moon,
  partly_cloudy: CloudSun,
  partly_cloudy_night: CloudMoon,
  cloudy: Cloud,
  rain: CloudRain,
  drizzle: CloudDrizzle,
  thunder: CloudLightning,
  snow: CloudSnow,
  fog: CloudFog,
} as const satisfies Record<WeatherIconKey, typeof Sun>

interface WeatherIconProps {
  iconKey: WeatherIconKey
  className?: string
}

export function WeatherIcon({ iconKey, className = 'h-5 w-5' }: WeatherIconProps) {
  const Icon = ICON_MAP[iconKey] || Cloud
  return <Icon className={className} aria-hidden="true" />
}
