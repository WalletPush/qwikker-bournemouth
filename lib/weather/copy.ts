import type { WeatherIconKey } from '@/lib/weather/types'

/**
 * Map OpenWeather condition codes → our icon keys + copy.
 * @see https://openweathermap.org/weather-conditions
 */
export function mapOpenWeatherCondition(
  conditionId: number,
  description: string,
  isDay: boolean
): { iconKey: WeatherIconKey; label: string; feelPhrase: string } {
  const desc = (description || '').toLowerCase()

  if (conditionId >= 200 && conditionId < 300) {
    return { iconKey: 'thunder', label: 'Stormy', feelPhrase: 'a bit stormy' }
  }
  if (conditionId >= 300 && conditionId < 400) {
    return { iconKey: 'drizzle', label: 'Drizzle', feelPhrase: 'a light drizzle' }
  }
  if (conditionId >= 500 && conditionId < 600) {
    return { iconKey: 'rain', label: 'Rain', feelPhrase: 'rainy' }
  }
  if (conditionId >= 600 && conditionId < 700) {
    return { iconKey: 'snow', label: 'Snow', feelPhrase: 'snowy' }
  }
  if (conditionId >= 700 && conditionId < 800) {
    return { iconKey: 'fog', label: 'Misty', feelPhrase: 'a bit misty' }
  }
  if (conditionId === 800) {
    return {
      iconKey: isDay ? 'clear' : 'clear_night',
      label: isDay ? 'Sunny' : 'Clear',
      feelPhrase: isDay ? 'nice and sunny' : 'clear',
    }
  }
  if (conditionId === 801 || conditionId === 802) {
    return {
      iconKey: isDay ? 'partly_cloudy' : 'partly_cloudy_night',
      label: 'Partly cloudy',
      feelPhrase: 'partly cloudy',
    }
  }
  if (conditionId === 803 || conditionId === 804) {
    return { iconKey: 'cloudy', label: 'Cloudy', feelPhrase: 'cloudy' }
  }

  // Fallback from description text
  if (desc.includes('rain')) return { iconKey: 'rain', label: 'Rain', feelPhrase: 'rainy' }
  if (desc.includes('cloud')) return { iconKey: 'cloudy', label: 'Cloudy', feelPhrase: 'cloudy' }
  if (desc.includes('clear') || desc.includes('sun')) {
    return {
      iconKey: isDay ? 'clear' : 'clear_night',
      label: isDay ? 'Sunny' : 'Clear',
      feelPhrase: isDay ? 'nice and sunny' : 'clear',
    }
  }

  return { iconKey: 'cloudy', label: 'Cloudy', feelPhrase: 'mild' }
}

/** Soft home/chat subtitle nudge — never invent venues that may not exist. */
export function weatherAwareSubtitle(
  baseSubtitle: string,
  weather: { feelPhrase: string; iconKey: WeatherIconKey; tempDisplay: number } | null,
  cityDisplayName: string
): string {
  if (!weather) return baseSubtitle

  const { iconKey, feelPhrase, tempDisplay } = weather

  if (iconKey === 'rain' || iconKey === 'drizzle' || iconKey === 'thunder') {
    return `It's ${feelPhrase} in ${cityDisplayName} — perfect excuse for somewhere cosy.`
  }
  if (iconKey === 'snow') {
    return `It's ${feelPhrase} in ${cityDisplayName} — warm drinks and indoor vibes sound good.`
  }
  if (iconKey === 'clear' && tempDisplay >= 16) {
    return `It's ${feelPhrase} in ${cityDisplayName} — lovely evening to get out.`
  }
  if (iconKey === 'clear' || iconKey === 'partly_cloudy') {
    return `It's ${feelPhrase} in ${cityDisplayName} (${tempDisplay}°).`
  }
  if (tempDisplay <= 8) {
    return `It's ${tempDisplay}° and ${feelPhrase} in ${cityDisplayName} — somewhere warm might hit the spot.`
  }

  return `It's ${feelPhrase} in ${cityDisplayName} (${tempDisplay}°).`
}

export function weatherWelcomeLine(
  weather: { feelPhrase: string; tempDisplay: number; iconKey: WeatherIconKey } | null,
  cityDisplayName: string,
  userName: string | null
): string | null {
  if (!weather) return null
  const hey = userName ? `Hey ${userName}` : 'Hey'
  const softNudge =
    weather.iconKey === 'rain' || weather.iconKey === 'drizzle' || weather.iconKey === 'thunder'
      ? ' Fancy somewhere cosy?'
      : weather.iconKey === 'clear' && weather.tempDisplay >= 16
        ? ' Nice one for getting out and about.'
        : ''

  return `${hey}, it's currently ${weather.feelPhrase} in ${cityDisplayName} (${weather.tempDisplay}°).${softNudge}`
}
