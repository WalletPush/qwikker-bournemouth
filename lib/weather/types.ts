/**
 * City weather snapshot for home + chat (HQ OpenWeather One Call).
 */

export type WeatherIconKey =
  | 'clear'
  | 'clear_night'
  | 'partly_cloudy'
  | 'partly_cloudy_night'
  | 'cloudy'
  | 'rain'
  | 'drizzle'
  | 'thunder'
  | 'snow'
  | 'fog'

export interface CityWeather {
  city: string
  tempC: number
  /** Rounded display temp, e.g. 18 */
  tempDisplay: number
  /** Short label e.g. "Sunny", "Rain" */
  label: string
  /** Conversational phrase e.g. "nice and sunny" */
  feelPhrase: string
  iconKey: WeatherIconKey
  /** OpenWeather condition id */
  conditionId: number
  isDay: boolean
  fetchedAt: string
}

export interface HomeWeatherMeta {
  tempDisplay: number
  label: string
  feelPhrase: string
  iconKey: WeatherIconKey
  isDay: boolean
}
