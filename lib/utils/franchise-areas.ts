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

// Central franchise area mapping
export const FRANCHISE_AREAS: Record<string, string[]> = {
  // Bournemouth franchise covers South Coast UK
  bournemouth: ['bournemouth', 'christchurch', 'poole', 'wimborne', 'ferndown', 'ringwood', 'new_milton'],
  
  // Calgary franchise covers Alberta region (example)
  calgary: ['calgary', 'edmonton', 'red_deer', 'lethbridge'],
  
  // London franchise covers Greater London (example)
  london: ['london', 'westminster', 'camden', 'islington', 'hackney'],
  
  // Paris franchise covers Île-de-France (example)
  paris: ['paris', 'versailles', 'boulogne', 'neuilly'],
  
  // Add more franchises as they expand
}

// Franchise display names
export const FRANCHISE_DISPLAY_NAMES: Record<string, string> = {
  bournemouth: 'Bournemouth & South Coast',
  calgary: 'Calgary & Alberta',
  london: 'Greater London',
  paris: 'Paris & Île-de-France',
}

/**
 * Get franchise areas for a given franchise key
 */
export function getFranchiseAreas(franchiseKey: string): string[] {
  const areas = FRANCHISE_AREAS[franchiseKey.toLowerCase()]
  if (!areas) {
    console.warn(`⚠️ Unknown franchise: ${franchiseKey}, defaulting to Bournemouth`)
    return FRANCHISE_AREAS.bournemouth
  }
  return areas
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
  
  // Handle Vercel URLs (e.g., qwikkerdashboard-theta.vercel.app)
  if (hostname.includes('vercel.app')) {
    // Try to extract franchise from Vercel URL pattern
    const parts = hostname.split('-')
    for (const part of parts) {
      if (FRANCHISE_AREAS[part.toLowerCase()]) {
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
    if (FRANCHISE_AREAS[subdomain]) {
      console.log(`🌍 Franchise detected from subdomain: ${subdomain}`)
      return subdomain
    }
  }
  
  // Default to Bournemouth for main domain or unknown subdomains
  console.log(`🌍 Using default franchise: bournemouth for hostname: ${hostname}`)
  return 'bournemouth'
}

/**
 * Get franchise areas directly from hostname
 */
export function getFranchiseAreasFromHostname(hostname: string): string[] {
  const franchiseKey = getFranchiseFromHostname(hostname)
  return getFranchiseAreas(franchiseKey)
}

/**
 * Get franchise info from Next.js request headers
 */
export function getFranchiseFromRequest(): string {
  const headersList = headers()
  const host = headersList.get('host') || 'localhost'
  return getFranchiseFromHostname(host)
}

/**
 * Get franchise areas from Next.js request headers
 */
export function getFranchiseAreasFromRequest(): string[] {
  const franchiseKey = getFranchiseFromRequest()
  return getFranchiseAreas(franchiseKey)
}

/**
 * Get display name for franchise
 */
export function getFranchiseDisplayName(franchiseKey: string): string {
  return FRANCHISE_DISPLAY_NAMES[franchiseKey.toLowerCase()] || franchiseKey
}

/**
 * Check if a business_town belongs to a franchise
 */
export function isBusinessInFranchise(businessTown: string, franchiseKey: string): boolean {
  const franchiseAreas = getFranchiseAreas(franchiseKey)
  return franchiseAreas.includes(businessTown.toLowerCase())
}

/**
 * Get all available franchise keys
 */
export function getAllFranchiseKeys(): string[] {
  return Object.keys(FRANCHISE_AREAS)
}

/**
 * Debug function to log franchise detection
 */
export function debugFranchiseDetection(hostname: string) {
  const franchise = getFranchiseFromHostname(hostname)
  const areas = getFranchiseAreas(franchise)
  const displayName = getFranchiseDisplayName(franchise)
  
  console.log(`🔍 Franchise Debug:`, {
    hostname,
    detectedFranchise: franchise,
    displayName,
    coveredAreas: areas,
    totalAreas: areas.length
  })
  
  return { franchise, areas, displayName }
}
