/**
 * City detection utilities for franchise support
 * Detects city from URL subdomain for multi-city deployment
 */

import { isValidFranchiseCity } from './franchise-areas'

export type FranchiseCity = string // Now dynamic instead of hard-coded

/**
 * Extract city from hostname/subdomain
 * Examples:
 * - bournemouth.qwikker.com -> 'bournemouth'
 * - calgary.qwikker.com -> 'calgary' 
 * - localhost:3000 -> 'bournemouth' (default for development)
 * - qwikker.com -> 'bournemouth' (default for main domain)
 */
export async function getCityFromHostname(hostname: string): Promise<FranchiseCity> {
  // Handle localhost and development
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'bournemouth' // Default for local development
  }
  
  // Handle Vercel deployments
  if (hostname.includes('vercel.app')) {
    return 'bournemouth' // Default for Vercel deployments
  }
  
  // Extract subdomain
  const parts = hostname.split('.')
  if (parts.length >= 2) {
    const subdomain = parts[0].toLowerCase()
    
    // Validate against database instead of hard-coded switch
    const isValid = await isValidFranchiseCity(subdomain)
    if (isValid) {
      return subdomain
    }
    
    // Check if it's the main domain (www, app, etc.)
    if (['www', 'app', 'api'].includes(subdomain)) {
      return 'bournemouth' // Default for main domain
    }
    
    // SECURITY: Block unknown subdomains instead of defaulting
    console.error(`🚨 SECURITY: Unknown subdomain blocked: ${subdomain}`)
    throw new Error(`Access denied: Unknown franchise subdomain '${subdomain}'`)
  }
  
  // Fallback to bournemouth for main domain
  return 'bournemouth'
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
