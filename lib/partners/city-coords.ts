/**
 * Fallback lat/lng for known live markets when franchise_crm_configs
 * has no coordinates. Keep in sync with seeded partner_markets hubs.
 */
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  alicante: { lat: 38.3452, lng: -0.481 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  bali: { lat: -8.4095, lng: 115.1889 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  berlin: { lat: 52.52, lng: 13.405 },
  bournemouth: { lat: 50.722, lng: -1.8667 },
  brighton: { lat: 50.8225, lng: -0.1372 },
  calgary: { lat: 51.0447, lng: -114.0719 },
  chicago: { lat: 41.8781, lng: -87.6298 },
  cornwall: { lat: 50.266, lng: -5.0527 },
  'costa-blanca': { lat: 38.5412, lng: -0.1225 },
  dallas: { lat: 32.7767, lng: -96.797 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  'hong-kong': { lat: 22.3193, lng: 114.1694 },
  istanbul: { lat: 41.0082, lng: 28.9784 },
  jakarta: { lat: -6.2088, lng: 106.8456 },
  kefalonia: { lat: 38.1754, lng: 20.4889 },
  'koh-samui': { lat: 9.512, lng: 100.0136 },
  'las-vegas': { lat: 36.1699, lng: -115.1398 },
  london: { lat: 51.5074, lng: -0.1278 },
  'los-angeles': { lat: 34.0522, lng: -118.2437 },
  madrid: { lat: 40.4168, lng: -3.7038 },
  melbourne: { lat: -37.8136, lng: 144.9631 },
  'mexico-city': { lat: 19.4326, lng: -99.1332 },
  miami: { lat: 25.7617, lng: -80.1918 },
  missoula: { lat: 46.8721, lng: -113.994 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  'new-york': { lat: 40.7128, lng: -74.006 },
  nyc: { lat: 40.7128, lng: -74.006 },
  newport: { lat: 41.4901, lng: -71.3128 },
  paris: { lat: 48.8566, lng: 2.3522 },
  riyadh: { lat: 24.7136, lng: 46.6753 },
  'san-francisco': { lat: 37.7749, lng: -122.4194 },
  'sao-paulo': { lat: -23.5505, lng: -46.6333 },
  seoul: { lat: 37.5665, lng: 126.978 },
  shrewsbury: { lat: 52.7073, lng: -2.7544 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  southampton: { lat: 50.9097, lng: -1.4044 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  zanzibar: { lat: -6.1659, lng: 39.199 },
}

export function resolveCityCoords(
  citySlug: string,
  lat?: number | null,
  lng?: number | null
): { lat: number; lng: number } | null {
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat: Number(lat), lng: Number(lng) }
  }
  return CITY_COORDS[citySlug] || null
}
