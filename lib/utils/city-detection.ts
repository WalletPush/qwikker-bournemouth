/**
 * City detection utilities for franchise support
 * Detects city from URL subdomain for multi-city deployment
 */

import { isValidFranchiseCity } from './franchise-areas'

export type FranchiseCity = string // Now dynamic instead of hard-coded

type GetCityOptions = {
  /**
   * When true, allows main hosts (qwikker.com / www / app / api / vercel.app)
   * to fall back to a default city instead of throwing.
   * Use in DEV/STAGING only.
   */
  allowUnsafeFallbacks?: boolean
  defaultCity?: FranchiseCity
}

/**
 * Extract a clean hostname:
 * - prefers x-forwarded-host when present (proxy/CDN/Vercel)
 * - strips port (:3000)
 * - lowercases
 */
export function getCleanHostnameFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-host') || headers.get('host') || ''
  // x-forwarded-host can be a comma-separated list
  const raw = forwarded.split(',')[0].trim()
  return raw.split(':')[0].toLowerCase()
}

/**
 * Extract city from hostname/subdomain
 * Examples:
 * - bournemouth.qwikker.com -> 'bournemouth'
 * - calgary.qwikker.com -> 'calgary' 
 * - localhost:3000 -> 'bournemouth' (DEV ONLY)
 * - qwikker.com -> ERROR (PROD) or 'bournemouth' (DEV)
 */
export async function getCityFromHostname(
  hostname: string,
  opts: GetCityOptions = {}
): Promise<FranchiseCity> {
  const cleanHost = (hostname || '').split(',')[0].trim().split(':')[0].toLowerCase()

  const defaultCity = (opts.defaultCity ?? 'bournemouth') as FranchiseCity

  // Decide "safe fallbacks" by environment
  // CRITICAL: Use VERCEL_ENV, NOT NODE_ENV
  // On Vercel Preview, NODE_ENV='production' but VERCEL_ENV='preview'
  const vercelEnv = process.env.VERCEL_ENV // 'production' | 'preview' | 'development' | undefined
  const isProd = vercelEnv === 'production' // ✅ Only strict in actual production
  const allowUnsafeFallbacks =
    opts.allowUnsafeFallbacks ??
    (!isProd) // ✅ preview/dev: allow fallback; production: strict
  
  // 🔍 Temporary logging (remove after verifying)
  if (process.env.NODE_ENV !== 'production' || vercelEnv === 'preview') {
    console.log('🔍 City Detection Debug:', {
      hostname: cleanHost,
      VERCEL_ENV: vercelEnv,
      NODE_ENV: process.env.NODE_ENV,
      isProd,
      allowUnsafeFallbacks
    })
  }

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
  // Allow on preview deployments, but not on production
  if (cleanHost.endsWith('.vercel.app')) {
    // Always allow Vercel preview deployments (VERCEL_ENV=preview)
    if (vercelEnv === 'preview' || allowUnsafeFallbacks) return defaultCity
    throw new Error(`Access denied: vercel.app host not allowed in production (${cleanHost})`)
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
 * Get display name for city
 */
export function getCityDisplayName(city: FranchiseCity): string {
  const names: Record<FranchiseCity, string> = {
    bournemouth: 'Bournemouth',
    calgary: 'Calgary',
    london: 'London',
    paris: 'Paris'
  }
  return names[city]
}

/**
 * Get admin emails for a specific city
 * This is a simple configuration - can be moved to database later
 */
export function getAdminEmailsForCity(city: FranchiseCity): string[] {
  const adminConfig: Record<FranchiseCity, string[]> = {
    bournemouth: [
      'admin@qwikker.com',
      'admin@walletpush.io',
      'freespiritfamilies@gmail.com' // TEMPORARY: For testing
    ],
    calgary: [
      'terence@calgary.qwikker.com',
      'admin@calgary.qwikker.com'
    ],
    london: [
      'admin@london.qwikker.com'
    ],
    paris: [
      'admin@paris.qwikker.com'
    ]
  }
  
  return adminConfig[city] || adminConfig.bournemouth
}

/**
 * Check if user is admin for a specific city
 */
export function isUserAdminForCity(userEmail: string, city: FranchiseCity): boolean {
  const adminEmails = getAdminEmailsForCity(city)
  return adminEmails.includes(userEmail)
}

/**
 * Get franchise branding for city
 */
export function getCityBranding(city: FranchiseCity) {
  const branding: Record<FranchiseCity, { name: string; tagline: string }> = {
    bournemouth: {
      name: 'Qwikker Bournemouth',
      tagline: 'Discover the best of Bournemouth'
    },
    calgary: {
      name: 'Qwikker Calgary', 
      tagline: 'Discover the best of Calgary'
    },
    london: {
      name: 'Qwikker London',
      tagline: 'Discover the best of London'
    },
    paris: {
      name: 'Qwikker Paris',
      tagline: 'Découvrez le meilleur de Paris'
    }
  }
  
  return branding[city]
}
