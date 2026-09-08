import { unstable_cache } from 'next/cache'
import { getFranchiseConfig } from '@/lib/utils/franchise-config'
import { resolveCityCoords } from '@/lib/partners/city-coords'
import { mapOpenWeatherCondition } from '@/lib/weather/copy'
import type { CityWeather } from '@/lib/weather/types'

const CACHE_SECONDS = 20 * 60 // 20 minutes — weather doesn't need second-by-second

interface OpenWeatherCurrentResponse {
  weather?: Array<{ id: number; main: string; description: string; icon: string }>
  main?: { temp: number }
  sys?: { sunrise?: number; sunset?: number }
  dt?: number
}

interface OpenWeatherOneCallResponse {
  current?: {
    dt?: number
    temp?: number
    sunrise?: number
    sunset?: number
    weather?: Array<{ id: number; main: string; description: string; icon: string }>
  }
}

function getApiKey(): string | null {
  const key = process.env.OPENWEATHER_API_KEY?.trim()
  return key || null
}

function isDaytime(
  iconCode: string | undefined,
  sunrise?: number,
  sunset?: number,
  nowSec?: number
): boolean {
  if (iconCode?.endsWith('n')) return false
  if (iconCode?.endsWith('d')) return true
  if (sunrise && sunset && nowSec) {
    return nowSec >= sunrise && nowSec < sunset
  }
  return true
}

async function fetchOpenWeather(lat: number, lon: number, apiKey: string): Promise<CityWeather | null> {
  // Prefer One Call 3.0 (commercial One Call subscription). Fall back to 2.5 current.
  const oneCallUrl =
    `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}` +
    `&exclude=minutely,hourly,daily,alerts&units=metric&appid=${apiKey}`

  try {
    const res = await fetch(oneCallUrl, { next: { revalidate: CACHE_SECONDS } })
    if (res.ok) {
      const data = (await res.json()) as OpenWeatherOneCallResponse
      const current = data.current
      const w = current?.weather?.[0]
      if (current?.temp != null && w?.id != null) {
        const isDay = isDaytime(w.icon, current.sunrise, current.sunset, current.dt)
        const mapped = mapOpenWeatherCondition(w.id, w.description || w.main, isDay)
        const tempDisplay = Math.round(current.temp)
        return {
          city: '',
          tempC: current.temp,
          tempDisplay,
          label: mapped.label,
          feelPhrase: mapped.feelPhrase,
          iconKey: mapped.iconKey,
          conditionId: w.id,
          isDay,
          fetchedAt: new Date().toISOString(),
        }
      }
    } else if (res.status !== 401 && res.status !== 403) {
      console.warn('[weather] One Call failed:', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    console.warn('[weather] One Call error:', err)
  }

  const currentUrl =
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}` +
    `&units=metric&appid=${apiKey}`

  try {
    const res = await fetch(currentUrl, { next: { revalidate: CACHE_SECONDS } })
    if (!res.ok) {
      console.warn('[weather] Current weather failed:', res.status, await res.text().catch(() => ''))
      return null
    }
    const data = (await res.json()) as OpenWeatherCurrentResponse
    const w = data.weather?.[0]
    const temp = data.main?.temp
    if (temp == null || w?.id == null) return null

    const isDay = isDaytime(w.icon, data.sys?.sunrise, data.sys?.sunset, data.dt)
    const mapped = mapOpenWeatherCondition(w.id, w.description || w.main, isDay)
    return {
      city: '',
      tempC: temp,
      tempDisplay: Math.round(temp),
      label: mapped.label,
      feelPhrase: mapped.feelPhrase,
      iconKey: mapped.iconKey,
      conditionId: w.id,
      isDay,
      fetchedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.warn('[weather] Current weather error:', err)
    return null
  }
}

async function loadCityWeatherUncached(citySlug: string): Promise<CityWeather | null> {
  const apiKey = getApiKey()
  if (!apiKey) return null

  const config = await getFranchiseConfig(citySlug)
  const coords = resolveCityCoords(
    citySlug,
    (config as { lat?: number | null } | null)?.lat,
    (config as { lng?: number | null } | null)?.lng
  )
  if (!coords) {
    console.warn(`[weather] No coordinates for city: ${citySlug}`)
    return null
  }

  const weather = await fetchOpenWeather(coords.lat, coords.lng, apiKey)
  if (!weather) return null
  return { ...weather, city: citySlug }
}

/**
 * Cached current weather for a franchise city. Safe to call from RSC / route handlers.
 * Returns null if no API key, no coords, or provider error (UI should hide weather).
 */
export async function getCityWeather(citySlug: string): Promise<CityWeather | null> {
  const slug = citySlug.toLowerCase().trim()
  if (!slug) return null
  if (!getApiKey()) return null

  const cached = unstable_cache(
    () => loadCityWeatherUncached(slug),
    [`city-weather-v1-${slug}`],
    { revalidate: CACHE_SECONDS, tags: [`weather:${slug}`] }
  )

  try {
    return await cached()
  } catch (err) {
    console.warn('[weather] cache/load failed:', err)
    return null
  }
}
