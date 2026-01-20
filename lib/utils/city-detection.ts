/**
 * City Detection & Multi-Tenant Hostname Resolution
 * 
 * Safely derives franchise city from hostname, preventing unauthorized access.
 * 
 * KEY SECURITY:
 * - Only allows localhost & Vercel domains in dev/preview
 * - All production domains must have valid franchise city subdomain (bournemouth.qwikker.com)
 * - Validates cities against franchise_crm_configs table
 * 
 * USAGE:
 * - getCityFromHostname('bournemouth.qwikker.com') => 'bournemouth'
 * - getCityFromHostname('localhost') => 'bournemouth' (dev fallback)
 * - getCityFromHostname('poole.qwikker.com') => 'poole' (if exists in DB)
 * - getCityFromHostname('random.qwikker.com') => Error (not in DB)
 */

import { createClient } from '@supabase/supabase-js'

export type FranchiseCity = 'bournemouth' | 'poole' | 'christchurch'

const defaultCity: FranchiseCity = 'bournemouth'

// Service role client for franchise lookups (server-side only)
// This is safe because it's only used for READ operations on franchise config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

// Validate city against database
async function isValidFranchiseCity(city: string): Promise<boolean> {
  if (!supabase) return false

  const { data, error } = await supabase
    .from('franchise_crm_configs')
    .select('city')
    .eq('city', city)
    .single()

  return !error && !!data
}

export interface GetCityOptions {
  allowUnsafeFallbacks?: boolean
}

export async function getCityFromHostname(
  hostname: string,
  opts?: GetCityOptions
): Promise<FranchiseCity> {
  const vercelEnv = process.env.VERCEL_ENV
  const isProd = vercelEnv === 'production'
  const cleanHost = hostname.toLowerCase().trim()
  const allowUnsafeFallbacks =
    opts?.allowUnsafeFallbacks ??
    (!isProd) // ✅ preview/dev: allow fallback; production: strict
  
  // Debug logging removed - was spamming console

  // ✅ Local dev convenience:
  // - localhost:3000
  // - bournemouth.localhost:3000 (works on most systems without /etc/hosts)
  // - 127.0.0.1
  if (cleanHost === 'localhost' || cleanHost.endsWith('.localhost') || cleanHost === '127.0.0.1') {
    const sub = cleanHost.endsWith('.localhost') ? cleanHost.split('.')[0] : null
    if (sub) {
      const isValid = await isValidFranchiseCity(sub)
      if (isValid) return sub as FranchiseCity
      // If someone tries random.localhost, keep dev smooth:
      if (allowUnsafeFallbacks) return defaultCity
      throw new Error(`Access denied: Unknown franchise subdomain '${sub}'`)
    }
    return defaultCity
  }

  // ✅ Vercel preview domains (your-project.vercel.app)
  // TEMPORARY: Always allow .vercel.app for testing
  if (cleanHost.endsWith('.vercel.app')) {
    return defaultCity
  }

  // If it's your root domain (qwikker.com) or common main subdomains:
  // In production you usually want these to go to marketing or a selector page,
  // NOT silently to Bournemouth.
  const parts = cleanHost.split('.')
  const subdomain = parts.length >= 3 ? parts[0] : null // bournemouth.qwikker.com => bournemouth; qwikker.com => null

  if (!subdomain) {
    if (allowUnsafeFallbacks) return defaultCity
    throw new Error(`Access denied: No franchise subdomain provided (${cleanHost})`)
  }

  // Main subdomains are NOT franchise cities (www/app/api)
  if (['www', 'app', 'api'].includes(subdomain)) {
    if (allowUnsafeFallbacks) return defaultCity
    throw new Error(`Access denied: Main host not allowed for city routes (${subdomain}.${parts.slice(1).join('.')})`)
  }

  // ✅ Real city subdomain must exist in DB
  const isValid = await isValidFranchiseCity(subdomain)
  if (!isValid) {
    console.error(`🚨 SECURITY: Unknown franchise subdomain blocked: ${subdomain}`)
    throw new Error(`Access denied: Unknown franchise subdomain '${subdomain}'`)
  }

  return subdomain as FranchiseCity
}

/**
 * ✅ Helper for server routes/components:
 * Derives city from the request headers (proxy-safe) and applies the same rules.
 */
export async function getCityFromRequestHeaders(headers: Headers, opts?: GetCityOptions) {
  const hostname = getCleanHostnameFromHeaders(headers)
  return getCityFromHostname(hostname, opts)
}

/**
 * Get city from Next.js request headers
 */
export async function getCityFromRequest(headers: Headers): Promise<FranchiseCity> {
  const host = headers.get('host') || ''
  return await getCityFromHostname(host)
}

/**
 * Extract clean hostname from various header formats
 * Handles: x-forwarded-host, host, port removal
 */
function getCleanHostnameFromHeaders(headers: Headers): string {
  const forwardedHost = headers.get('x-forwarded-host')
  const host = headers.get('host')
  const rawHost = forwardedHost || host || ''
  
  // Remove port if present
  const cleanHost = rawHost.split(':')[0].toLowerCase().trim()
  
  return cleanHost
}

/**
 * City display names for UI
 */
export const cityDisplayNames: Record<FranchiseCity, string> = {
  bournemouth: 'Bournemouth',
  poole: 'Poole',
  christchurch: 'Christchurch'
}

/**
 * Get display name for a city
 */
export function getCityDisplayName(city: FranchiseCity): string {
  return cityDisplayNames[city] || city
}

/**
 * Type guard to check if a string is a valid franchise city
 */
export function isFranchiseCity(city: string): city is FranchiseCity {
  return ['bournemouth', 'poole', 'christchurch'].includes(city.toLowerCase())
}

/**
 * Get all available franchise cities
 */
export function getAllFranchiseCities(): FranchiseCity[] {
  return ['bournemouth', 'poole', 'christchurch']
}

/**
 * Server-side helper to get current city from Next.js request
 * Throws error if city cannot be determined
 */
export async function getCurrentCityFromRequest(request: Request): Promise<FranchiseCity> {
  const url = new URL(request.url)
  return await getCityFromHostname(url.hostname)
}

/**
 * Validate that a business belongs to the current franchise city
 */
export function validateBusinessCity(businessCity: string, requiredCity: FranchiseCity): boolean {
  return businessCity.toLowerCase() === requiredCity.toLowerCase()
}

/**
 * Get city from various request objects
 */
export async function extractCityFromRequest(req: { headers: Headers } | Request): Promise<FranchiseCity> {
  if (req instanceof Request) {
    return getCurrentCityFromRequest(req)
  }
  return getCityFromRequest(req.headers)
}
