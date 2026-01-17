/**
 * Centralized Tenant City Resolution
 * 
 * SECURITY GOALS:
 * - Never default to any city implicitly on production subdomains
 * - City must be server-derived from hostname on real subdomains
 * - Allow explicit city override ONLY on fallback hosts (localhost, vercel preview, etc.)
 * - On real subdomains, reject ?city= overrides (403)
 * 
 * USAGE:
 * - Production: bournemouth.qwikker.com → city='bournemouth' (from hostname)
 * - Dev: localhost:3000?city=bournemouth → city='bournemouth' (query override allowed)
 * - Dev: localhost:3000 with DEV_DEFAULT_CITY=bournemouth → city='bournemouth' (env fallback)
 */

type CityResolutionSuccess = {
  ok: true
  city: string
  source: 'hostname' | 'query' | 'env'
  hostname: string
  fallback: boolean
}

type CityResolutionFailure = {
  ok: false
  status: 400 | 403
  error: string
}

export type CityResolutionResult = CityResolutionSuccess | CityResolutionFailure

/**
 * Check if hostname is a fallback/development host where city overrides are allowed
 */
export function isFallbackHost(hostname: string): boolean {
  const host = (hostname || '').toLowerCase()
  return (
    host.includes('localhost') ||
    host.endsWith('.vercel.app') ||
    host === 'app.qwikker.com' ||
    host === 'qwikkerdashboard-theta.vercel.app'
  )
}

/**
 * Normalize city to lowercase, trimmed format
 */
export function normalizeCity(input: string): string {
  return input.trim().toLowerCase()
}

/**
 * Resolve the city for the current request with multi-tenant security
 * 
 * @param request - The incoming request object
 * @param opts.allowQueryOverride - If true, allows ?city= on fallback hosts (default: false)
 * @returns City resolution result with city string or error
 * 
 * @example
 * // Production subdomain
 * resolveRequestCity(request) // { ok: true, city: 'bournemouth', source: 'hostname' }
 * 
 * @example
 * // Localhost with query param
 * resolveRequestCity(request, { allowQueryOverride: true }) 
 * // { ok: true, city: 'bournemouth', source: 'query' }
 * 
 * @example
 * // Localhost without city
 * resolveRequestCity(request) 
 * // { ok: false, status: 400, error: '...' }
 */
export async function resolveRequestCity(
  request: Request,
  opts?: { allowQueryOverride?: boolean }
): Promise<CityResolutionResult> {
  const url = new URL(request.url)
  const hostname = (request.headers.get('host') || '').toLowerCase()

  // Step 1: Try to derive city from hostname (e.g., bournemouth.qwikker.com)
  // IMPORTANT: getCityFromHostname should return empty string/null if city can't be detected
  const { getCityFromHostname } = await import('@/lib/utils/city-detection')
  
  let hostCityRaw: string
  try {
    hostCityRaw = await getCityFromHostname(hostname)
  } catch (error) {
    // getCityFromHostname throws on invalid franchise - treat as no city detected
    hostCityRaw = ''
  }
  
  const hostCity = hostCityRaw ? normalizeCity(hostCityRaw) : ''

  // Check if this is a fallback host (localhost, vercel preview, etc.)
  const fallback = isFallbackHost(hostname)

  // Step 2: Check for query parameter override (only allowed on fallback hosts)
  const allowOverride = Boolean(opts?.allowQueryOverride) && fallback
  const queryCityRaw = url.searchParams.get('city') || ''
  const queryCity = queryCityRaw ? normalizeCity(queryCityRaw) : ''

  // SECURITY: Never accept query override on real subdomains
  // This prevents users from spoofing city on production URLs
  if (!fallback && queryCity) {
    return {
      ok: false,
      status: 403,
      error: 'City override is not allowed on this host. Use the correct subdomain (e.g., bournemouth.qwikker.com).'
    }
  }

  // Step 3: If hostname provided a city, that's the authoritative source
  // (This works on both production subdomains AND fallback hosts with proper DNS)
  if (hostCity) {
    return {
      ok: true,
      city: hostCity,
      source: 'hostname',
      hostname,
      fallback
    }
  }

  // Step 4: Fallback host - allow query parameter override if explicitly enabled
  if (allowOverride && queryCity) {
    console.log(`[Tenant City] Using query override: ?city=${queryCity} on ${hostname}`)
    return {
      ok: true,
      city: queryCity,
      source: 'query',
      hostname,
      fallback
    }
  }

  // Step 5: Fallback host - optional environment variable default (developer convenience)
  if (fallback) {
    const envCityRaw = process.env.DEV_DEFAULT_CITY || ''
    const envCity = envCityRaw ? normalizeCity(envCityRaw) : ''
    
    if (envCity) {
      console.log(`[Tenant City] Using DEV_DEFAULT_CITY: ${envCity} on ${hostname}`)
      return {
        ok: true,
        city: envCity,
        source: 'env',
        hostname,
        fallback
      }
    }
  }

  // Step 6: No city detected - return helpful error
  const error = fallback
    ? 'No city detected. On localhost/preview, pass ?city=yourCity (e.g., ?city=bournemouth) or set DEV_DEFAULT_CITY in .env.local'
    : 'No city detected from hostname. Use a city subdomain like bournemouth.qwikker.com'

  console.error(`[Tenant City] Resolution failed. Hostname: ${hostname}, Fallback: ${fallback}`)

  return {
    ok: false,
    status: 400,
    error
  }
}

/**
 * Helper to extract city from a successful resolution or throw
 * Useful for routes that want to fail fast
 */
export function extractCityOrThrow(result: CityResolutionResult): string {
  if (result.ok) {
    return result.city
  }
  throw new Error(result.error)
}
