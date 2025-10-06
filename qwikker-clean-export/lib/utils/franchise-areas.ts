/**
 * Unified Franchise Area Mapping System
 * 
 * This utility provides consistent domain → franchise area mapping
 * across the entire Qwikker application.
 * 
 * Usage:
 * - getFranchiseAreas('bournemouth') → ['bournemouth', 'christchurch', 'poole']
 * - getFranchiseFromHostname('bournemouth.qwikker.com') → 'bournemouth'
 * - getFranchiseAreasFromHostname('calgary.qwikker.com') → ['calgary', 'edmonton']
 */

import { headers } from 'next/headers'

// 🎯 SIMPLIFIED: Domain-based franchise system
// Each domain gets ONE city - no complex area mapping needed
export const FRANCHISE_CITIES = [
  'bournemouth', // bournemouth.qwikker.com
  'calgary',     // calgary.qwikker.com  
  'london',      // london.qwikker.com
  'paris',       // paris.qwikker.com
  // Add more franchise cities as they expand
] as const

export type FranchiseCity = typeof FRANCHISE_CITIES[number]

// Franchise display names
export const FRANCHISE_DISPLAY_NAMES: Record<string, string> = {
  bournemouth: 'Bournemouth & South Coast',
  calgary: 'Calgary & Alberta',
  london: 'Greater London',
  paris: 'Paris & Île-de-France',
}

/**
 * 🎯 SIMPLIFIED: Get franchise city (just returns the city itself)
 * Domain-based system: bournemouth.qwikker.com → 'bournemouth'
 */
export function getFranchiseCity(franchiseKey: string): string {
  const city = franchiseKey.toLowerCase()
  if (!FRANCHISE_CITIES.includes(city as FranchiseCity)) {
    console.warn(`⚠️ Unknown franchise: ${franchiseKey}, defaulting to Bournemouth`)
    return 'bournemouth'
  }
  return city
}

/**
 * @deprecated Use getFranchiseCity instead - we now use single city per domain
 */
export function getFranchiseAreas(franchiseKey: string): string[] {
  console.warn('⚠️ getFranchiseAreas is deprecated - use getFranchiseCity instead')
  return [getFranchiseCity(franchiseKey)]
}

/**
 * Extract franchise key from hostname
 * Examples:
 * - bournemouth.qwikker.com → 'bournemouth'
 * - calgary.qwikker.com → 'calgary'
 * - localhost:3000 → 'bournemouth' (default)
 * - qwikker.com → 'bournemouth' (main domain default)
 */
export function getFranchiseFromHostname(hostname: string): string {
  // Handle localhost and development
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('192.168')) {
    return 'bournemouth' // Default for local development
  }
  
  // Handle Vercel URLs (e.g., qwikkerdashboard-theta.vercel.app, qwikker-calgary-git-main.vercel.app)
  if (hostname.includes('vercel.app')) {
    // Try to extract franchise from Vercel URL pattern
    const parts = hostname.split('-')
    for (const part of parts) {
      if (FRANCHISE_CITIES.includes(part.toLowerCase() as FranchiseCity)) {
        console.log(`🌐 Vercel deployment detected - using ${part} franchise`)
        return part.toLowerCase()
      }
    }
    console.log('🌐 Vercel deployment detected - defaulting to Bournemouth')
    return 'bournemouth'
  }
  
  // Extract subdomain (e.g., 'bournemouth' from 'bournemouth.qwikker.com')
  const parts = hostname.split('.')
  
  if (parts.length >= 2) {
    const subdomain = parts[0].toLowerCase()
    
    // Check if it's a known franchise
    if (FRANCHISE_CITIES.includes(subdomain as FranchiseCity)) {
      console.log(`🌍 Franchise detected from subdomain: ${subdomain}`)
      return subdomain
    }
  }
  
  // Default to Bournemouth for main domain or unknown subdomains
  console.log(`🌍 Using default franchise: bournemouth for hostname: ${hostname}`)
  return 'bournemouth'
}

/**
 * 🎯 SIMPLIFIED: Get franchise city directly from hostname
 */
export function getFranchiseCityFromHostname(hostname: string): string {
  return getFranchiseFromHostname(hostname)
}

/**
 * Get franchise city from Next.js request headers
 */
export function getFranchiseCityFromRequest(): string {
  const headersList = headers()
  const host = headersList.get('host') || 'localhost'
  return getFranchiseFromHostname(host)
}

/**
 * @deprecated Use getFranchiseCityFromHostname instead
 */
export function getFranchiseAreasFromHostname(hostname: string): string[] {
  console.warn('⚠️ getFranchiseAreasFromHostname is deprecated - use getFranchiseCityFromHostname instead')
  return [getFranchiseFromHostname(hostname)]
}

/**
 * @deprecated Use getFranchiseCityFromRequest instead
 */
export function getFranchiseAreasFromRequest(): string[] {
  console.warn('⚠️ getFranchiseAreasFromRequest is deprecated - use getFranchiseCityFromRequest instead')
  return [getFranchiseCityFromRequest()]
}

/**
 * Get display name for franchise
 */
export function getFranchiseDisplayName(franchiseKey: string): string {
  return FRANCHISE_DISPLAY_NAMES[franchiseKey.toLowerCase()] || franchiseKey
}

/**
 * 🎯 SIMPLIFIED: Check if business belongs to franchise (now just city comparison)
 */
export function isBusinessInFranchise(businessTown: string, franchiseKey: string): boolean {
  const franchiseCity = getFranchiseCity(franchiseKey)
  return businessTown.toLowerCase() === franchiseCity.toLowerCase()
}

/**
 * Get all available franchise cities
 */
export function getAllFranchiseCities(): string[] {
  return [...FRANCHISE_CITIES]
}

/**
 * @deprecated Use getAllFranchiseCities instead
 */
export function getAllFranchiseKeys(): string[] {
  console.warn('⚠️ getAllFranchiseKeys is deprecated - use getAllFranchiseCities instead')
  return getAllFranchiseCities()
}

/**
 * 🎯 SIMPLIFIED: Debug function for franchise detection
 */
export function debugFranchiseDetection(hostname: string) {
  const franchise = getFranchiseFromHostname(hostname)
  const displayName = getFranchiseDisplayName(franchise)
  
  console.log(`🔍 Franchise Debug:`, {
    hostname,
    detectedFranchise: franchise,
    displayName,
    systemType: 'Domain-based (one city per franchise)'
  })
  
  return { franchise, displayName }
}
