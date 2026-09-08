import { NextResponse } from 'next/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { getCityWeather } from '@/lib/weather/get-city-weather'
import { weatherWelcomeLine } from '@/lib/weather/copy'
import { getCityDisplayName } from '@/lib/utils/city-detection'

/**
 * GET /api/weather/current — current weather for the request's franchise city.
 * Used by chat welcome; home feed embeds weather in its own payload.
 */
export async function GET() {
  try {
    const city = await getFranchiseCityFromRequest()
    const weather = await getCityWeather(city)
    if (!weather) {
      return NextResponse.json({ success: true, weather: null })
    }

    const cityDisplayName = getCityDisplayName(city)
    return NextResponse.json({
      success: true,
      weather: {
        tempDisplay: weather.tempDisplay,
        label: weather.label,
        feelPhrase: weather.feelPhrase,
        iconKey: weather.iconKey,
        isDay: weather.isDay,
      },
      welcomeLine: weatherWelcomeLine(
        {
          feelPhrase: weather.feelPhrase,
          tempDisplay: weather.tempDisplay,
          iconKey: weather.iconKey,
        },
        cityDisplayName,
        null
      ),
    })
  } catch (error) {
    console.error('[api/weather/current]', error)
    return NextResponse.json({ success: false, weather: null }, { status: 500 })
  }
}
