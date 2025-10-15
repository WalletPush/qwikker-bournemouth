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

// 🎯 DYNAMIC: Domain-based franchise system - cities loaded from database
// Each domain gets ONE city - no complex area mapping needed

import { createServiceRoleClient } from '@/lib/supabase/server'

// Cache for franchise cities to avoid repeated DB calls
let _franchiseCitiesCache: string[] | null = null
let _cacheExpiry: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get all active franchise cities from database
 */
export async function getFranchiseCities(): Promise<string[]> {
  const now = Date.now()
  
  // Return cached result if still valid
  if (_franchiseCitiesCache && now < _cacheExpiry) {
    return _franchiseCitiesCache
  }
  
  try {
    const supabase = createServiceRoleClient()
    const { data: configs } = await supabase
      .from('franchise_crm_configs')
      .select('city')
      .eq('status', 'active')
      .order('city')
    
    const cities = configs?.map(c => c.city) || ['bournemouth'] // Fallback
    
    // Update cache
    _franchiseCitiesCache = cities
    _cacheExpiry = now + CACHE_DURATION
    
    return cities
  } catch (error) {
    console.warn('Failed to load franchise cities from DB, using fallback:', error)
    return ['bournemouth', 'calgary', 'london', 'paris'] // Static fallback
  }
}

/**
 * Check if a city is a valid franchise
 */
export async function isValidFranchiseCity(city: string): Promise<boolean> {
  const cities = await getFranchiseCities()
  return cities.includes(city.toLowerCase())
}

// Legacy type for backward compatibility
export type FranchiseCity = string

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
export async function getFranchiseCity(franchiseKey: string): Promise<string> {
  const city = franchiseKey.toLowerCase()
  const isValid = await isValidFranchiseCity(city)
  
  if (!isValid) {
    console.warn(`⚠️ Unknown franchise: ${franchiseKey}, defaulting to Bournemouth`)
    return 'bournemouth'
  }
  return city
}

/**
 * @deprecated Use getFranchiseCity instead - we now use single city per domain
 */
export async function getFranchiseAreas(franchiseKey: string): Promise<string[]> {
  console.warn('⚠️ getFranchiseAreas is deprecated - use getFranchiseCity instead')
  const city = await getFranchiseCity(franchiseKey)
  return [city]
}

/**
 * Extract franchise key from hostname
 * Examples:
 * - bournemouth.qwikker.com → 'bournemouth'
 * - calgary.qwikker.com → 'calgary'
 * - localhost:3000 → 'bournemouth' (default)
 * - qwikker.com → 'bournemouth' (main domain default)
 */
export async function getFranchiseFromHostname(hostname: string): Promise<string> {
  // Handle localhost and development
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('192.168')) {
    return 'bournemouth' // Default for local development
  }
  
  // Handle Vercel URLs (e.g., qwikkerdashboard-theta.vercel.app, qwikker-calgary-git-main.vercel.app)
  if (hostname.includes('vercel.app')) {
    console.log('🌐 Vercel deployment detected - defaulting to Bournemouth')
    return 'bournemouth'
  }
  
  // Extract subdomain (e.g., 'bournemouth' from 'bournemouth.qwikker.com')
  const parts = hostname.split('.')
  
  if (parts.length >= 2) {
    const subdomain = parts[0].toLowerCase()
    
    // Check if it's a known franchise
    if (await isValidFranchiseCity(subdomain)) {
      console.log(`🌍 Franchise detected from subdomain: ${subdomain}`)
      return subdomain
    }
  }
  
  // SECURITY: Block unknown subdomains instead of defaulting
  console.error(`🚨 SECURITY: Unknown hostname blocked: ${hostname}`)
  throw new Error(`Access denied: Unknown franchise hostname '${hostname}'`)
}

/**
 * 🎯 SIMPLIFIED: Get franchise city directly from hostname
 */
export async function getFranchiseCityFromHostname(hostname: string): Promise<string> {
  return await getFranchiseFromHostname(hostname)
}

/**
 * Get franchise city from Next.js request headers
 */
export async function getFranchiseCityFromRequest(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost'
  return await getFranchiseFromHostname(host)
}

/**
 * @deprecated Use getFranchiseCityFromHostname instead
 */
export function getFranchiseAreasFromHostname(hostname: string): string[] {
  console.warn('⚠️ getFranchiseAreasFromHostname is deprecated - use getFranchiseCityFromHostname instead')
  // This function is deprecated and should not be used
  return ['bournemouth'] // Fallback
}

/**
 * @deprecated Use getFranchiseCityFromRequest instead
 */
export function getFranchiseAreasFromRequest(): string[] {
  console.warn('⚠️ getFranchiseAreasFromRequest is deprecated - use getFranchiseCityFromRequest instead')
  // Can't await in sync function, so use hostname directly
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  return [getFranchiseFromHostname(host)]
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
export async function isBusinessInFranchise(businessTown: string, franchiseKey: string): Promise<boolean> {
  const franchiseCity = await getFranchiseCity(franchiseKey)
  return businessTown.toLowerCase() === franchiseCity.toLowerCase()
}

/**
 * Get all available franchise cities
 */
export async function getAllFranchiseCities(): Promise<string[]> {
  return await getFranchiseCities()
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
